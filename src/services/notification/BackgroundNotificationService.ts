import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, AppState, NativeModules, NativeEventEmitter } from 'react-native';
import { MediaType, setupTrackPlayer, startPlayback, stopPlayback } from '../audio/TrackPlayerService';
import { Audio, InterruptionModeIOS } from 'expo-av';
import BackgroundTimer from 'react-native-background-timer';

// Type pour la configuration des alarmes
export interface AlarmConfig {
  type: 'radio' | 'spotify';
  streamingUrl: string;
  title: string;
  artist?: string;
  artwork?: string;
}

// Type pour les notifications
interface PushNotificationData {
  data?: {
    alarmConfig?: AlarmConfig | string;
    alarmId?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Configuration du canal de notification
const NOTIFICATION_CHANNEL_ID = 'aurora-wake-alarm';
const NOTIFICATION_CHANNEL_NAME = 'Aurora Wake Alarm';

// État actuel de l'alarme
let currentAlarmId: string | null = null;
let alarmAudioStarted = false;
let silentAudioPlayer: Audio.Sound | null = null;
let keepAliveTimer: number | null = null;

// Ajout d'un état pour les alarmes programmées
let scheduledAlarms: {[id: string]: {time: Date, config: AlarmConfig}} = {};

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
    
    // Sur iOS, configurer pour que le son continue même quand l'écran est verrouillé
    PushNotificationIOS.requestPermissions({
      alert: true,
      badge: true,
      sound: true,
      critical: true // Demander les autorisations pour notifications critiques
    }).then((permissions: {alert: boolean, badge: boolean, sound: boolean}) => {
      logEvent('Permissions iOS accordées', permissions);
    }).catch((err: Error) => {
      logEvent('Erreur permissions iOS', err);
    });
    
    // Initialiser le mode audio arrière-plan via un silent player
    initSilentAudioMode();
    
    // Augmenter la visibilité de l'app dans le système
    increaseiOSAppVisibility();
    
    // Démarrer une vérification périodique des alarmes (indépendante du keepAliveTimer)
    const alarmCheckTimer = setInterval(() => {
      if (AppState.currentState === 'background' || AppState.currentState === 'active') {
        checkScheduledAlarms();
      }
    }, 30000); // Vérifier toutes les 30 secondes
    
    // Faire une première vérification des alarmes après 5 secondes
    setTimeout(() => {
      checkScheduledAlarms();
    }, 5000);
  }
  
