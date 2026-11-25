function importProviders(providers, logger) {
  validateProviders(providers, logger);
  return loadProviders(providers);
}

function loadProviders(providerPaths) {
  return providerPaths.map((providerPath) => {
    return {
      instance: require(providerPath),
    };
  });
}

function validateProviders(providerPaths, logger) {
  providerPaths.forEach((providerPath) => {
    const { dependencies = {} } = require(`${providerPath}/package.json`);
    if (dependencies['config']) {
      logger.warn(
        `Provider at ${providerPath} has a dependency on 'config' that is no longer supported.`,
      );
    }
  });
}
module.exports = importProviders;
