import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './src/services/audio/TrackPlayerService';
import App from './App';

// ====== IMPORTANT: CONFIGURATION DE LA LECTURE AUDIO EN ARRIÈRE-PLAN ======
console.log('[🎵 index.js] Enregistrement du service de lecture audio en arrière-plan');

// Enregistrer le service de lecture audio en arrière-plan AVANT l'application
// L'enregistrement doit se faire avec une fonction qui retourne la fonction PlaybackService
TrackPlayer.registerPlaybackService(() => PlaybackService);

console.log('[✅ index.js] Service de lecture audio enregistré avec succès');

// Enregistrer le composant racine de l'application
registerRootComponent(App);
