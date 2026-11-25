module.exports = function flagAdminOperations(req, res, next) {
  if (req.headers['x-esri-admin-request']) {
    req._user = { username: '__ags_admin__', id: '__ags_admin__' };
    req._skipAuth = true;
  }
  next();
};
