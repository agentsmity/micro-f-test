let QueueManager = function(type) {
      let self = this;
      self._type = type;
      self._queues = {};
      self._conn = null;
      self._exchange = null;
      self._exchangeName = null;
      self._onError = null;
      self._consumerCallback = null;
      self._channel = null;
    },
    amqp = require('amqplib');

QueueManager.prototype = {
  connect: function(params, callback, onError) {
    let self = this;
    self._onError = onError;

    let setIfDefined = function(obj, prop, value) {
          if (value != undefined) obj[prop] = value;
        },
        _onConnect = function(channel) {
          self._channel = channel;
          let exchangeOptions = {
              durable: true,
              createQueue: true,
              autoDelete: false
          },
          _onExchangAssertDone = function() {
              self._exchangeName = params[self._type].name;
              callback();
          },
          _onExchangAssertError = function() {
              console.error('exchange creation failed: ');
              self._onError();
          }

          let ok = channel.assertExchange(params[self._type].name, params[self._type].type, exchangeOptions);
          ok.then(_onExchangAssertDone, _onExchangAssertError);
        },
        options = {
          heartbeat: 0,
          protocol: 'amqp',
          host: 'localhost',
          port: 5672,
          login: '',
          password: '',
          vhost: '/'
        };

    setIfDefined(options, 'heartbeat', params.connection.heartbeat);
    setIfDefined(options, 'protocol', params.connection.protocol);
    setIfDefined(options, 'host', params.connection.host);
    setIfDefined(options, 'port', params.connection.port);
    setIfDefined(options, 'login', params.connection.login);
    setIfDefined(options, 'password', params.connection.password);
    setIfDefined(options, 'vhost', params.connection.vhost);

    self._connect(options, _onConnect);
  },
  _connect: function(options,callBack) {
    let self = this,
        amqp = require('amqplib'),
        url = options.protocol + '://'
              + options.login + ':'
              + options.password + '@'
              + options.host + ':'
              + options.port + '/'
              + options.vhost + '?'
              + 'heartbeat=' + options.heartbeat,
        _onConnect = function(connection) {
          self._conn = connection;
          connection.createChannel().then(_onChannelCreated, _onChannelCreateError);
        },
        _onConnectError = function() {
          console.log("connect to rabbitmq error!!!");
          console.log(arguments);
        },
        _onChannelCreated = function(channel) {
          callBack(channel);
        },
        _onChannelCreateError = function() {
          console.log("create channel error!!");
          console.log(arguments);
        };

    amqp.connect(url).then(_onConnect, _onConnectError);
  },

  subscribe: function(id, callback, params) {
    let self = this,
        options = params || {
          durable: true,
          exclusive: false,
          autoDelete: true,
          createQueue: true
        };

    if (params && params.expire) {
      options.expires = expire * 1000;
      options.autoDelete = false;
    }

    let _subscribeCallback = function(message) {
      let headers = {};

      if (typeof message.message.properties.contentType !== 'undefined') {
          if (message.message.properties.contentType == 'application/json') {
            //decode json sting
            message.message.content = JSON.parse(message.message.content.toString());
          }
      } else {
          message.message.content = message.message.content.toString();
      }

      if (typeof message.message.properties.headers !== 'undefined') {
          headers = message.message.properties.headers;
      }

      callback(message.message.content, message.message.fields, headers);
    }

    self._subscribe(self._channel, self._exchangeName, id, options, _subscribeCallback)
  },

  _subscribe: function(channel, exchangeName, queueName, options, consumerCallback) {
    let self = this,
        _onExchangeExists = function() {
          let _onQueueAssertDone = function(qok) {
            let queue = qok.queue,
                routingKey = (typeof options.routingKey !== 'undefined')?options.routingKey:queueName,
                bindPromise = channel.bindQueue(queue, exchangeName, routingKey),
                _onBindDone = function() {
                  let _consumeCallback = function(message) {
                        let consumerMessage = {channel: channel, message: message};
                        consumerCallback(consumerMessage);
                      },
                      _onConsumeDone = function(args) {
                        self._queues[queueName] = args.consumerTag;
                      },
                      consumePromise = channel.consume(queue, _consumeCallback, {noAck: true});

                  consumePromise.then(_onConsumeDone);
                },
                _onBindFail = function() {
                  console.log("bind queue fail");
                  console.log(arguments);
                }
            bindPromise.then(_onBindDone, _onBindFail);
          },
          _onQueueAssertFail = function() {
            console.log("queue assert fail!!");
            console.log(arguments);
          }
          let queuePrimise = channel.assertQueue(queueName, options);

          queuePrimise.then(_onQueueAssertDone, _onQueueAssertFail);
        },
        exchangePromise = channel.checkExchange(exchangeName);

    exchangePromise.then(_onExchangeExists);
  },

  unsubscribe: function(queueName) {
    let self = this,
        _onCancelDone = function() {
          delete self._queues[queueName];
        };

    if (self._queues[queueName]) {
        let cancelPromise = self._channel.cancel(self._queues[queueName]);
        cancelPromise.then(_onCancelDone, _onCancelDone);
    }
  },

  ackMessage: function(consumerMessage) {
    consumerMessage.channel.ack(consumerMessage.message);
  },

  _messageToBuffer: function(message) {
    if (typeof(message) == 'string') {
      return [null, Buffer.from(message, 'utf8')];
    } else if (message instanceof Buffer) {
      return [null, message];
    } else {
      let jsonBody = JSON.stringify(message),
         props = {
           contentType: 'application/json'
         };

      return [props, Buffer.from(jsonBody, 'utf8')];
    }
  },

  publish: function(channel, exchangeName, messageBody, routingKey, messageOptions) {
    let self = this;

    if (typeof messageOptions === 'undefined') {
      messageOptions = messageOptions || {};
    }

    let _onExchangeExists = function() {
          let r = self._messageToBuffer(messageBody),
          props = r[0], buffer = r[1];

          if (typeof props !== 'undefined') {
            messageOptions.contentType = props.contentType;
          }

          channel.publish(exchangeName, routingKey, buffer, messageOptions);
        },
        exchangePromise = channel.checkExchange(exchangeName);

    exchangePromise.then(_onExchangeExists);
  },

  sendMessage: function(routingKey, msg, options) {
    let self = this;
    self.publish(self._channel, self._exchangeName, msg, routingKey, options);
  }
}

module.exports = QueueManager;
