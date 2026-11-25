const extractServiceParameters = require('./extract-service-parameters');
const { getMockReq, getMockRes } = require('@jest-mock/express');

describe('extract-service-parameters', () => {
  test('should extract service parameters from header', () => {
    const req = getMockReq({
      headers: {
        'x-esri-cdf-service-params': JSON.stringify({
          dataProviderName: 'the-provider',
          dataProviderHost: 'host-value',
          dataProviderId: 'id-value',
          foo: 'bar',
        }),
      },
    });
    const { res } = getMockRes();
    const nextMock = { next: () => {} };
    extractServiceParameters(req, res, nextMock.next);
    expect(req.params).toEqual({
      host: 'host-value',
      id: 'id-value',
      foo: 'bar',
    });
  });

  test('should not find service parameters header', () => {
    const req = getMockReq({
      headers: {},
    });
    const { res } = getMockRes();
    const nextMock = { next: () => {} };
    extractServiceParameters(req, res, nextMock.next);
    expect(req.params).toEqual({});
  });
});
