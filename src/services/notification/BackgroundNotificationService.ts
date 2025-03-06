import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, AppState, NativeModules,  } from 'react-native';
import { Audio, InterruptionModeIOS } from 'expo-av';
import BackgroundTimer from 'react-native-background-timer';


// Type pour les notifications
// État actuel de l'alarme
let currentAlarmId: string | null = null;
let alarmAudioStarted = false;
global.silentAudioPlayer = null;
let keepAliveTimer: number | null = null;


// État global indiquant qu'une alarme est en cours d'exécution
let isAlarmPlaying = false;

// Fonction utilitaire pour les logs
function logEvent(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const appStateStr = AppState.currentState;
  
  if (data) {
    console.log(`[🔍 DEBUG ${timestamp}][${appStateStr}] ${message}`, data);
  } else {
    console.log(`[🔍 DEBUG ${timestamp}][${appStateStr}] ${message}`);
  }
}

/**
 * Initialise le service de notifications
 * Cette fonction configure le système de notification et initialise le mode audio en arrière-plan
 */
export function initNotificationService() {
  logEvent('⭐️ DÉMARRAGE initNotificationService');
  
  // Configurations spécifiques pour les modes d'arrière-plan
  if (Platform.OS === 'ios') {
    logEvent('Configuration iOS spécifique');
    
    initSilentAudioMode();
    increaseiOSAppVisibility();
  }
  
  logEvent('Configuration des notifications');
  
  // Ajouter un écouteur d'état de l'application pour mieux gérer les transitions
  AppState.addEventListener('change', (nextAppState) => {
    logEvent(`⚡️ Changement d'état de l'application: ${nextAppState}`);
    
    if (nextAppState != 'active') {
      logEvent('⚠️ App passée en arrière-plan');
      
      // Activation du mode audio silencieux si nécessaire
      if (Platform.OS === 'ios' && !alarmAudioStarted) {
        if (AppState.currentState != 'background') {
          activateSilentAudioMode();
        }
      }
    }
  });
}

/**
 * Initialise le mode audio silencieux pour iOS
 * Ce trick permet de maintenir l'application active en arrière-plan
 */
async function initSilentAudioMode() {
  if (Platform.OS !== 'ios') return;
  
  logEvent('⚙️ Initialisation du mode audio silencieux');
  
  try {
    // Configurer l'audio pour l'arrière-plan
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      shouldDuckAndroid: false,
    });
    
    logEvent('✅ Mode audio silencieux initialisé avec succès');
  } catch (error) {
    logEvent('❌ ERREUR lors de l\'initialisation du mode audio silencieux', error);
  }
}

/**
 * Active la lecture d'un son silencieux pour maintenir l'app active
 */
