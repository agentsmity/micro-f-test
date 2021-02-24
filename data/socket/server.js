const fs = require('fs'),
      config = require('./configs/config'),
      queueManager = require('./libs/queue-manager'),
      Rpc = require('./libs/rpc'),
      Helper = require('./libs/helper'),
      rpcQueueManager = new queueManager('rpcExchange'),
      interactionQueueManager = new queueManager('interactionExchange'),
      io = require('socket.io').listen(config.port),
      helper = new Helper();

let onlineUsers = {},
    sockets = {},
    socketsStats = {'onConnect': 0, 'onDisconnect': 0};

rpcQueueManager.connect(config.queueManager, function() {
  io.set('transports', ['websocket', 'polling']);

  io.sockets.on('error', function (reason) {
    console.error(helper.prepareMessageWithDateTime('Unable to connect Socket.IO'), reason);
  });

  let rpcParams = {routeMethods: config.rpc.routeMethods},
      rpc = new Rpc(rpcQueueManager, config.rpc.userQueue, config.rpc.timeout, rpcParams),
      node = require("os").hostname() + ':' + process.pid;

  let rpcCallBindable = function(method, params, cb) {
      params = params || {};
      params.node = node;
      this.call(method, params, cb);
  };

  let _rpc_call = rpcCallBindable.bind(rpc);

  (function() {
    let queueName = 'interaction_' + (+ new Date()) + Math.random();
    let options = {
      'durable': false,
      'exclusive': true,
      'autoDelete': true,
      'createQueue': true,
      'routingKey': '*'
    };

    interactionQueueManager.connect(config.queueManager, () => {
      interactionQueueManager.subscribe(queueName, (content, fields, headers) => {
        try {
          if (Buffer.isBuffer(content)) {
            content = content.toString();
            content = JSON.parse(content);
          }
        } catch (e) {
          return;
        }

        if (typeof content !== 'object' || content === null) {
          return;
        }

        let key = null;

        if (fields.routingKey === '*') {
          key = fields.routingKey;
        } else {
          key = JSON.parse(fields.routingKey);
        }

        let msgType = 'msg';

        if (key === '*') {
          for(let routingKey in sockets) {
            for(let socket in sockets[routingKey]) {
              sockets[routingKey][socket].emit(msgType, content);
            }
          }
        } else if (Array.isArray(key)) {
          for(let routingKey in key) {
            if (sockets.hasOwnProperty(key[routingKey])) {
              for(let socket in sockets[key[routingKey]]) {
                sockets[key[routingKey]][socket].emit(msgType, content);
              }
            }
          }
        } else if (sockets.hasOwnProperty(key)) {
          for(let socket in sockets[key]) {
            sockets[key][socket].emit(msgType, content);
          }
        }
      }, options);
    });
  }());

  io.sockets.on('connection', function (socket) {
    socketsStats.onConnect++;

    socket.on('disconnect', function() {
      socketsStats.onDisconnect++;
    });

    let headers = socket.handshake.headers || {},
        trackHeaders = {
          'x-real-ip': headers['x-real-ip'],
          'x-forwarded-for': headers['x-forwarded-for'],
          'user-agent': headers['user-agent'],
          'referer': headers['referer']
        },
        params = {
          key: socket.handshake.query.key,
          sid: socket.id,
          node: node,
          headers: trackHeaders
        },
        interactionRpc = rpc;

      interactionRpc.call('auth', params, (userId, error) => {
        if (error) {
          console.error(
            helper.prepareMessageWithDateTime('ERROR: rpc::auth'),
            params.key,
            socket.id,
            error
          );

          socket.disconnect();

          return;
        }

        if (!userId) {
          console.error(
            helper.prepareMessageWithDateTime('ERROR: rpc::auth invalid userId'),
            userId,
            params.key,
            socket.id
          );

          socket.disconnect();

          return;
        }

        let rpc_call = (method, params, cb) => {
          params = params || {};

          params.fromUserId = userId;
          params.sid = socket.id;
          params.headers = trackHeaders;

          rpcCallBindable.call(interactionRpc, method, params, cb);
        };

        let p2p_call = (toUser, payload) => {
          let options = {
            'persistent': false,
            'createQueue': false,
          };

          payload.p2p = true;

          interactionQueueManager.sendMessage(toUser.toString(), payload, options);
        };

        if (socket.disconnected) {
          rpc_call('disconnect');
          return;
        }

        socket.on('disconnect', () => {
          delete sockets[userId][socket.id];
          rpc_call('disconnect');
        });

        socket.on('p2p', request => {
          if (typeof request !== 'object') {
            console.warn(helper.prepareMessageWithDateTime('p2p call with incorrect request'), request);
            return;
          }

          let toUser = parseInt(request.toUser || 0),
              payload = request.payload || null;

          if (toUser === 0 || typeof payload !== 'object' && payload !== null) {
            console.warn(helper.prepareMessageWithDateTime('p2p call with incorrect request'), request);
            return;
          }

          p2p_call(toUser, payload);
        });

        socket.on('rpc', function(request) {
          if (typeof request !== 'object') {
            console.warn(helper.prepareMessageWithDateTime('rpc call with incorrect request'), request);
            return;
          }

          var response = {
            id: request.id,
            result: null,
            error: null
          };

          request.params = request.params || {};

          if (typeof request.params !== 'object') {
            response.error = 'Invalid params passed.';
          }

          if (response.error) {
            if (!response.id) return;

            socket.emit('rpc', response);
            return;
          }

          if (!request.id) {
            rpc_call(request.method, request.params);
            return;
          }

          rpc_call(request.method, request.params, function(result, error) {
            socket.emit('rpc', {
              id: request.id,
              result: result,
              error: error
            });
          });
        });

        socket.emit('auth', {text: userId});

        if (!sockets.hasOwnProperty(userId)) {
          sockets[userId] = {};
        }

        sockets[userId][socket.id] = socket;
      });
  });
}, function() {
  helper.exit(1);
});

getStats = function(cb) {
  cb({
    rssMemory: Math.round(process.memoryUsage().rss/1024/1024*100)/100 + ' Mb',
    socketsConnected: socketsStats.onConnect,
    socketsDisconnected: socketsStats.onDisconnect,
    sockets: socketsStats.onConnect - socketsStats.onDisconnect,
    pid: process.pid,
    uptime: process.uptime()
  });
}

setInterval(() => {getStats((stats) => {console.log(stats);});}, 10000);
