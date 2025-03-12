import { Platform, AppState, NativeModules } from 'react-native';
import { Audio, InterruptionModeIOS } from 'expo-av';
import BackgroundTimer from 'react-native-background-timer';
import { alarmStorage } from '../alarm/alarmStorage';
import { alarmManager } from '../alarm/alarmManager';
import i18n from '../../i18n';

// Définir le type du Sound pour satisfaire TypeScript
type ExpoSound = Audio.Sound;

// Ajouter au début du fichier, avant les imports
declare global {
  var silentAudioPlayer: ExpoSound | null;
  var lastTriggeredAlarms: Record<string, boolean>;
  var _stoppingSilentAudio: boolean;
}

// État actuel de l'alarme
let alarmAudioStarted = false;
global.silentAudioPlayer = null;
let keepAliveTimer: number | null = null;
let alarmCheckIntervalId: number | null = null;

// Initialiser le registre des alarmes déclenchées
global.lastTriggeredAlarms = {};

// Initialisation de la variable au début du fichier
let lastAppStateChangeTime = 0;

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
 * Vérifie si une alarme doit être déclenchée
 * Cette fonction est appelée périodiquement pour vérifier les alarmes
 */
async function checkAlarms() {
  try {
    logEvent(i18n.t('notification:service.checking'));
    
    // Ne pas vérifier si une alarme est déjà en cours
    if (alarmManager.isAlarmActive()) {
      logEvent('⚠️ Une alarme est déjà active, vérification ignorée');
      return;
    }
    
    // Récupérer toutes les alarmes
    const alarms = await alarmStorage.getAlarms();
    const now = new Date();
    
    // Vérification des alarmes en mode snooze
    const snoozeAlarms = alarms.filter(a => a.snoozeUntil);
    if (snoozeAlarms.length > 0) {
      logEvent(`🔍 ${snoozeAlarms.length} alarme(s) en mode snooze trouvée(s)`);
      
      // Journaliser les détails des alarmes de snooze
      snoozeAlarms.forEach(alarm => {
        const snoozeTime = new Date(alarm.snoozeUntil!);
        const diffMs = snoozeTime.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);
        
        logEvent(`🕒 Alarme ${alarm.id} en snooze jusqu'à ${snoozeTime.toLocaleTimeString()} (dans ~${diffMins} min)`);
      });
    }
    
    // Vérifier chaque alarme
    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      
      // Extraire l'heure et les minutes de l'alarme
      const [hours, minutes] = alarm.time.split(':').map(Number);
      
      // Vérifier si l'alarme doit sonner maintenant
      const shouldRing = checkAlarmShouldRing(alarm, now, hours, minutes);
      
      if (shouldRing) {
        logEvent(`🔔 L'alarme ${alarm.id} doit sonner maintenant!`);
        
        // Si c'est une alarme en mode snooze, réinitialiser son champ snoozeUntil
        if (alarm.snoozeUntil) {
          logEvent(`🔄 Réinitialisation du mode snooze pour l'alarme ${alarm.id}`);
          
          // Mettre à jour l'alarme pour réinitialiser le snoozeUntil
          const updatedAlarm = { ...alarm, snoozeUntil: null };
          await alarmStorage.updateAlarm(updatedAlarm);
        }
        
        // Déclencher l'alarme manuellement
        await triggerAlarm(alarm);
        
        break; // Ne déclencher qu'une seule alarme à la fois
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des alarmes:', error);
  }
}

/**
 * Vérifie si une alarme doit sonner à un moment donné
 */