  logEvent('Configuration des notifications');
  PushNotification.configure({
    // Gestionnaire appelé quand une notification est reçue ou ouverte
    onNotification: async function(notification: PushNotificationData) {
      logEvent('⚡️ NOTIFICATION REÇUE', {
        id: notification.id,
        data: notification.data,
        foreground: notification.foreground,
        userInteraction: notification.userInteraction
      });
      
      try {
        // Extraire les données
        const data = notification.data || {};
        logEvent('Données notification extraites', data);
        
        // Réveiller l'appareil avec son maximum (même en mode silencieux)
        if (Platform.OS === 'ios') {
          logEvent('Actions spécifiques iOS pour réveiller l\'appareil');
          
          // Sur iOS, la notification critique devrait déjà avoir réveillé l'appareil
          // mais nous augmentons la priorité du processus
          activateSilentAudioMode(); // Activer l'audio silencieux pour garder l'app active
          
          logEvent('Manipulation des badges iOS');
          PushNotificationIOS.setApplicationIconBadgeNumber(0);
          setTimeout(() => {
            PushNotificationIOS.setApplicationIconBadgeNumber(1);
            logEvent('Badge iOS défini à 1');
          }, 100);
          setTimeout(() => {
            PushNotificationIOS.setApplicationIconBadgeNumber(0);
            logEvent('Badge iOS défini à 0');
          }, 200);
          
          // Forcer le maintien de l'application en vie
          logEvent('Démarrage du timer de maintien en vie');
          startKeepAliveTimer();
        }
        
        // Traiter la configuration d'alarme si présente
        if (data.alarmConfig && !alarmAudioStarted) {
          logEvent('⏰ Configuration d\'alarme détectée, préparation démarrage');
          
          try {
            // Extraire la configuration
            const config: AlarmConfig = typeof data.alarmConfig === 'string' 
              ? JSON.parse(data.alarmConfig) 
              : data.alarmConfig;
            
            logEvent('Configuration d\'alarme parsée', config);
            
            // Stocker l'ID d'alarme
            if (data.alarmId) {
              currentAlarmId = data.alarmId as string;
              logEvent(`ID d'alarme stocké: ${currentAlarmId}`);
            }
            
            // Démarrer l'audio immédiatement
            logEvent('⚠️ ALERTE: Démarrage audio imminent');
            alarmAudioStarted = true;
            
            // Arrêter l'audio silencieux si actif
            logEvent('Arrêt de l\'audio silencieux');
            await stopSilentAudioMode();
            
            // Initialiser le lecteur et commencer la lecture
            logEvent('Initialisation du lecteur audio');
            const setupSuccess = await setupTrackPlayer();
            logEvent(`Initialisation lecteur - résultat: ${setupSuccess}`);
            
            // La partie cruciale: démarrer l'audio immédiatement
            logEvent('🔊 DÉMARRAGE AUDIO ALARME');
            const triggerResult = await handleAlarmTriggered(config);
            logEvent(`Résultat démarrage alarme: ${triggerResult}`);
            
            // Créer une notification persistante pour l'alarme en cours
            logEvent('Création notification persistante pour alarme en cours');
            PushNotification.localNotification({
              channelId: NOTIFICATION_CHANNEL_ID,
              id: 999999, // ID unique
              title: "Alarme en cours",
              message: `${config.title} - Touchez pour ouvrir`,
              ongoing: true,
              playSound: false,
              visibility: "public",
              importance: "high",
              priority: "max",
              ignoreInForeground: false,
              // Options iOS supplémentaires
              ...(Platform.OS === 'ios' ? {
                critical: true,
                criticalVolume: 0.1
              } : {})
            });
            
            logEvent('✅ Notification persistante créée avec succès');
          } catch (error) {
            logEvent('❌ ERREUR lors du traitement de l\'alarme', error);
            alarmAudioStarted = false;
            stopKeepAliveTimer();
          }
        } else {
          if (data.prewakeFor) {
            logEvent(`🔄 Notification de pré-réveil reçue pour l'alarme ${data.prewakeFor}`);
          } else if (alarmAudioStarted) {
            logEvent('⚠️ Notification ignorée - audio déjà démarré');
          } else if (!data.alarmConfig) {
            logEvent('ℹ️ Notification sans configuration d\'alarme');
          }
        }
        
      } catch (e) {
        logEvent('❌ ERREUR CRITIQUE dans onNotification', e);
      }
      
      // Nécessaire sur iOS
      logEvent('Finalisation notification');
      notification.finish(PushNotificationIOS.FetchResult.NewData);
    },
    
    // Permissions
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },
    
    // Montrer les notifications même en premier plan
    popInitialNotification: true,
    
    // Demander les permissions au démarrage
    requestPermissions: true
  });
  
  // Créer le canal de notification (Android)
  if (Platform.OS === 'android') {
    logEvent('Création du canal de notification Android');
    PushNotification.createChannel(
      {
        channelId: NOTIFICATION_CHANNEL_ID,
        channelName: NOTIFICATION_CHANNEL_NAME,
        soundName: "default",
        importance: 5, // Importance maximum
        vibrate: true,
      },
      (created: boolean) => logEvent(`Canal de notification ${created ? 'créé' : 'existant'}`)
    );
  }
  
  logEvent('✅ Service de notification initialisé avec succès');
  
  // Ajouter un listener pour suivre les changements d'état de l'application
  AppState.addEventListener('change', (nextAppState) => {
    logEvent(`⚡️ Changement d'état de l'application: ${nextAppState}`);
    
    if (nextAppState === 'active') {
      logEvent('App passée au premier plan');
    } else if (nextAppState === 'background') {
      logEvent('⚠️ App passée en arrière-plan');
      // Activation du mode audio silencieux si nécessaire
      if (Platform.OS === 'ios' && !alarmAudioStarted) {
        logEvent('Activation du mode audio silencieux en arrière-plan');
        activateSilentAudioMode();
      }
    } else if (nextAppState === 'inactive') {
      logEvent('App inactive');
    }
  });
}

