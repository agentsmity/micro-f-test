let Rpc = function(queueManager, requestQueue, timeout, options) {
  let self = this;
  self._requestQueue = requestQueue;
  self._responseQueue = requestQueue + '_' + (+ new Date) + Math.random();
  self._routeMethods = (options || {}).routeMethods || [];
  self._reqId = 0;
  self._storage = {};
  self._timeouts = {};
  self._timeout = timeout;
  self._queueManager = queueManager;
  self._exitTimeout = null;
  self._queueManager.subscribe(this._responseQueue, function(response) {
    self.onResponse(response);
  });
}

Rpc.prototype = {
    call: function(method, params, callback) {
      let self = this,
          id = null,
          routingKey;

      if (typeof callback == 'function') {
        let start = new Date(),
            timer;

        id = ++self._reqId;

        self._storage[id] = function(result, error) {
            callback(result, error);
        };

          self._timeouts[id] = setTimeout(function() {
              self.abort(id, 'timeout', self._timeout, new Date() - start, method);
          }, self._timeout);
      }

      let request = {
            'id': id,
            'method': method,
            'params': params
          },
          options = {
            'replyTo': self._responseQueue,
            'persistent': false
          };

      routingKey = self._requestQueue + (~self._routeMethods.indexOf(request.method) ? '.' + request.method : '');
      self._queueManager.sendMessage(routingKey, request, options);

      return id;
    },

    abort: function(id, reason, info, time, method) {
        reason = reason || null;
        if (reason == 'timeout') {
          console.error('rpc', 'ERROR: timeout', id, info, time, method);
          if (this._storage[id]) {
              this._storage[id](null, 'timeout');
          }
        }
        this._cleanup(id);
    },

    _cleanup: function(id) {
      delete this._storage[id];
      clearTimeout(this._timeouts[id]);
      delete this._timeouts[id];
    },

    onResponse: function(response) {
      clearTimeout(this._exitTimeout); // rpc works, so we don't exit
      delete this._exitTimeout;

      if (response && response.id === null) {
        return;
      }

      if (!response.id) {
        console.error('rpc', 'ERROR: Invalid response.', response);
        return;
      }
      let id = response.id;

      if (this._storage[id]) {
        this._storage[id](response.result, response.error);
        this._cleanup(id);
      } else {
        console.error('rpc', 'ERROR: No response listener.', id);
      }
    },

    _onRequest: function() {
      if (this._exitTimeout) return;

      this._exitTimeout = setTimeout(function() {
        console.error('\n\nERROR: RPC responses stopped coming.\n\n');
        helper.exit(1);
      }, this._timeout * 2);
    }
};

module.exports = Rpc;
