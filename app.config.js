const withForegroundService = require("./android-manifest.plugin");

module.exports = withForegroundService(({ config }) => {
  return {
    ...config,
    // Vous pouvez ajouter d'autres configurations ici si nécessaire
  };
}); 