import TrackPlayer, { 
  Event, 
  RepeatMode, 
  Capability,
  AppKilledPlaybackBehavior,
  Track
} from 'react-native-track-player';
import { Platform } from 'react-native';

// Variable pour suivre l'état d'initialisation
let isPlayerInitialized = false;

/**
 * Service de gestion de la lecture audio en arrière-plan
 * Ce service est enregistré comme un service natif dans index.js
 * et continuera de fonctionner même quand l'application est en arrière-plan
 */
export async function PlaybackService() {
  console.log('[🎵 PlaybackService] Initialisation du service audio natif');
  
  // Ces handlers sont exécutés par le processus natif, pas en JavaScript
  // Ils continuent de fonctionner même quand le JS est suspendu
  
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('[🎵 PlaybackService] Commande lecture');
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('[🎵 PlaybackService] Commande pause');
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('[🎵 PlaybackService] Commande arrêt');
    TrackPlayer.stop();
  });

  // Redémarrer la lecture si elle atteint la fin (important pour les alarmes)
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    console.log('[🎵 PlaybackService] Fin de queue - boucle automatique');
    // Pour les alarmes, on veut que la lecture continue en boucle
    TrackPlayer.seekTo(0);
    TrackPlayer.play();
  });

  // Tenter de récupérer des erreurs
  TrackPlayer.addEventListener(Event.PlaybackError, (error) => {
    console.error('[🎵 PlaybackService] Erreur lecture:', error);
    // Tenter de reprendre la lecture après un délai
    setTimeout(() => TrackPlayer.play(), 3000);
  });
  
  // Crucial : gérer les interruptions audio du système (appels, etc.)
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    console.log('[🎵 PlaybackService] Interruption audio:', event);
    
    if (event.permanent) {
      // L'utilisateur a lancé une autre app audio qui a pris la priorité
      await TrackPlayer.pause();
    } else if (event.paused) {
      // Interruption temporaire (appel, Siri, autre notification)
      await TrackPlayer.pause();
    } else {
      // La source d'interruption a disparu, reprendre la lecture
      // (pour un réveil, on veut toujours reprendre)
      await TrackPlayer.play();
    }
  });
}

/**
 * Type de média à jouer
 */
export enum MediaType {
  RADIO = 'radio',
  SPOTIFY = 'spotify'
}

/**
 * Initialise le lecteur audio
 * Configuration optimisée pour le mode réveil en arrière-plan
 */
export async function setupTrackPlayer() {
  try {
    if (isPlayerInitialized) {
      console.log('[🎵 setupTrackPlayer] TrackPlayer déjà initialisé');
      return true;
    }

    console.log('[🎵 setupTrackPlayer] Configuration du lecteur audio');
    
    // Configuration spécifique pour l'audio en arrière-plan et les réveils
    const options = {
      // Options pour les flux streaming
      minBuffer: 90,     // Buffer important pour les flux radio
      maxBuffer: 180,    // Streaming stable même avec réseau faible
      backBuffer: 30,    // Permet de revenir en arrière
      waitForBuffer: true, // Évite les coupures en cas de buffer insuffisant
    };
    
    // Initialiser le player avec les options optimisées
    await TrackPlayer.setupPlayer(options);
    console.log('[🎵 setupTrackPlayer] Lecteur initialisé');

    // Configuration CRITIQUE pour la lecture en arrière-plan
    await TrackPlayer.updateOptions({
      // Option cruciale pour iOS : ne pas arrêter quand l'app passe en arrière-plan
      stoppingAppPausesPlayback: false,
      
      // Capacités affichées dans le centre de contrôle et notifications
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop
      ],
      
      // Version compacte des contrôles
      compactCapabilities: [
        Capability.Play,
        Capability.Pause
      ],
      
      // Configuration spécifique Android
      android: {
        // Crucial : continuer la lecture même si l'app est tuée
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        
        // Notification persistante
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop
        ],
        
        // Apparence de la notification
        notificationColor: 0x1E1E2E
      }
    });
    
    console.log('[🎵 setupTrackPlayer] Options configurées');
    isPlayerInitialized = true;
    return true;
    
  } catch (error) {
    console.error('[🎵 setupTrackPlayer] Erreur:', error);
    
    // Si l'erreur est due au fait que le player est déjà initialisé
    if (error instanceof Error && error.message.includes('player has already been initialized')) {
      console.log('[🎵 setupTrackPlayer] Player déjà initialisé par autre processus');
      isPlayerInitialized = true;
      return true;
    }
    
    return false;
  }
}