function checkAlarmShouldRing(alarm: any, now: Date, hours: number, minutes: number): boolean {
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  
  
  // Si l'alarme est désactivée, ne pas la déclencher
  if (!alarm.enabled) {
    return false;
  }
  
  // Clé unique pour cette alarme à cette heure précise
  // Pour éviter de déclencher plusieurs fois la même alarme dans la même minute
  const alarmTimeKey = `${alarm.id}_${currentHours}_${currentMinutes}`;
  
  // Vérifier si cette alarme a déjà sonné durant cette minute
  const lastTriggeredAlarms = global.lastTriggeredAlarms || {};
  if (lastTriggeredAlarms[alarmTimeKey]) {
    return false;
  }
  
  // S'assurer que repeatDays est initialisé
  if (!alarm.repeatDays) {
    alarm.repeatDays = [];
  }
  
  // Vérification spéciale pour les alarmes en mode snooze
  if (alarm.snoozeUntil) {
    const snoozeTime = new Date(alarm.snoozeUntil);
    const snoozeHours = snoozeTime.getHours();
    const snoozeMinutes = snoozeTime.getMinutes();
    
    // Si l'heure actuelle correspond ou dépasse l'heure de snooze
    // On compare maintenant uniquement les heures et minutes
    if (currentHours > snoozeHours || 
        (currentHours === snoozeHours && currentMinutes >= snoozeMinutes)) {
      
      logEvent(`⏰ L'alarme ${alarm.id} se réveille après un snooze (jusqu'à ${snoozeHours}:${snoozeMinutes})`);
      
      // Marquer cette alarme comme déclenchée pour cette minute
      lastTriggeredAlarms[alarmTimeKey] = true;
      global.lastTriggeredAlarms = lastTriggeredAlarms;
      
      // Programmer l'effacement de ce marqueur après 1 minute
      setTimeout(() => {
        const updatedTriggeredAlarms = global.lastTriggeredAlarms || {};
        delete updatedTriggeredAlarms[alarmTimeKey];
        global.lastTriggeredAlarms = updatedTriggeredAlarms;
      }, 60000);
      
      return true;
    }
    
    // Si on est encore en période de snooze, ne pas déclencher l'alarme
    return false;
  }
  
  // Pour les alarmes normales sans jours de répétition
  if (alarm.repeatDays.length === 0) {
    // Vérifier si l'heure actuelle correspond à l'heure de l'alarme
    // On a supprimé la vérification des secondes
    const shouldRing = (
      currentHours === hours &&
      currentMinutes === minutes
    );
    
    if (shouldRing) {
      logEvent(`⏰ Déclenchement de l'alarme ${alarm.id} (sans répétition) à ${currentHours}:${currentMinutes}`);
      
      // Marquer cette alarme comme déclenchée pour cette minute
      lastTriggeredAlarms[alarmTimeKey] = true;
      global.lastTriggeredAlarms = lastTriggeredAlarms;
      
      // Programmer l'effacement de ce marqueur après 1 minute
      setTimeout(() => {
        const updatedTriggeredAlarms = global.lastTriggeredAlarms || {};
        delete updatedTriggeredAlarms[alarmTimeKey];
        global.lastTriggeredAlarms = updatedTriggeredAlarms;
      }, 60000);
    }
    
    return shouldRing;
  }
  
  // Si l'alarme est répétitive, vérifier si le jour actuel est un jour de répétition
  const today = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
  const repeatDay = today; // Convertir dimanche de 0 à 7 pour la compatibilité
  
  // Vérifier si aujourd'hui est un jour configuré pour l'alarme
  const isDayConfigured = alarm.repeatDays.includes(repeatDay);
  
  if (!isDayConfigured) {
    return false;
  }
  
  const shouldRing = (
    currentHours === hours &&
    currentMinutes === minutes
  );
  
  if (shouldRing) {
    logEvent(`⏰ Déclenchement de l'alarme ${alarm.id} (répétitive) à ${currentHours}:${currentMinutes}`);
    
    // Marquer cette alarme comme déclenchée pour cette minute
    lastTriggeredAlarms[alarmTimeKey] = true;
    global.lastTriggeredAlarms = lastTriggeredAlarms;
    
    // Programmer l'effacement de ce marqueur après 1 minute
    setTimeout(() => {
      const updatedTriggeredAlarms = global.lastTriggeredAlarms || {};
      delete updatedTriggeredAlarms[alarmTimeKey];
      global.lastTriggeredAlarms = updatedTriggeredAlarms;
    }, 60000);
  }
  
  return shouldRing;
}

/**
 * Déclenche une alarme manuellement
 */
