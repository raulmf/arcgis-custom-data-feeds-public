const flagAdminOperations = require('./flag-admin-operations');
const { getMockReq, getMockRes } = require('@jest-mock/express');

describe('flag-admin-operations', () => {
  test('should flag as admin operation', () => {
    const req = getMockReq({ headers: { 'x-esri-admin-request': 'value' } });
    const { res } = getMockRes();
    const nextMock = { next: () => {} };
    flagAdminOperations(req, res, nextMock.next);
    expect(req._skipAuth).toEqual(true);
    expect(req._user).toEqual({ username: '__ags_admin__', id: '__ags_admin__' });
  });

  test('should not flag as admin operation', () => {
    const req = getMockReq({ headers: {} });
    const { res } = getMockRes();
    const nextMock = { next: () => {} };
    flagAdminOperations(req, res, nextMock.next);
    expect(req._skipAuth).toEqual(undefined);
    expect(req._user).toEqual(undefined);
  });
});
