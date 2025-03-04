import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { Alarm } from '../types';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import Constants from 'expo-constants';

// Clé pour le stockage des alarmes dans AsyncStorage
const ALARMS_STORAGE_KEY = '@aurora_wake_alarms';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // On gère le son nous-mêmes avec la radio
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Variable pour stocker la fonction de navigation
let navigateToAlarmScreen: ((alarm: Alarm) => void) | null = null;

// Fonction pour définir la fonction de navigation
export function setNavigateToAlarmScreen(navigateFunction: (alarm: Alarm) => void) {
  navigateToAlarmScreen = navigateFunction;
}

class AlarmManager {
  private activeAlarmId: string | null = null;
  private playbackMonitoringInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private sound: Audio.Sound | null = null;
  public previewSound: Audio.Sound | null = null; // Pour la prévisualisation des radios

  constructor() {
    this.configureNotifications();
    this.setupAppStateListener();
  }

  // Configurer les notifications
  private async configureNotifications(): Promise<void> {
    // Configurer le gestionnaire de notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false, // On gère le son nous-mêmes
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      }),
    });

    // Configurer les écouteurs d'événements de notification
    Notifications.addNotificationReceivedListener(this.handleNotificationReceived);
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);
  }

  // Configurer l'écouteur d'état de l'application
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  // Gérer les changements d'état de l'application
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    // Si l'application revient au premier plan et qu'une alarme est active
    if (nextAppState === 'active' && this.activeAlarmId) {
      // Vérifier si la lecture est toujours en cours
      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        if (!status.isLoaded || !status.isPlaying) {
          console.log('La lecture s\'est arrêtée, tentative de reprise...');
          await this.sound.playAsync();
        }
      }
    }
  };

  // Récupérer toutes les alarmes
  public async getAlarms(): Promise<Alarm[]> {
    try {
      const alarmsJson = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      return alarmsJson ? JSON.parse(alarmsJson) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des alarmes:', error);
      return [];
    }
  }

  // Sauvegarder les alarmes
  private async saveAlarms(alarms: Alarm[]): Promise<void> {
    try {
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des alarmes:', error);
    }
  }

  // Ajouter une alarme
  public async addAlarm(alarm: Alarm): Promise<void> {
    const alarms = await this.getAlarms();
    alarms.push(alarm);
    await this.saveAlarms(alarms);
    
    // Programmer l'alarme si elle est activée
    if (alarm.enabled) {
      await this.scheduleAlarm(alarm);
    }
  }

  // Mettre à jour une alarme
  public async updateAlarm(updatedAlarm: Alarm): Promise<void> {
    const alarms = await this.getAlarms();
    const index = alarms.findIndex(a => a.id === updatedAlarm.id);
    
    if (index !== -1) {
      alarms[index] = updatedAlarm;
      await this.saveAlarms(alarms);
      
      // Annuler l'alarme existante
      await this.cancelAlarm(updatedAlarm.id);
      
      // Reprogrammer l'alarme si elle est activée
      if (updatedAlarm.enabled) {
        await this.scheduleAlarm(updatedAlarm);
      }
    }
  }

  // Supprimer une alarme
  public async deleteAlarm(alarmId: string): Promise<void> {
    const alarms = await this.getAlarms();
    const filteredAlarms = alarms.filter(a => a.id !== alarmId);
    
    await this.saveAlarms(filteredAlarms);
    
    // Annuler l'alarme
    await this.cancelAlarm(alarmId);
  }

  // Activer/désactiver une alarme
  public async toggleAlarm(alarmId: string, enabled: boolean): Promise<void> {
    const alarms = await this.getAlarms();
    const alarm = alarms.find(a => a.id === alarmId);
    
    if (alarm) {
      alarm.enabled = enabled;
      await this.saveAlarms(alarms);
      
      if (enabled) {
        // Programmer l'alarme
        await this.scheduleAlarm(alarm);
      } else {
        // Annuler l'alarme
        await this.cancelAlarm(alarmId);
      }
    }
  }

  // Programmer une alarme
  private async scheduleAlarm(alarm: Alarm): Promise<void> {
    try {
      // Annuler toute notification existante pour cette alarme
      await this.cancelAlarm(alarm.id);
      
      // Calculer la prochaine occurrence de l'alarme
      const nextOccurrence = this.calculateNextOccurrence(alarm);
      if (!nextOccurrence) {
        return;
      }
      
      
      // Programmer la notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: alarm.label || 'Alarme',
          body: alarm.time,
          data: { alarmId: alarm.id },
          sound: true,
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.MAX,
          autoDismiss: false,
        },
        trigger: {
          date: nextOccurrence,
          type: Notifications.SchedulableTriggerInputTypes.DATE
        },
      });
      
      // Vérifier le nombre de notifications programmées
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    } catch (error: any) {
      console.error(`Erreur lors de la programmation de l'alarme ${alarm.id}:`, error);
    }
  }

  // Annuler une alarme
  private async cancelAlarm(alarmId: string): Promise<void> {
    try {
      // Récupérer toutes les notifications programmées
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Filtrer les notifications pour cette alarme
      const alarmNotifications = scheduledNotifications.filter(
        notification => notification.content.data?.alarmId === alarmId
      );
      
      // Annuler chaque notification
      for (const notification of alarmNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      
    } catch (error) {
      console.error(`Erreur lors de l'annulation de l'alarme ${alarmId}:`, error);
    }
  }

  // Obtenir la prochaine date pour un jour de la semaine donné
  private getNextDayOfWeek(dayOfWeek: number, hours: number, minutes: number): Date {
    const today = new Date();
    const result = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + (dayOfWeek + 7 - today.getDay()) % 7,
      hours,
      minutes
    );
    
    // Si la date calculée est dans le passé, ajouter 7 jours
    if (result < today) {
      result.setDate(result.getDate() + 7);
    }
    
    return result;
  }

  // Calculer la prochaine occurrence d'une alarme
  private calculateNextOccurrence(alarm: Alarm): Date | null {
    // Extraire les heures et minutes de l'heure de l'alarme (format: "HH:MM")
    const [hoursStr, minutesStr] = alarm.time.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Si aucun jour n'est sélectionné, l'alarme est pour aujourd'hui ou demain
    if (!alarm.days || alarm.days.length === 0) {
      const now = new Date();
      const alarmTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes
      );
      
      // Si l'heure est déjà passée aujourd'hui, programmer pour demain
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
      }
      
      return alarmTime;
    }
    
    // Trouver la prochaine occurrence parmi les jours sélectionnés
    const today = new Date();
    const nextOccurrences = alarm.days.map(day => 
      this.getNextDayOfWeek(day, hours, minutes)
    );
    
    // Trier les occurrences et prendre la plus proche
    return nextOccurrences.sort((a, b) => a.getTime() - b.getTime())[0];
  }

  // Gérer la réception d'une notification
  private handleNotificationReceived = async (notification: Notifications.Notification): Promise<void> => {
    const alarmId = notification.request.content.data?.alarmId;
    const isSnooze = notification.request.content.data?.isSnooze;
    
    if (alarmId) {
      console.log(`Notification reçue pour l'alarme ${alarmId}${isSnooze ? ' (snooze)' : ''}`);
      
      // Récupérer les détails de l'alarme
      const alarms = await this.getAlarms();
      const alarm = alarms.find(a => a.id === alarmId);
      
      if (alarm && alarm.radioStation) {
        // Démarrer la radio
        await this.playRadio(alarm.radioStation.url_resolved, alarm.radioStation.name);
        
        // Stocker l'ID de l'alarme active
        this.activeAlarmId = alarmId;
        
        // Naviguer vers l'écran d'alarme si la fonction de navigation est définie
        if (navigateToAlarmScreen) {
          try {
            navigateToAlarmScreen(alarm);
          } catch (error) {
            console.error('Erreur lors de la navigation vers l\'écran d\'alarme:', error);
          }
        }
      }
    }
  };

  // Gérer la réponse à une notification
  private handleNotificationResponse = async (response: Notifications.NotificationResponse): Promise<void> => {
    const alarmId = response.notification.request.content.data?.alarmId;
    const isSnooze = response.notification.request.content.data?.isSnooze;
    
    if (alarmId) {
      if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // L'utilisateur a appuyé sur la notification
        console.log(`Notification appuyée pour l'alarme ${alarmId}`);
      } else if (isSnooze) {
        // Arrêter l'alarme si c'est un snooze
        await this.stopAlarm();
      } else {
        // Snoozer l'alarme
        await this.snoozeAlarm(alarmId);
      }
    }
  };

  // Jouer la radio
  private async playRadio(radioUrl: string, radioName: string = 'Radio'): Promise<void> {
    try {
      // Arrêter toute lecture en cours
      await this.stopAlarm();
      
      // Configurer l'audio pour l'arrière-plan
      await this.configureAudioForBackground();
      
      // Créer et charger le son
      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri: radioUrl });
      
      // Configurer pour la lecture en boucle
      await this.sound.setIsLoopingAsync(true);
      
      // Démarrer la lecture
      await this.sound.playAsync();
      
      // Créer une notification pour l'alarme active
      await this.createAlarmNotification(radioName);
      
      // Configurer la surveillance de la lecture
      this.setupPlaybackMonitoring();
      
      console.log(`Radio démarrée: ${radioName} (${radioUrl})`);
    } catch (error) {
      console.error('Erreur lors du démarrage de la radio:', error);
    }
  }
  
  // Créer une notification pour l'alarme active
  private async createAlarmNotification(radioName: string): Promise<void> {
    try {
      // Utiliser expo-notifications au lieu de notifee
      const notificationId = await Notifications.presentNotificationAsync({
        title: 'Aurora Wake',
        body: `${radioName} en cours de lecture...`,
        data: { type: 'radio_playing' },
        sticky: true, // Notification persistante
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.MAX,
      });
      
      this.activeAlarmId = 'radio';
      console.log(`Notification de lecture créée avec l'ID: ${notificationId}`);
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
    }
  }

  // Configurer l'audio pour l'arrière-plan
  private async configureAudioForBackground(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Erreur lors de la configuration audio:', error);
    }
  }

  // Configurer la surveillance de la lecture
  private setupPlaybackMonitoring(): void {
    // Arrêter toute surveillance existante
    if (this.playbackMonitoringInterval) {
      clearInterval(this.playbackMonitoringInterval);
    }
    
    // Vérifier périodiquement que la lecture continue
    this.playbackMonitoringInterval = setInterval(async () => {
      if (this.activeAlarmId && this.sound) {
        try {
          const status = await this.sound.getStatusAsync();
          
          // Si la lecture n'est pas en cours mais devrait l'être
          if (!status.isLoaded || !status.isPlaying) {
            console.log('La lecture s\'est arrêtée, tentative de reprise...');
            await this.sound.playAsync();
          }
        } catch (error) {
          console.error('Erreur lors de la surveillance de la lecture:', error);
        }
      }
    }, 5000); // Vérifier toutes les 5 secondes
  }

  // Prévisualiser une radio (méthode publique pour l'interface utilisateur)
  public async previewRadio(radioUrl: string, radioName: string = 'Radio'): Promise<void> {
    try {
      // Arrêter toute lecture en cours
      await this.stopPreview();
      
      // Configurer l'audio
      await this.configureAudioForBackground();
      
      // Créer et charger le son
      this.previewSound = new Audio.Sound();
      await this.previewSound.loadAsync({ uri: radioUrl });
      
      // Démarrer la lecture
      await this.previewSound.playAsync();
      
      console.log(`Prévisualisation radio démarrée: ${radioName} (${radioUrl})`);
    } catch (error) {
      console.error('Erreur lors de la prévisualisation de la radio:', error);
    }
  }
  
  // Arrêter la prévisualisation
  public async stopPreview(): Promise<void> {
    try {
      if (this.previewSound) {
        try {
          // Vérifier l'état de lecture avant d'arrêter
          const status = await this.previewSound.getStatusAsync();
          
          if (status.isLoaded) {
            await this.previewSound.stopAsync();
            await this.previewSound.unloadAsync();
          }
        } catch (innerError) {
          // Ignorer les erreurs spécifiques liées à l'interruption
          console.log('Nettoyage de la prévisualisation');
        } finally {
          this.previewSound = null;
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la prévisualisation:', error);
      // S'assurer que la référence est nettoyée même en cas d'erreur
      this.previewSound = null;
    }
  }

  // Arrêter l'alarme
  public async stopAlarm(): Promise<void> {
    try {
      // Arrêter la lecture audio
      if (this.sound) {
        try {
          // Vérifier l'état de lecture avant d'arrêter
          const status = await this.sound.getStatusAsync();
          
          if (status.isLoaded) {
            await this.sound.stopAsync();
            await this.sound.unloadAsync();
          }
        } catch (error) {
          // Ignorer les erreurs spécifiques liées à l'interruption audio
          console.log('Erreur ignorée lors de l\'arrêt audio:', (error as Error).message);
        } finally {
          // S'assurer que la référence est nettoyée même en cas d'erreur
          this.sound = null;
        }
      }
      
      // Arrêter également toute prévisualisation en cours
      try {
        await this.stopPreview();
      } catch (error) {
        console.log('Erreur ignorée lors de l\'arrêt de la prévisualisation:', (error as Error).message);
      }
      
      // Arrêter la surveillance de la lecture
      if (this.playbackMonitoringInterval) {
        clearInterval(this.playbackMonitoringInterval);
        this.playbackMonitoringInterval = null;
      }
      
      // Supprimer les notifications
      try {
        await Notifications.dismissAllNotificationsAsync();
      } catch (error) {
        console.log('Erreur ignorée lors de la suppression des notifications:', (error as Error).message);
      }
      
      // Si l'alarme est à usage unique (sans jours sélectionnés), la désactiver
      if (this.activeAlarmId) {
        try {
          const alarms = await this.getAlarms();
          const alarm = alarms.find(a => a.id === this.activeAlarmId);
          
          if (alarm && (!alarm.days || alarm.days.length === 0)) {
            // Désactiver l'alarme à usage unique
            await this.toggleAlarm(this.activeAlarmId, false);
            console.log(`Alarme à usage unique ${this.activeAlarmId} désactivée`);
          }
        } catch (error) {
          console.log('Erreur ignorée lors de la désactivation de l\'alarme:', (error as Error).message);
        } finally {
          this.activeAlarmId = null;
        }
      }
      
      console.log('Alarme arrêtée');
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'alarme:', error);
      // Réinitialiser l'état même en cas d'erreur
      this.sound = null;
      this.activeAlarmId = null;
      if (this.playbackMonitoringInterval) {
        clearInterval(this.playbackMonitoringInterval);
        this.playbackMonitoringInterval = null;
      }
    }
  }

  // Snoozer une alarme
  public async snoozeAlarm(alarmId: string): Promise<void> {
    // Arrêter d'abord l'alarme
    await this.stopAlarm();
    
    // Récupérer les détails de l'alarme
    const alarms = await this.getAlarms();
    const alarm = alarms.find(a => a.id === alarmId);
    
    if (alarm && alarm.snoozeEnabled) {
      // Programmer une nouvelle notification pour le snooze
      const snoozeDate = new Date();
      snoozeDate.setMinutes(snoozeDate.getMinutes() + alarm.snoozeInterval);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Alarme reportée',
          body: `L'alarme sonnera à nouveau dans ${alarm.snoozeInterval} minutes`,
          data: { alarmId, isSnooze: true },
          sound: true,
        },
        trigger: {
          date: snoozeDate,
          type: Notifications.SchedulableTriggerInputTypes.DATE
        },
      });
      
      console.log(`Alarme ${alarmId} reportée de ${alarm.snoozeInterval} minutes`);
    }
  }

  // Vérifier si une alarme est active
  public isAlarmActive(): boolean {
    return this.activeAlarmId !== null;
  }

  // Obtenir l'ID de l'alarme active
  getActiveAlarmId(): string | null {
    return this.activeAlarmId;
  }

  // Vérifier et mettre à jour une alarme
  async checkAndUpdateAlarm(alarm: Alarm): Promise<void> {
    try {
      // Vérifier si l'alarme est déjà programmée
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const alarmNotifications = scheduledNotifications.filter(
        notification => notification.content.data?.alarmId === alarm.id
      );
      
      // Si l'alarme est activée mais n'est pas programmée, la programmer
      if (alarm.enabled && alarmNotifications.length === 0) {
        await this.scheduleAlarm(alarm);
      }
      // Si l'alarme est désactivée mais est programmée, l'annuler
      else if (!alarm.enabled && alarmNotifications.length > 0) {
        await this.cancelAlarm(alarm.id);
      }
    } catch (error) {
      console.error(`Erreur lors de la vérification de l'alarme ${alarm.id}:`, error);
    }
  }

  // Nettoyer les ressources lors de la destruction de l'instance
  public cleanup(): void {
    // Arrêter la surveillance de la lecture
    if (this.playbackMonitoringInterval) {
      clearInterval(this.playbackMonitoringInterval);
      this.playbackMonitoringInterval = null;
    }
    
    // Arrêter l'écoute des changements d'état de l'application
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Arrêter et décharger le son
    if (this.sound) {
      this.sound.stopAsync().then(() => {
        this.sound?.unloadAsync();
        this.sound = null;
      }).catch(error => {
        console.error('Erreur lors du nettoyage du son:', error);
      });
    }
    
    this.activeAlarmId = null;
  }
}

// Exporter une instance unique du gestionnaire d'alarmes
export const alarmManager = new AlarmManager(); 