// https://docs.expo.dev/guides/customizing-metro
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// API routes : `import ... from 'bun'` (driver Bun.sql de @lisnard/db) pointe vers l'objet
// global Bun à l'exécution, faute de module résolvable par Metro.
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'bun')
    return { type: 'sourceFile', filePath: path.join(__dirname, 'shims/bun.js') };
  return (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

// withUniwindConfig doit rester l'enveloppe la plus externe (doc Uniwind).
module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
