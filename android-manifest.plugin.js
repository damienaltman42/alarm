const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

const withForegroundService = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    if (!manifest.manifest.$["xmlns:tools"]) {
      manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Ajouter le service de premier plan pour la lecture audio en arrière-plan
    mainApplication["service"] = mainApplication["service"] || [];
    mainApplication["service"].push({
      $: {
        "android:name": "com.rhythmee.ios.services.MediaPlaybackService",
        "android:foregroundServiceType": "mediaPlayback",
        "tools:replace": "android:foregroundServiceType",
      },
    });

    return config;
  });
};

module.exports = withForegroundService; 