/**
 * Planifie une alarme pour un moment précis
 * @param alarmTime Date et heure du déclenchement
 * @param config Configuration de l'alarme
 * @param alarmId Identifiant unique de l'alarme
 */
export function scheduleAlarm(alarmTime: Date, config: AlarmConfig, alarmId: string): boolean {
  // Vérification cruciale : s'assurer que la date est correcte
  const now = new Date();
  const originalTime = new Date(alarmTime);
  
  // Format de log pour les dates pour mieux les comparer
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
  };
  
  logEvent(`⏰ Date originale fournie: ${formatDate(originalTime)}`);
  
  // Si la date est pour demain ou plus tard, mais que l'utilisateur souhaite 
  // probablement l'alarme pour aujourd'hui, corrigeons cela
  if (alarmTime.getDate() !== now.getDate() && 
      alarmTime.getMonth() === now.getMonth() && 
      alarmTime.getFullYear() === now.getFullYear()) {
    
    logEvent(`⚠️ CORRECTION DE DATE : L'alarme était programmée pour demain (${formatDate(alarmTime)})`);
    
    // Correction : utiliser la date d'aujourd'hui avec l'heure spécifiée
    alarmTime.setDate(now.getDate());
    alarmTime.setMonth(now.getMonth());
    alarmTime.setFullYear(now.getFullYear());
    
    logEvent(`✅ Date corrigée : ${formatDate(alarmTime)}`);
    
    // Si après correction, la date est dans le passé (l'heure spécifiée est déjà passée aujourd'hui)
    if (alarmTime.getTime() < now.getTime()) {
      logEvent(`⚠️ L'alarme corrigée serait dans le passé, nous la laissons pour demain`);
      // Revenir à la date originale
      alarmTime = new Date(originalTime);
    }
  }
  
  logEvent(`⏰ PLANIFICATION alarme pour ${alarmTime.toLocaleString()}`, {
    id: alarmId, 
    config: config,
    timeUntilAlarm: (alarmTime.getTime() - Date.now()) / 1000 + ' secondes'
  });
  
  try {
    // Réinitialiser l'état
    alarmAudioStarted = false;
    logEvent('État alarmAudioStarted réinitialisé');
    
    // Stocker l'alarme dans notre système de suivi
    scheduledAlarms[alarmId] = {
      time: alarmTime,
      config: config
    };
    logEvent(`Alarme stockée dans le système de suivi, total: ${Object.keys(scheduledAlarms).length}`);
    
    // Configurer la notification avec priorité CRITIQUE
    const notificationConfig: any = {
      // Informations de base
      channelId: NOTIFICATION_CHANNEL_ID,
      id: alarmId,
      title: `Réveil: ${config.title}`,
      message: `Il est l'heure de se réveiller ! ${config.type === 'radio' ? 'Radio' : 'Playlist'} en cours...`,
      date: alarmTime,
      
      // Options critiques pour le réveil
      allowWhileIdle: true,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
      vibration: 2000,
      
      // Données pour le gestionnaire
      userInfo: {
        alarmConfig: JSON.stringify(config),
        alarmId: alarmId,
      },
      
      // Options d'affichage
      largeIcon: "ic_launcher",
      smallIcon: "ic_notification",
      category: 'alarm',
      ignoreInForeground: false,
      visibility: 'public',
      priority: "max",
      
      // Options iOS importantes
      ...(Platform.OS === 'ios' ? {
        critical: true,               // Notification critique (ignore le mode silencieux)
        criticalVolume: 0.1,          // Volume réduit pour les notifications
        sound: true,                  // Jouer un son
        inAppFocus: true,             // Afficher même si l'app est au premier plan
        attachments: [],              // Permet au système de traiter la notification correctement
      } : {})
    };
    
    logEvent('Configuration notification préparée', notificationConfig);
    
    // Programmer la notification
    PushNotification.localNotificationSchedule(notificationConfig);
    logEvent(`Notification programmée pour ${alarmTime.toLocaleString()}`);
    
    // Sur iOS, planifier aussi l'activation de l'audio silencieux juste avant
    // Ce trick permet d'augmenter les chances que l'app soit prête à recevoir la notification
    if (Platform.OS === 'ios') {
      const prewakeTime = new Date(alarmTime.getTime() - 30000); // 30 secondes avant
      logEvent(`Prévision pré-réveil à ${prewakeTime.toLocaleString()}`);
      scheduleSilentAudioPrewake(prewakeTime, alarmId);
    }
    
    logEvent(`✅ Alarme planifiée avec succès, ID: ${alarmId}`);
    return true;
  } catch (error) {
    logEvent('❌ ERREUR lors de la planification de l\'alarme', error);
    return false;
  }
}

