const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix Vercel Web Build crashing due to Zustand `import.meta` inside ESM.
// Metro by default prefers ESM (`module`) over `main`. 
// We force it to resolve standard CommonJS (`main`) for web to avoid syntax errors.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
