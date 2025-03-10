// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ajouter les extensions de fichiers à traiter (facultatif)
config.resolver.sourceExts = [
  'js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'
];

// Augmenter la mémoire du processus Metro
config.maxWorkers = 4;

// Optimiser le cache
config.cacheStores = [];

module.exports = config; 