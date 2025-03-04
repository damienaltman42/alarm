import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  
  // Gérer les événements de lecture
  TrackPlayer.addEventListener(Event.PlaybackError, (error) => {
    console.error('Erreur de lecture:', error);
    // Tenter de reprendre la lecture en cas d'erreur
    TrackPlayer.play().catch(e => console.error('Impossible de reprendre la lecture:', e));
  });
  
  // Gérer la fin de la piste (pour les flux qui peuvent se terminer)
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    console.log('File de lecture terminée, redémarrage...');
    // Redémarrer la lecture
    TrackPlayer.play().catch(e => console.error('Impossible de redémarrer la lecture:', e));
  });
}; 