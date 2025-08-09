const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Configure module resolution for WalletConnect/Reown conflicts
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// 4. Create a comprehensive resolver function
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle @reown/appkit and @reown/appkit-* submodule imports
  if (moduleName.startsWith('@reown/appkit')) {
    // Check if we have a specific shim for this module
    const shimMap = {
      '@reown/appkit/core': path.resolve(projectRoot, 'shims/@reown/appkit/core.js'),
      '@reown/appkit/networks': path.resolve(projectRoot, 'shims/@reown/appkit/networks.js'),
      '@reown/appkit/utils': path.resolve(projectRoot, 'shims/@reown/appkit/utils.js'),
      '@reown/appkit-wallet/utils': path.resolve(projectRoot, 'shims/@reown/appkit-wallet/utils.js'),
    };
    
    if (shimMap[moduleName]) {
      return { type: 'sourceFile', filePath: shimMap[moduleName] };
    }
    
    // For any other @reown/appkit-* modules, map to main package
    if (moduleName.startsWith('@reown/appkit-') || moduleName.startsWith('@reown/appkit/')) {
      const mainPackage = '@reown/appkit';
      return context.resolveRequest(context, mainPackage, platform);
    }
  }
  
  // Use default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// 5. Additional alias mapping as fallback
config.resolver.alias = {
  '@reown/appkit/core': path.resolve(projectRoot, 'shims/@reown/appkit/core.js'),
  '@reown/appkit/networks': path.resolve(projectRoot, 'shims/@reown/appkit/networks.js'),
  '@reown/appkit/utils': path.resolve(projectRoot, 'shims/@reown/appkit/utils.js'),
  '@reown/appkit-wallet/utils': path.resolve(projectRoot, 'shims/@reown/appkit-wallet/utils.js'),
  '@reown/appkit/adapters': path.resolve(projectRoot, 'node_modules/@reown/appkit'),
  '@reown/appkit/siwe': path.resolve(projectRoot, 'node_modules/@reown/appkit'),
  // Crypto polyfills
  'crypto': 'expo-crypto',
  'stream': 'stream-browserify',
  'buffer': '@craftzdog/react-native-buffer',
};

// 6. Enable web platform and native platforms
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// 7. Disable strict mode for better compatibility
config.resolver.unstable_enableSymlinks = false;

module.exports = config;