module.exports = function parseUserIdentity(req, res, next) {
  const requestUser = req.headers['x-esri-request-user'];
  if (requestUser) {
    req._user = JSON.parse(requestUser);
  }
  next();
};
