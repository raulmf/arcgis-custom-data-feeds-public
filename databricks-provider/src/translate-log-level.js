module.exports = function translateLogLevel(logLevel) {
  switch (logLevel) {
    case 'IMPSTAT':
    case 'STAT':
    case 'OFF':
    case 'AUDIT':
    case 'SEVERE':
      return 'error';
    case 'WARNING':
      return 'warn';
    case 'INFO':
      return 'info';
    case 'FINE':
    case 'VERBOSE':
      return 'verbose';
    case 'DEBUG':
      return 'debug';
    default:
      return logLevel;
  }
};