/**
 * Planifie une activation silencieuse juste avant l'alarme
 */
function scheduleSilentAudioPrewake(prewakeTime: Date, alarmId: string) {
  logEvent(`Planification pré-réveil silencieux pour ${prewakeTime.toLocaleString()}`, {
    alarmId,
    timeUntilPrewake: (prewakeTime.getTime() - Date.now()) / 1000 + ' secondes'
  });
  
  try {
    // Configurer une notification silencieuse juste avant l'alarme
    PushNotification.localNotificationSchedule({
      id: `prewake-${alarmId}`,
      title: "",
      message: "",
      date: prewakeTime,
      allowWhileIdle: true,
      playSound: false,
      // Silencieux mais avec options critiques
      userInfo: {
        prewakeFor: alarmId,
      },
      priority: "max",
      visibility: 'secret',
      // Options iOS importantes
      ...(Platform.OS === 'ios' ? {
        critical: true,
        sound: false,
      } : {})
    });
    
    logEvent(`✅ Pré-réveil silencieux planifié`);
  } catch (error) {
    logEvent('❌ ERREUR lors de la planification du pré-réveil', error);
  }
}

/**
 * Annule une alarme programmée
 * @param alarmId Identifiant de l'alarme à annuler
 */
export function cancelAlarm(alarmId: string) {
  logEvent(`🛑 ANNULATION alarme ${alarmId}`);
  
  try {
    // Si c'est l'alarme en cours, arrêter l'audio
    if (currentAlarmId === alarmId) {
      logEvent('Arrêt de l\'alarme en cours');
      stopPlayback();
      currentAlarmId = null;
      alarmAudioStarted = false;
      stopKeepAliveTimer();
    }
    
    // Annuler les notifications
    logEvent('Annulation des notifications');
    PushNotification.cancelLocalNotification(alarmId);
    PushNotification.cancelLocalNotification(`prewake-${alarmId}`);
    
    // Supprimer l'alarme de notre système de suivi
    if (scheduledAlarms[alarmId]) {
      delete scheduledAlarms[alarmId];
      logEvent(`Alarme supprimée du système de suivi, reste: ${Object.keys(scheduledAlarms).length}`);
    }
    
    logEvent(`✅ Alarme ${alarmId} annulée avec succès`);
  } catch (error) {
    logEvent('❌ ERREUR lors de l\'annulation de l\'alarme', error);
  }
}