/**
 * Démarre la lecture d'un média (radio ou autre)
 * Avec priorité maximale pour le mode réveil
 */
export async function startPlayback(
  mediaType: MediaType,
  url: string,
  title: string,
  artist: string = '',
  artwork: string = 'https://aurorawake.app/default_artwork.png'
) {
  try {
    console.log(`[🎵 startPlayback] Démarrage de ${mediaType}`);
    console.log(`[🎵 startPlayback] Source: ${url.substring(0, 40)}...`);
    
    // S'assurer que le lecteur est initialisé
    if (!isPlayerInitialized) {
      const initSuccess = await setupTrackPlayer();
      if (!initSuccess) {
        console.error('[🎵 startPlayback] Échec initialisation du lecteur');
        return false;
      }
    }

    // Nettoyer toute lecture en cours
    await TrackPlayer.reset();
    
    // Préparation de la piste audio selon le type
    if (mediaType === MediaType.RADIO) {
      // Configuration pour flux radio en streaming
      const track: Track = {
        id: 'alarm-radio',
        url: url,
        title: title,
        artist: artist || 'Aurora Wake Radio',
        artwork: artwork,
        isLiveStream: true,  // Important pour les flux continus
        
        // Options iOS pour flux continus
        ...(Platform.OS === 'ios' ? {
          duration: 0,       // Indique un flux sans fin
        } : {})
      };
      
      // Ajouter à la queue
      await TrackPlayer.add(track);
    } 
    else if (mediaType === MediaType.SPOTIFY) {
      // Configuration pour Spotify
      const track: Track = {
        id: 'alarm-spotify',
        url: url,
        title: title,
        artist: artist || 'Aurora Wake Spotify',
        artwork: artwork
      };
      
      // Ajouter à la queue
      await TrackPlayer.add(track);
    }

    // Configurer la lecture en boucle (important pour le réveil)
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    
    // Démarrer la lecture avec priorité maximale
    console.log('[🎵 startPlayback] Démarrage de la lecture audio');
    await TrackPlayer.play();
    
    console.log('[🎵 startPlayback] Lecture démarrée avec succès');
    return true;
  } 
  catch (error) {
    console.error('[🎵 startPlayback] Erreur:', error);
    
    // Tentative de récupération en cas d'erreur
    try {
      console.log('[🎵 startPlayback] Tentative de récupération');
      await TrackPlayer.reset();
      
      // Attendre un délai et réessayer avec configuration minimale
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Tentative simplifiée
      await TrackPlayer.add({
        url: url,
        title: title || 'Réveil',
        isLiveStream: mediaType === MediaType.RADIO
      });
      
      await TrackPlayer.play();
      console.log('[🎵 startPlayback] Récupération réussie');
      return true;
    } 
    catch (recoveryError) {
      console.error('[🎵 startPlayback] Échec récupération:', recoveryError);
      return false;
    }
  }
}

/**
 * Arrête la lecture en cours
 */
export async function stopPlayback() {
  try {
    console.log('[🎵 stopPlayback] Arrêt de la lecture');
    await TrackPlayer.stop();
    await TrackPlayer.reset();
    console.log('[🎵 stopPlayback] Lecture arrêtée');
    return true;
  } 
  catch (error) {
    console.error('[🎵 stopPlayback] Erreur:', error);
    return false;
  }
} 