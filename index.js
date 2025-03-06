import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './src/services/audio/TrackPlayerService';
import App from './App';

// Enregistrer le service de lecture audio en arrière-plan
// L'enregistrement doit se faire avec une fonction, pas une référence à une fonction
TrackPlayer.registerPlaybackService(() => PlaybackService);

// Enregistrer le composant racine de l'application
registerRootComponent(App);
