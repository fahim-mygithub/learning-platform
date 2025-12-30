/**
 * Metro configuration for React Native / Expo
 *
 * Fixes OpenAI SDK compatibility with Metro bundler for web.
 * The OpenAI SDK uses .mjs files and internal vendor paths that
 * Metro doesn't resolve properly by default.
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .mjs to source extensions for OpenAI SDK compatibility
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Enable package exports resolution (needed for OpenAI SDK)
config.resolver.unstable_enablePackageExports = true;

// Custom resolver to handle OpenAI SDK vendor paths
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle OpenAI SDK vendor imports that use relative .mjs paths
  if (moduleName.includes('_vendor') && moduleName.endsWith('.mjs')) {
    // Convert the relative vendor path to an absolute path
    const absolutePath = path.resolve(
      path.dirname(context.originModulePath),
      moduleName
    );
    return {
      filePath: absolutePath,
      type: 'sourceFile',
    };
  }

  // Use the original resolver for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  // Fall back to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
