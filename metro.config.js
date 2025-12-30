/**
 * Metro configuration for React Native / Expo
 *
 * Fixes OpenAI SDK compatibility with Metro bundler for web.
 * The OpenAI SDK uses .mjs files and package exports that need
 * explicit configuration in Metro.
 */

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .mjs to source extensions for OpenAI SDK compatibility
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Enable package exports resolution (needed for OpenAI SDK)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