async function activateSilentAudioMode() {
  if (Platform.OS !== 'ios') return;
  
  logEvent('🔈 Activation du mode audio silencieux');
  
  try {
    // Arrêter la lecture précédente si elle existe
    await stopSilentAudioMode();
    
    // Configuration de l'audio pour l'arrière-plan
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      shouldDuckAndroid: false,
    });
    
    // MÉTHODE 1: Utiliser l'API about:blank
    logEvent('Tentative avec méthode 1: URI about:blank');
    try {
      // Créer un silence via l'API Web Audio
      const { sound } = await Audio.Sound.createAsync(
        // Utiliser une URL valide pour iOS
        { uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
        { 
          shouldPlay: true,
          isLooping: true,
          volume: 0.0001,  // Volume minimum pour éviter la consommation de batterie
        }
      );
      
      // Configurer l'événement d'erreur pour le debug
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.isPlaying) {
            // logEvent('✓ Audio en lecture active');
            if (AppState.currentState === 'active') {
              stopSilentAudioMode();
            }
          } else {
            logEvent('⚠️ Audio chargé mais pas en lecture');
          }
        } else if (status.error) {
          logEvent(`❌ Erreur de lecture: ${status.error}`);
        }
      });
      
      global.silentAudioPlayer = sound;
      logEvent('✅ Méthode 1 réussie: Audio silencieux démarré avec URL distante');
    }
    catch (method1Error) {
      // MÉTHODE 2: Utiliser le fichier MP3 silencieux
      logEvent('❌ Échec méthode 1', method1Error);
      logEvent('Tentative avec méthode 2: Fichier MP3 silencieux');
      
      try {
        const sound = new Audio.Sound();
        logEvent('Chargement du fichier MP3 silencieux depuis les assets');
        await sound.loadAsync(require('../../../assets/sounds/silent.mp3'));
        logEvent('Fichier MP3 silencieux chargé avec succès');
        
        await sound.setIsLoopingAsync(true);
        logEvent('Mode boucle activé');
        
        await sound.setVolumeAsync(0.0001);  // Volume minimum pour éviter la consommation de batterie
        logEvent('Volume défini au minimum pour économiser la batterie');
        
        logEvent('Démarrage de la lecture audio...');
        await sound.playAsync();
        logEvent('Lecture audio démarrée avec succès');
        
        global.silentAudioPlayer = sound;
        logEvent('✅ Méthode 2 réussie: Audio silencieux démarré avec fichier MP3');
      }
      catch (method2Error) {
        // MÉTHODE 3: Dernière tentative avec l'API native
        logEvent('❌ Échec méthode 2', method2Error);
        logEvent('Tentative avec méthode 3: API AVAudioSession native');
        
        try {
          // @ts-ignore - Accès direct à l'API native pour iOS
          if (NativeModules.ExpoAV && NativeModules.ExpoAV.setAudioSessionActive) {
            // Force l'activation de la session audio
            await NativeModules.ExpoAV.setAudioSessionActive(true);
            logEvent('✅ Méthode 3 réussie: Session audio activée via API native');
          } else {
            logEvent('⚠️ API native non disponible');
            throw new Error('API Native non disponible');
          }
        }
        catch (nativeError) {
          logEvent('❌ ÉCHEC TOTAL: Toutes les méthodes ont échoué', nativeError);
          throw nativeError;
        }
      }
    }
    
    // Vérifier l'état après un court délai
    setTimeout(() => {
      if (global.silentAudioPlayer || AppState.currentState === 'active') {
        logEvent('✓ Vérification après délai: Audio silencieux toujours actif');
      } else {
        // Tentative de réactivation automatique
        activateSilentAudioMode().catch(e => {
          logEvent('❌ Échec de la réactivation automatique', e);
        });
      }
    }, 3000);
  } 
  catch (error) {
    logEvent('❌ ERREUR GLOBALE lors de l\'activation de l\'audio silencieux', error);
  }
}

/**
 * Arrête la lecture du son silencieux
 */
export async function stopSilentAudioMode() {
  logEvent('🔇 Tentative d\'arrêt de l\'audio silencieux');
  console.log('======================================= global.silentAudioPlayer =======================================', global.silentAudioPlayer === null);
  if (global.silentAudioPlayer) {
    try {
      await global.silentAudioPlayer.stopAsync();
      await global.silentAudioPlayer.unloadAsync();
      global.silentAudioPlayer = null;
      logEvent('✅ Lecture audio silencieuse arrêtée avec succès');
    } catch (error) {
      logEvent('❌ ERREUR lors de l\'arrêt de l\'audio silencieux', error);
    }
  } else {
    logEvent('Aucun lecteur audio silencieux actif');
  }
}

/**
 * Améliore la visibilité de l'application dans le système iOS
 */
function increaseiOSAppVisibility() {
  if (Platform.OS !== 'ios') return;
  
  logEvent('🔍 Activation de la visibilité accrue pour iOS');
  
  // Maintenir l'app visible dans le multitâche
  const intervalId = setInterval(() => {
    if (AppState.currentState === 'background') {
      const now = new Date().toISOString();
      logEvent(`[${now}] Manipulation badges pour maintenir visibilité`);
      
      PushNotificationIOS.setApplicationIconBadgeNumber(1);
      setTimeout(() => PushNotificationIOS.setApplicationIconBadgeNumber(0), 500);
    }
  }, 180000); // Toutes les 3 minutes
  
  logEvent('✅ Système de visibilité iOS démarré');
}