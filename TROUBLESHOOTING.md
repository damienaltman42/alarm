# Guide de dépannage pour rhythmee

Ce document répertorie les problèmes courants rencontrés lors du développement et leurs solutions.

## Problèmes de compilation Babel

### Erreur de mode 'loose' incohérent

**Erreur :**
```
'loose' mode configuration must be the same for @babel/plugin-transform-class-properties, @babel/plugin-transform-private-methods and @babel/plugin-transform-private-property-in-object (when they are enabled).
```

**Solution :**
Simplifie la configuration Babel en utilisant seulement les presets d'Expo. Modifie `babel.config.js` pour qu'il ressemble à :

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Pas de plugins personnalisés pour éviter les conflits
  };
};
```

## Problèmes de Metro Bundler

### Metro recrawling excessif

**Erreur :**
```
Recrawled this watch X times, most recently because: MustScanSubDirs UserDropped
```

**Solution :**
Réinitialiser Watchman et nettoyer le cache :
```bash
watchman watch-del-all
rm -rf node_modules/.cache
```

### Port déjà utilisé

**Erreur :**
```
Port 8081 is running this app in another window
```

**Solution :**
Tuer les processus Metro en cours :
```bash
kill -9 $(lsof -t -i:8081)
# ou
killall -9 node
```

## Problèmes généraux de build

### Nettoyer complètement le projet

Si vous rencontrez des problèmes persistants, essayez cette séquence de nettoyage complet :

```bash
# Supprime les node_modules et le cache npm
npm run clean

# Supprime le dossier .expo
rm -rf .expo

# Réinitialise Watchman
watchman watch-del-all

# Réinstalle les dépendances
npm install

# Démarre avec un cache propre
npx expo start --clear
```

## Configuration optimale

### metro.config.js
Pour optimiser le bundler Metro, créez un fichier `metro.config.js` :

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ajouter les extensions de fichiers à traiter
config.resolver.sourceExts = [
  'js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'
];

// Optimiser la performance
config.maxWorkers = 4;
config.cacheStores = [];

module.exports = config;
```

### .npmrc
Configurez npm pour éviter les problèmes de dépendances :

```
legacy-peer-deps=true
engine-strict=false
fund=false
``` 