async function triggerAlarm(alarm: any) {
  try {
    logEvent(i18n.t('notification:service.triggered', { id: alarm.id }));
    
    // S'assurer que repeatDays est initialisé
    if (!alarm.repeatDays) {
      alarm.repeatDays = [];
    }
    
    // Vérifier si c'est une alarme qui sort du mode snooze
    const isSnoozeWakeup = !!alarm.snoozeUntil;
    if (isSnoozeWakeup) {
      logEvent(i18n.t('notification:service.snoozeWakeup', { id: alarm.id }));
    }
    
    // Utiliser la méthode de l'AlarmManager pour déclencher l'alarme
    await alarmManager.triggerAlarmById(alarm.id);
    
    // Si l'alarme n'a pas de jours de répétition, la désactiver
    if (alarm.repeatDays.length === 0 && !isSnoozeWakeup) {
      logEvent(i18n.t('notification:service.disableOneTime', { id: alarm.id }));
      
      const updatedAlarm = { ...alarm, enabled: false };
      await alarmStorage.updateAlarm(updatedAlarm);
    }
  } catch (error) {
    logEvent(i18n.t('notification:service.error'), error);
  }
}

/**
 * Démarre la vérification périodique des alarmes
 * @param checkIntervalSeconds Intervalle de vérification en secondes
 */
function startAlarmChecker(checkIntervalSeconds: number = 30) {
  logEvent(i18n.t('notification:alarmCheck.start', { seconds: checkIntervalSeconds }));
  
  // Arrêter le vérificateur existant si nécessaire
  stopAlarmChecker();
  
  // Vérifier immédiatement
  checkAlarms();
  
  // Configurer la vérification périodique en utilisant BackgroundTimer pour les deux plateformes
  // Cela permet de garantir que les vérifications fonctionnent en arrière-plan
  alarmCheckIntervalId = BackgroundTimer.setInterval(
    checkAlarms,
    checkIntervalSeconds * 1000
  );
}

/**
 * Arrête la vérification périodique des alarmes
 */
function stopAlarmChecker() {
  logEvent(i18n.t('notification:alarmCheck.stop'));
  
  if (alarmCheckIntervalId !== null) {
    // Utiliser BackgroundTimer.clearInterval pour les deux plateformes
    BackgroundTimer.clearInterval(alarmCheckIntervalId);
    alarmCheckIntervalId = null;
  } else {
    logEvent('⚠️ Le vérificateur d\'alarmes n\'est pas en cours d\'exécution');
  }
}

/**
 * Vérifie les alarmes immédiatement et exporte cette fonction
 */
export async function checkAlarmsNow() {
  await checkAlarms();
}

/**
 * Démarre la vérification périodique des alarmes et exporte cette fonction
 */
export function startPeriodicAlarmCheck(intervalSeconds: number = 30) {
  if (alarmCheckIntervalId !== null) {
    return;
  }
  
  startAlarmChecker(intervalSeconds);
}

/**
 * Arrête la vérification périodique des alarmes
 */
export function stopPeriodicAlarmCheck() {
  stopAlarmChecker();
}

/**
 * Initialise le service de notification
 */
export function initNotificationService() {
  logEvent(i18n.t('notification:service.start'));
  
  // Configurations spécifiques pour les modes d'arrière-plan
  if (Platform.OS === 'ios') {
    logEvent('Configuration iOS spécifique');
    
    initSilentAudioMode();
    increaseiOSAppVisibility();
  } else if (Platform.OS === 'android') {
    // Configuration spécifique à Android
    logEvent('Configuration Android spécifique');
    
    // Initialisation du mode audio pour Android
    initAndroidBackgroundMode();
  }
  
  logEvent('Configuration du vérificateur d\'alarmes');
  
  // Démarrer le vérificateur d'alarmes (vérification toutes les 30 secondes)
  startAlarmChecker(30);
  
  // Ajouter un écouteur d'état de l'application pour mieux gérer les transitions
  AppState.addEventListener('change', (nextAppState) => {
    logEvent(`⚡️ Changement d'état de l'application: ${nextAppState}`);
    
    // Protéger contre les transitions trop rapides qui pourraient causer des problèmes
    const now = Date.now();
    const timeSinceLastChange = now - lastAppStateChangeTime;
    lastAppStateChangeTime = now;
    
    if (timeSinceLastChange < 300) {
      logEvent('⚠️ Transition rapide détectée, ignorée pour éviter les problèmes');
      return;
    }
    
    if (nextAppState !== 'active') {
      logEvent('⚠️ App passée en arrière-plan');
      
      // Activation du mode audio silencieux si nécessaire
      if (Platform.OS === 'ios' && !alarmAudioStarted) {
        if (AppState.currentState === 'background') {
          // Assurer qu'il n'y a pas d'audio silencieux en cours avant d'en démarrer un nouveau
          stopSilentAudioMode().then(() => {
            // Attendre un court instant avant de démarrer un nouveau lecteur
            setTimeout(() => {
              if (AppState.currentState === 'background') {
                activateSilentAudioMode();
              }
            }, 100);
          });
        }
      } else if (Platform.OS === 'android' && !alarmAudioStarted) {
        // Pour Android, activer le mode audio d'arrière-plan
        if (AppState.currentState === 'background') {
          activateAndroidBackgroundMode();
        }
      }
    } else {
      // L'application est redevenue active
      logEvent('✅ App revenue au premier plan');
      
      // Arrêter l'audio silencieux car nous n'en avons plus besoin en mode actif
      if (Platform.OS === 'ios') {
        stopSilentAudioMode().then(() => {
          // Vérifier les alarmes immédiatement
          setTimeout(() => {
            if (AppState.currentState === 'active') {
              checkAlarms();
            }
          }, 200);
        });
      } else if (Platform.OS === 'android') {
        stopAndroidBackgroundMode().then(() => {
          // Vérifier les alarmes immédiatement
          setTimeout(() => {
            if (AppState.currentState === 'active') {
              checkAlarms();
            }
          }, 200);
        });
      }
    }
  });
}

