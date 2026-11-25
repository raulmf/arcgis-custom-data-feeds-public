module.exports = function extractServiceParams(req, res, next) {
  if (req.headers['x-esri-cdf-service-params']) {
    const serviceParams = JSON.parse(req.headers['x-esri-cdf-service-params']);

    Object.entries(serviceParams).forEach(([key, value]) => {
      if (key === 'dataProviderHost' && value !== '' && value !== null) {
        req.params.host = value;
        return;
      }

      if (key === 'dataProviderId' && value !== '' && value !== null) {
        req.params.id = value;
        return;
      }

      if (key === 'dataProviderName') {
        return;
      }

      req.params[key] = value;
    });
  }

  next();
};
