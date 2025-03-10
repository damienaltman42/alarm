module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Laissons Expo gérer les plugins
  };
}; 