/**
 * Initialise le mode arrière-plan pour Android
 */
async function initAndroidBackgroundMode() {
  logEvent('⚙️ Initialisation du mode arrière-plan pour Android');
  
  try {
    // Configurer l'audio pour l'arrière-plan
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,  // Ceci est ignoré sur Android
      staysActiveInBackground: true,
      // Configurer pour Android
      shouldDuckAndroid: false,
    });
    
    // Démarrer un timer en arrière-plan pour maintenir l'application active
    if (keepAliveTimer === null) {
      keepAliveTimer = BackgroundTimer.setInterval(() => {
        if (AppState.currentState === 'background') {
          logEvent('🔄 Maintien de l\'activité en arrière-plan sur Android');
          // Vous pouvez ajouter des tâches légères ici pour maintenir l'application active
        }
      }, 20000); // Toutes les 20 secondes
    }
    
    logEvent('✅ Mode arrière-plan Android initialisé avec succès');
  } catch (error) {
    logEvent('❌ ERREUR lors de l\'initialisation du mode arrière-plan Android', error);
  }
}

/**
 * Active le mode arrière-plan pour Android
 */
async function activateAndroidBackgroundMode() {
  logEvent('🔄 Activation du mode arrière-plan Android');
  
  try {
    // S'assurer que le mode audio est configuré pour l'arrière-plan
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,  // Ignoré sur Android
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });
    
    // Réinitialiser le timer de maintien en vie si nécessaire
    if (keepAliveTimer !== null) {
      BackgroundTimer.clearInterval(keepAliveTimer);
    }
    
    keepAliveTimer = BackgroundTimer.setInterval(() => {
      if (AppState.currentState === 'background') {
        const now = new Date().toISOString();
        logEvent(`[${now}] Maintien de l'activité Android en arrière-plan`);
        
        // Vérifier les alarmes régulièrement
        checkAlarms();
      }
    }, 25000); // Toutes les 25 secondes
    
    logEvent('✅ Mode arrière-plan Android activé');
  } catch (error) {
    logEvent('❌ ERREUR lors de l\'activation du mode arrière-plan Android', error);
  }
}

/**
 * Arrête le mode arrière-plan pour Android
 */
