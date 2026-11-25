const parseUserIdentity = require('./parse-user-identity');
const { getMockReq, getMockRes } = require('@jest-mock/express');

describe('parse-user-identity', () => {
  test('should find and parse user-identity', () => {
    const req = getMockReq({
      headers: { 'x-esri-request-user': JSON.stringify({ username: 'some-user', id: 'abcd123' }) },
    });
    const { res } = getMockRes();
    const nextMock = { next: () => {} };
    parseUserIdentity(req, res, nextMock.next);
    expect(req._user).toEqual({ username: 'some-user', id: 'abcd123' });
  });

  test('should not find and parse user-identity', () => {
    const req = getMockReq({
      headers: {},
    });
    const { res } = getMockRes();
    const nextMock = { next: () => {} };
    parseUserIdentity(req, res, nextMock.next);
    expect(req._user).toEqual(undefined);
  });
});
