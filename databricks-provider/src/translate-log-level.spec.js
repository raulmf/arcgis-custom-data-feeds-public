const translateLogLevel = require('./translate-log-level');

describe('translate-log-level', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('translateLogLevel - error', () => {
    const errorLevels = ['IMPSTAT', 'STAT', 'OFF', 'AUDIT', 'SEVERE'];
    errorLevels.forEach((input) => {
      level = translateLogLevel(input);
      expect(level).toEqual('error');
    });
  });

  test('translateLogLevel - warn', () => {
    const errorLevels = ['WARNING'];
    errorLevels.forEach((input) => {
      level = translateLogLevel(input);
      expect(level).toEqual('warn');
    });
  });

  test('translateLogLevel - info', () => {
    const errorLevels = ['INFO'];
    errorLevels.forEach((input) => {
      level = translateLogLevel(input);
      expect(level).toEqual('info');
    });
  });

  test('translateLogLevel - verbose', () => {
    const errorLevels = ['FINE', 'VERBOSE'];
    errorLevels.forEach((input) => {
      level = translateLogLevel(input);
      expect(level).toEqual('verbose');
    });
  });

  test('translateLogLevel - debug', () => {
    const errorLevels = ['DEBUG'];
    errorLevels.forEach((input) => {
      level = translateLogLevel(input);
      expect(level).toEqual('debug');
    });
  });

  test('translateLogLevel - pass through', () => {
    const errorLevels = ['debug'];
    errorLevels.forEach((input) => {
      level = translateLogLevel(input);
      expect(level).toEqual('debug');
    });
  });
});
