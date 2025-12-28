// This setup file runs before jest-expo's setup to provide required polyfills
// These polyfills are needed for the WinterCG runtime compatibility layer in Expo SDK 54+

// Polyfill structuredClone if not available
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Polyfill __ExpoImportMetaRegistry
if (typeof globalThis.__ExpoImportMetaRegistry === 'undefined') {
  globalThis.__ExpoImportMetaRegistry = {};
}
