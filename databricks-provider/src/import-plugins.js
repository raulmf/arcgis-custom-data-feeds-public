const importProviders = require('./import-providers');

function importPlugins({ providerPaths, logger }) {
  const outputs = [];
  const auths = [];
  const caches = [];
  const providers = importProviders(providerPaths, logger);

  return [...outputs, ...auths, ...caches, ...providers];
}

module.exports = importPlugins;
