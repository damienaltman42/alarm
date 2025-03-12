const withForegroundService = require("./android-manifest.plugin");

module.exports = withForegroundService(({ config }) => {
  return {
    ...config,
    // Désactiver le mode bridgeless et la nouvelle architecture
    experiments: {
      ...config.experiments,
      tsconfigPaths: true,
      typedRoutes: true, 
      newArch: false,
      bridgeless: false,
    },
    // Vous pouvez ajouter d'autres configurations ici si nécessaire
  };
}); 