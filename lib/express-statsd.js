var assert = require('assert'),
    extend = require('obj-extend'),
    StatsD = require('node-statsd');

module.exports = function expressStatsdInit (options) {
  options = extend({
    requestKey: 'statsdKey',
    host: '127.0.0.1',
    port: 8125
  }, options);

  assert(options.requestKey, 'express-statsd expects a requestKey');

  var client = options.client || new StatsD(options);

  return function expressStatsd (req, res, next) {
    var startTime = new Date().getTime();

    // Function called on response finish that sends stats to statsd
    function sendStats() {
      var key = req[options.requestKey];
      key = key ? key + '.' : '';

      // Status Code
      var statusCode = res.statusCode || 'unknown_status';
      client.increment(key + 'status_code.' + statusCode);

      // Response Time
      var duration = new Date().getTime() - startTime;
      client.timing(key + 'response_time', duration, ['un:ms']);

      cleanup();
    }

    // Function to clean up the listeners we've added
    function cleanup() {
      res.removeListener('finish', sendStats);
      res.removeListener('error', cleanup);
      res.removeListener('close', cleanup);
    }

    // Add response listeners
    res.once('finish', sendStats);
    res.once('error', cleanup);
    res.once('close', cleanup);

    if (next) {
      next();
    }
  };
};