async function stopAndroidBackgroundMode() {
  logEvent('🛑 Arrêt du mode arrière-plan Android');
  
  try {
    // Arrêter le timer de maintien en vie
    if (keepAliveTimer !== null) {
      BackgroundTimer.clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    
    logEvent('✅ Mode arrière-plan Android arrêté');
    return true;
  } catch (error) {
    logEvent('❌ ERREUR lors de l\'arrêt du mode arrière-plan Android', error);
    return false;
  }
}

/**
 * Initialise le mode audio silencieux pour iOS
 * Ce trick permet de maintenir l'application active en arrière-plan
 */
async function initSilentAudioMode() {
  logEvent(i18n.t('notification:service.silentMode.init'));
  
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
  logEvent(i18n.t('notification:service.silentMode.activate'));
  
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
    
    // MÉTHODE 1: Utiliser le fichier MP3 local (plus économe en énergie)
    logEvent('Tentative avec méthode 1: Fichier MP3 silencieux local');
    try {
      const sound = new Audio.Sound();
     
      await sound.loadAsync(require('../../../assets/sounds/silent.mp3'));
      await sound.setIsLoopingAsync(true);
      await sound.setVolumeAsync(0.0001);  // Volume minimum pour éviter la consommation de batterie
      
      // Configurer l'événement de statut pour le monitoring
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.isPlaying) {
            // logEvent('✓ Audio local en lecture active');
            if (AppState.currentState === 'active') {
              stopSilentAudioMode();
            }
          }
        } else if (status.error) {
          logEvent(`❌ Erreur de lecture locale: ${status.error}`);
        }
      });
      
      await sound.playAsync();
      
      global.silentAudioPlayer = sound;
    }
    catch (method1Error) {
      // MÉTHODE 2: Utiliser l'URL distante (consomme plus d'énergie)
      logEvent('❌ Échec méthode 1 (fichier local)', method1Error);
      
      try {
        // Créer un silence via l'URL distante
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
              // logEvent('✓ Audio URL en lecture active');
              if (AppState.currentState === 'active') {
                stopSilentAudioMode();
              }
            }
          } else if (status.error) {
            logEvent(`❌ Erreur de lecture URL: ${status.error}`);
          }
        });
        
        global.silentAudioPlayer = sound;
      }
      catch (method2Error) {
        // MÉTHODE 3: Dernière tentative avec l'API native
        logEvent('❌ Échec méthode 2 (URL distante)', method2Error);
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
  logEvent(i18n.t('notification:service.silentMode.stop'));
  
  // Protection contre les appels simultanés avec un verrouillage
  if (global._stoppingSilentAudio) {
    logEvent('⏱️ Arrêt de l\'audio silencieux déjà en cours, ignoré');
    return;
  }
  
  global._stoppingSilentAudio = true;
  logEvent('🔇 Tentative d\'arrêt de l\'audio silencieux');
  
  try {
    // Vérification plus robuste de l'état du lecteur audio
    if (global.silentAudioPlayer && typeof global.silentAudioPlayer.stopAsync === 'function') {
      try {
        await global.silentAudioPlayer.stopAsync();
        // Petite pause pour éviter les problèmes de timing
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (global.silentAudioPlayer && typeof global.silentAudioPlayer.unloadAsync === 'function') {
          await global.silentAudioPlayer.unloadAsync();
        }
        
        // Réinitialiser proprement la référence
        global.silentAudioPlayer = null;
      } catch (error) {
        logEvent('❌ ERREUR lors de l\'arrêt de l\'audio silencieux', error);
        // S'assurer que la référence est bien nulle même en cas d'erreur
        global.silentAudioPlayer = null;
      }
    } else {
      // La référence existe mais n'est pas un objet audio valide, la nettoyer
      if (global.silentAudioPlayer) {
        logEvent('⚠️ Référence audio invalide détectée, nettoyage forcé');
        global.silentAudioPlayer = null;
      } else {
        logEvent('ℹ️ Aucun lecteur audio silencieux actif');
      }
    }
  } finally {
    // Toujours libérer le verrouillage, même en cas d'erreur
    global._stoppingSilentAudio = false;
  }
}

/**
 * Améliore la visibilité de l'application dans le système iOS
 * sans utiliser les notifications
 */
function increaseiOSAppVisibility() {
  if (Platform.OS !== 'ios') return;
  
  logEvent('🔍 Activation de la visibilité accrue pour iOS');
  
  // Maintenir l'app visible dans le multitâche
  const intervalId = setInterval(() => {
    if (AppState.currentState === 'background') {
      const now = new Date().toISOString();
      logEvent(`[${now}] Maintien de la visibilité en arrière-plan`);
      
      // Alternative pour maintenir l'app active
      if (global.silentAudioPlayer === null) {
        activateSilentAudioMode().catch(e => {
          logEvent('Erreur lors de la réactivation du mode silencieux', e);
        });
      }
    }
  }, 180000); // Toutes les 3 minutes
  
  logEvent('✅ Système de visibilité iOS démarré');
}