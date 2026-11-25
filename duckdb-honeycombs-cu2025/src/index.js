const path = require('path');
const fs = require('fs-extra');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const klawSync = require('klaw-sync');
const https = require('https');
const selfsigned = require('selfsigned');
const config = require('config');
const Cdf = require('../framework/cdf-server');

const routes = require('./routes');
const importPlugins = require('./import-plugins');

const argv = yargs(hideBin(process.argv)).argv
const port = argv.port || config.port || 8081;
const useSelfSignedCert = argv['self-signed-cert'] && true || false;

// plugins need to be imported before Koop instantiation
const providerPaths = fetchProviderModulePaths('../providers');
const plugins = importPlugins({
  providerPaths
});

const cdf = new Cdf({ logLevel: 'info' });

plugins.forEach((plugin) => {
  cdf.register(plugin.instance, plugin.options);
});

// add additional routes
routes.forEach((route) => {
  route.methods.forEach((method) => {
    cdf.server[method](route.path, route.handler);
  });
});

startServer(cdf, port, useSelfSignedCert);

function fetchProviderModulePaths(relativePath) {
  // Path to providers directory
  const pathToProviders = path.join(__dirname, relativePath);

  if (fs.existsSync(pathToProviders)) {
    const providerDirectories = klawSync(pathToProviders, { nofile: true, depthLimit: 0 });
    return providerDirectories.map((item) => item.path);
  }

  return [];
}

function startServer (cdfServer, port, useSelfSignedCert) {
  if(useSelfSignedCert) {
    return startServerWithCert(cdfServer, port);
  }

  cdfServer.server.listen(port, () => cdfServer.log.info(`Server listening at ${port}`));
}

function startServerWithCert(cdfServer, port) {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const { private: key, cert} = selfsigned.generate(attrs, { days: 365 });
  const server = https.createServer(
    {
      key,
      cert
    },
    cdfServer.server
  );
  
  server.listen(port, () => {
    cdfServer.log.info(`Server listening at https://localhost:${port}`);
  });
}