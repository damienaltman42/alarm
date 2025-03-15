const withForegroundService = require("./android-manifest.plugin");

module.exports = withForegroundService(({ config }) => {
  return {
    ...config,
    // Définir explicitement les versions
    version: "1.0.1",
    ios: {
      ...config.ios,
      buildNumber: "1",
      infoPlist: {
        ...config.ios?.infoPlist,
        LSApplicationCategoryType: "public.app-category.music",
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
          NSExceptionDomains: {
            "101smoothjazz.com": {
              NSIncludesSubdomains: true,
              NSExceptionAllowsInsecureHTTPLoads: true
            },
            "cdn-profiles.tunein.com": {
              NSIncludesSubdomains: true,
              NSExceptionAllowsInsecureHTTPLoads: true
            },
            "radiofarda.com": {
              NSIncludesSubdomains: true,
              NSExceptionAllowsInsecureHTTPLoads: true
            },
            "rfi.fr": {
              NSIncludesSubdomains: true,
              NSExceptionAllowsInsecureHTTPLoads: true
            },
            "deephouselounge.com": {
              NSIncludesSubdomains: true,
              NSExceptionAllowsInsecureHTTPLoads: true
            }
          }
        }
      }
    },
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