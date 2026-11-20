const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const localNodeModules = path.resolve(projectRoot, 'node_modules');
const watchFolders = [projectRoot];
const nodeModulesPaths = [localNodeModules];

if (fs.existsSync(localNodeModules)) {
  const realNodeModules = fs.realpathSync(localNodeModules);
  if (realNodeModules !== localNodeModules) {
    watchFolders.push(realNodeModules);
    nodeModulesPaths.push(realNodeModules);
  }
}

const extraNodeModules = process.env.EXPO_EXTRA_NODE_MODULES
  ? path.resolve(process.env.EXPO_EXTRA_NODE_MODULES)
  : null;
if (extraNodeModules && fs.existsSync(extraNodeModules)) {
  if (!watchFolders.includes(extraNodeModules)) watchFolders.push(extraNodeModules);
  if (!nodeModulesPaths.includes(extraNodeModules)) nodeModulesPaths.push(extraNodeModules);
}

config.watchFolders = watchFolders;
config.resolver.nodeModulesPaths = nodeModulesPaths;

module.exports = config;
