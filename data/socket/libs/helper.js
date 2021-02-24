let Helper = function() {};

Helper.prototype = {
  prepareMessageWithDateTime: function(message) {
    message = message || '';

    let dateTimeStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
        formattedMessage = '[' + dateTimeStr + '] ' + message;

    return formattedMessage;
  },

  exit: function(code, cb) {
    code = code || 0;

    let promise = new Promise((resolve, reject) => {
      console.log(this.prepareMessageWithDateTime('********** Stopping... ************'));
      if (cb) {
        cb();
      }
      setTimeout(() => {resolve()}, 5000);
    }).then(response => {
      console.log(this.prepareMessageWithDateTime('********** done. ************'));
      process.exit(code);
    });
  }
};

module.exports = Helper;