/**
 * Déclenche la lecture audio pour une alarme
 * Cette fonction est appelée lors de la réception d'une notification d'alarme
 */
export async function handleAlarmTriggered(config: AlarmConfig): Promise<boolean> {
  logEvent('🔊 DÉCLENCHEMENT AUDIO pour alarme', config);
  
  try {
    // Déterminer le type de média
    const mediaType = config.type === 'radio' ? MediaType.RADIO : MediaType.SPOTIFY;
    logEvent(`Type de média: ${mediaType}`);
    
    // ⚠️ IMPORTANT : Démarrer l'audio avec un volume progressif pour éviter de surprendre l'utilisateur
    // Cela crée une expérience de réveil plus agréable
    
    // Démarrer la lecture
    logEvent(`Démarrage de la lecture: ${config.title} (${config.streamingUrl.substring(0, 30)}...)`);
    const playbackSuccess = await startPlayback(
      mediaType,
      config.streamingUrl,
      config.title,
      config.artist || '',
      config.artwork || ''
    );
    
    if (playbackSuccess) {
      logEvent('✅ Lecture audio démarrée avec succès');
      
      // Sur iOS, demander plus de temps pour le processus
      if (Platform.OS === 'ios') {
        // Maintenir le processus actif en background
        logEvent('Démarrage du timer de maintien en vie pour iOS');
        startKeepAliveTimer();
      }
      
      return true;
    } else {
      logEvent('❌ Échec du démarrage de la lecture');
      return false;
    }
  } catch (error) {
    logEvent('❌ ERREUR CRITIQUE lors du déclenchement de l\'alarme', error);
    return false;
  }
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
            logEvent('✓ Audio en lecture active');
          } else {
            logEvent('⚠️ Audio chargé mais pas en lecture');
          }
        } else if (status.error) {
          logEvent(`❌ Erreur de lecture: ${status.error}`);
        }
      });
      
      silentAudioPlayer = sound;
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
        
        silentAudioPlayer = sound;
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
      if (silentAudioPlayer) {
        logEvent('✓ Vérification après délai: Audio silencieux toujours actif');
      } else {
        logEvent('⚠️ Vérification après délai: Audio silencieux arrêté');
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
async function stopSilentAudioMode() {
  logEvent('🔇 Tentative d\'arrêt de l\'audio silencieux');
  
  if (silentAudioPlayer) {
    try {
      await silentAudioPlayer.stopAsync();
      await silentAudioPlayer.unloadAsync();
      silentAudioPlayer = null;
      logEvent('✅ Lecture audio silencieuse arrêtée avec succès');
    } catch (error) {
      logEvent('❌ ERREUR lors de l\'arrêt de l\'audio silencieux', error);
    }
  } else {
    logEvent('Aucun lecteur audio silencieux actif');
  }
}

/**
 * Démarre un timer pour maintenir l'app active en arrière-plan
 */
function startKeepAliveTimer() {
  logEvent('⏱️ Démarrage du timer de maintien en vie');
  
  if (keepAliveTimer) {
    BackgroundTimer.clearInterval(keepAliveTimer);
    logEvent('Timer précédent effacé');
  }
  
  keepAliveTimer = BackgroundTimer.setInterval(() => {
    const now = new Date();
    const nowTime = now.getTime();
    
    // Vérifier s'il y a des alarmes programmées qui auraient dû se déclencher
    const alarmIds = Object.keys(scheduledAlarms);
    if (alarmIds.length > 0) {
      logEvent(`Vérification de ${alarmIds.length} alarmes programmées...`);
      
      for (const alarmId of alarmIds) {
        const alarm = scheduledAlarms[alarmId];
        const alarmTime = alarm.time.getTime();
        
        // Si l'alarme aurait dû se déclencher dans les 60 dernières secondes
        if (alarmTime <= nowTime && alarmTime > nowTime - 60000) {
          // Et que l'audio n'est pas déjà démarré
          if (!alarmAudioStarted && currentAlarmId !== alarmId) {
            logEvent(`⚠️ ALARME MANQUÉE DÉTECTÉE: ${alarmId} programmée à ${alarm.time.toLocaleString()}`);
            logEvent('Déclenchement forcé de l\'alarme');
            
            // Stocker l'ID d'alarme
            currentAlarmId = alarmId;
            
            // Démarrer l'audio immédiatement
            alarmAudioStarted = true;
            
            // Arrêter l'audio silencieux
            stopSilentAudioMode().then(() => {
              // Initialiser le lecteur et lancer l'alarme
              setupTrackPlayer().then(() => {
                handleAlarmTriggered(alarm.config).then(success => {
                  logEvent(`Résultat du déclenchement forcé: ${success ? 'réussi' : 'échoué'}`);
                });
              });
            });
            
            // Supprimer l'alarme du système de suivi
            delete scheduledAlarms[alarmId];
          }
        }
      }
    }
    
    if (currentAlarmId) {
      logEvent(`[${now.toISOString()}] Maintien de l'alarme active, ID: ${currentAlarmId}`);
      
      // Redémarrer l'audio silencieux si nécessaire
      if (Platform.OS === 'ios' && !alarmAudioStarted && silentAudioPlayer === null) {
        logEvent('Réactivation du mode audio silencieux');
        activateSilentAudioMode();
      }
    } else {
      logEvent('Aucune alarme active, arrêt du timer');
      stopKeepAliveTimer();
    }
  }, 5000); // Vérifier toutes les 5 secondes
  
  logEvent('✅ Timer de maintien en vie démarré avec succès');
}

/**
 * Arrête le timer de maintien en vie
 */
function stopKeepAliveTimer() {
  logEvent('⏱️ Arrêt du timer de maintien en vie');
  
  if (keepAliveTimer) {
    BackgroundTimer.clearInterval(keepAliveTimer);
    keepAliveTimer = null;
    logEvent('✅ Timer de maintien en vie arrêté');
  } else {
    logEvent('Aucun timer actif à arrêter');
  }
  
  // Arrêter l'audio silencieux
  stopSilentAudioMode();
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

// Ajouter une fonction pour démarrer immédiatement la vérification des alarmes
export function checkScheduledAlarms() {
  logEvent('Vérification manuelle des alarmes programmées');
  const now = new Date();
  const nowTime = now.getTime();
  
  // Vérifier s'il y a des alarmes programmées qui auraient dû se déclencher
  const alarmIds = Object.keys(scheduledAlarms);
  logEvent(`${alarmIds.length} alarmes trouvées`);
  
  for (const alarmId of alarmIds) {
    const alarm = scheduledAlarms[alarmId];
    
    // Vérification et correction des dates si nécessaire
    const originalTime = new Date(alarm.time);
    
    // Format de log pour les dates pour mieux les comparer
    const formatDate = (date: Date) => {
      return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
    };
    
    logEvent(`Alarme ${alarmId} programmée pour ${formatDate(alarm.time)} (date originale)`);
    
    // Si l'alarme est programmée pour demain mais avec les mêmes heures/minutes qu'aujourd'hui
    // c'est probablement une erreur de date
    if (alarm.time.getDate() !== now.getDate() && 
        alarm.time.getMonth() === now.getMonth() && 
        alarm.time.getFullYear() === now.getFullYear()) {
      
      logEvent(`⚠️ ALARME PROGRAMMÉE POUR DEMAIN: Correction en cours`);
      
      // Créer une copie de date corrigée pour aujourd'hui
      const correctedTime = new Date(alarm.time);
      correctedTime.setDate(now.getDate());
      correctedTime.setMonth(now.getMonth());
      correctedTime.setFullYear(now.getFullYear());
      
      // Si l'heure corrigée est dans le futur proche (dans les 5 minutes)
      const correctedTimeMs = correctedTime.getTime();
      const diffMinutes = (correctedTimeMs - nowTime) / 60000;
      
      if (diffMinutes >= 0 && diffMinutes <= 5) {
        logEvent(`⚠️ CORRECTION ACTIVE: L'alarme devrait être pour aujourd'hui dans ${diffMinutes.toFixed(1)} minutes`);
        // Mettre à jour l'alarme pour aujourd'hui
        alarm.time = correctedTime;
        scheduledAlarms[alarmId] = alarm;
      } else if (diffMinutes < 0 && diffMinutes > -10) {
        // L'alarme aurait dû se déclencher il y a moins de 10 minutes
        logEvent(`⚠️ ALARME MANQUÉE: L'alarme aurait dû se déclencher il y a ${Math.abs(diffMinutes).toFixed(1)} minutes`);
        // Forcer le déclenchement comme si c'était maintenant
        if (!alarmAudioStarted) {
          logEvent('🔥 DÉCLENCHEMENT FORCÉ IMMÉDIAT DE L\'ALARME MANQUÉE');
          forceAlarmTrigger(alarmId, alarm);
        }
      }
    }
    
    // Après la vérification/correction, calculer le temps restant
    const alarmTime = alarm.time.getTime();
    const timeUntilAlarm = (alarmTime - nowTime) / 1000;
    
    if (timeUntilAlarm <= 0) {
      logEvent(`⚠️ ALARME EN RETARD: ${alarmId}, ${Math.abs(timeUntilAlarm).toFixed(1)} secondes en retard`);
      
      if (!alarmAudioStarted) {
        logEvent('🔥 DÉCLENCHEMENT FORCÉ IMMÉDIAT');
        forceAlarmTrigger(alarmId, alarm);
      }
    } else if (timeUntilAlarm <= 60) { // L'alarme est prévue dans moins d'une minute
      logEvent(`⏰ ALARME IMMINENTE dans ${timeUntilAlarm.toFixed(1)} secondes`);
      
      // Se préparer en avance si l'alarme est imminente
      if (!alarmAudioStarted && Platform.OS === 'ios') {
        logEvent('Préparation anticipée pour alarme imminente');
        activateSilentAudioMode();
      }
    } else {
      logEvent(`Temps restant: ${timeUntilAlarm.toFixed(1)} secondes`);
    }
  }
}

// Fonction utilitaire pour déclencher une alarme de force
async function forceAlarmTrigger(alarmId: string, alarm: {time: Date, config: AlarmConfig}) {
  // Stocker l'ID d'alarme
  currentAlarmId = alarmId;
  
  // Démarrer l'audio immédiatement
  alarmAudioStarted = true;
  
  try {
    // Arrêter l'audio silencieux
    await stopSilentAudioMode();
    
    // Initialiser le lecteur
    await setupTrackPlayer();
    
    // Déclencher l'alarme
    const result = await handleAlarmTriggered(alarm.config);
    logEvent(`Résultat du déclenchement forcé: ${result ? 'réussi ✅' : 'échoué ❌'}`);
    
    // Si le déclenchement réussit, notifier l'utilisateur avec une notification persistante
    if (result) {
      PushNotification.localNotification({
        channelId: NOTIFICATION_CHANNEL_ID,
        id: 999999, // ID unique
        title: "Alarme en cours",
        message: `${alarm.config.title} - Touchez pour ouvrir`,
        ongoing: true,
        playSound: false,
        visibility: "public",
        importance: "high",
        priority: "max",
        ignoreInForeground: false,
        ...(Platform.OS === 'ios' ? {
          critical: true,
          criticalVolume: 1.0
        } : {})
      });
    }
  }
  catch (error) {
    logEvent('❌ ERREUR lors du déclenchement forcé', error);
    // Réinitialiser en cas d'échec
    alarmAudioStarted = false;
    currentAlarmId = null;
  }
  
  // Supprimer l'alarme du système de suivi
  delete scheduledAlarms[alarmId];
} 