import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm } from '../../types';
import { ErrorService } from '../../utils/errorHandling';
import { cancelAlarm, scheduleAlarm, AlarmConfig } from './BackgroundNotificationService';

/**
 * Service de gestion des notifications
 * Gère la configuration et la programmation des notifications d'alarme
 */
export class NotificationService {
  private static instance: NotificationService;
  private notificationReceivedListener: any = null;
  private notificationResponseListener: any = null;

  /**
   * Obtient l'instance unique du service de notification
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialise le service de notification
   */
  public async initialize(): Promise<void> {
    await this.configureNotifications();
  }

  /**
   * Configure les notifications pour l'application
   */
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

    // Demander les permissions de notification si nécessaire
    if (Platform.OS === 'ios') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      
      if (status !== 'granted') {
        console.warn('Les permissions de notification n\'ont pas été accordées');
      }
    }
  }

  /**
   * Ajoute des écouteurs pour les événements de notification
   * @param onReceived Fonction appelée lorsqu'une notification est reçue
   * @param onResponse Fonction appelée lorsque l'utilisateur répond à une notification
   */
  public addListeners(
    onReceived: (notification: Notifications.Notification) => void,
    onResponse: (response: Notifications.NotificationResponse) => void
  ): void {
    // Supprimer les écouteurs existants
    this.removeListeners();

    // Ajouter de nouveaux écouteurs
    this.notificationReceivedListener = Notifications.addNotificationReceivedListener(onReceived);
    this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(onResponse);
  }

  /**
   * Supprime les écouteurs d'événements de notification
   */
  public removeListeners(): void {
    if (this.notificationReceivedListener) {
      this.notificationReceivedListener.remove();
      this.notificationReceivedListener = null;
    }

    if (this.notificationResponseListener) {
      this.notificationResponseListener.remove();
      this.notificationResponseListener = null;
    }
  }

  /**
   * Programme une notification d'alarme
   * @param alarm Alarme à programmer
   */
  public async scheduleAlarm(alarm: Alarm): Promise<void> {
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
      
      console.log(`Alarme ${alarm.id} programmée pour ${nextOccurrence.toLocaleString()}`);
    } catch (error) {
      console.error(`Erreur lors de la programmation de l'alarme ${alarm.id}:`, error);
      throw error;
    }
  }

  /**
   * Annule une notification d'alarme
   * @param alarmId ID de l'alarme à annuler
   */
  public async cancelAlarm(alarmId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.alarmId === alarmId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.error(`Erreur lors de l'annulation de l'alarme ${alarmId}:`, error);
      throw error;
    }
  }

  /**
   * Crée une notification persistante pour une alarme active
   * @param title Titre de la notification
   * @param body Corps de la notification
   * @param data Données supplémentaires
   */
  public async createPersistentNotification(
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<string> {
    try {
      const notificationId = await Notifications.presentNotificationAsync({
        content: {
          title,
          body,
          data,
          sticky: true,
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
      
      return notificationId;
    } catch (error) {
      console.error('Erreur lors de la création de la notification persistante:', error);
      throw error;
    }
  }

  /**
   * Programme une notification de snooze
   * @param alarmId ID de l'alarme
   * @param minutes Minutes de report
   */
  public async scheduleSnooze(alarmId: string, minutes: number = 5): Promise<void> {
    try {
      const snoozeDate = new Date();
      snoozeDate.setMinutes(snoozeDate.getMinutes() + minutes);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Alarme reportée',
          body: `L'alarme sonnera à nouveau dans ${minutes} minutes`,
          data: { alarmId, isSnooze: true },
          sound: true,
        },
        trigger: {
          date: snoozeDate,
          type: Notifications.SchedulableTriggerInputTypes.DATE
        },
      });
      
      console.log(`Alarme ${alarmId} reportée de ${minutes} minutes`);
    } catch (error) {
      console.error(`Erreur lors de la programmation du snooze pour l'alarme ${alarmId}:`, error);
      throw error;
    }
  }

  /**
   * Calcule la prochaine occurrence d'une alarme
   * @param alarm Alarme à calculer
   * @returns Date de la prochaine occurrence ou null si aucune
   */
  private calculateNextOccurrence(alarm: Alarm): Date | null {
    try {
      // Extraire l'heure et les minutes
      const [hours, minutes] = alarm.time.split(':').map(Number);
      
      // Si l'alarme n'est pas répétitive, elle est programmée pour aujourd'hui ou demain
      if (!alarm.repeatDays || alarm.repeatDays.length === 0) {
        const now = new Date();
        const alarmTime = new Date();
        alarmTime.setHours(hours, minutes, 0, 0);
        
        // Si l'heure est déjà passée aujourd'hui, programmer pour demain
        if (alarmTime <= now) {
          alarmTime.setDate(alarmTime.getDate() + 1);
        }
        
        return alarmTime;
      }
      
      // Si l'alarme est répétitive, trouver la prochaine occurrence
      const now = new Date();
      const today = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
      
      // Convertir les jours de répétition en format JavaScript (0-6)
      const repeatDays = alarm.repeatDays.map((day: number) => (day === 7 ? 0 : day)); // Convertir 7 (dimanche) en 0
      
      // Trier les jours pour faciliter la recherche
      repeatDays.sort((a: number, b: number) => a - b);
      
      // Trouver le prochain jour de répétition
      let nextDay = repeatDays.find((day: number) => {
        if (day > today) return true;
        if (day === today) {
          // Si c'est aujourd'hui, vérifier si l'heure est déjà passée
          const alarmTime = new Date();
          alarmTime.setHours(hours, minutes, 0, 0);
          return alarmTime > now;
        }
        return false;
      });
      
      // Si aucun jour n'est trouvé après aujourd'hui, prendre le premier jour de la semaine prochaine
      if (nextDay === undefined) {
        nextDay = repeatDays[0];
      }
      
      // Calculer le nombre de jours jusqu'au prochain jour de répétition
      let daysUntilNext = nextDay - today;
      if (daysUntilNext <= 0) {
        daysUntilNext += 7; // Ajouter une semaine
      }
      
      // Créer la date de la prochaine occurrence
      const nextOccurrence = new Date();
      nextOccurrence.setDate(nextOccurrence.getDate() + daysUntilNext);
      nextOccurrence.setHours(hours, minutes, 0, 0);
      
      return nextOccurrence;
    } catch (error) {
      console.error('Erreur lors du calcul de la prochaine occurrence:', error);
      return null;
    }
  }

  /**
   * Planifie une notification pour une alarme
   * @param alarm Alarme pour laquelle planifier la notification
   * @param triggerTime Heure de déclenchement de la notification
   */
  async scheduleNotification(alarm: Alarm, triggerTime: Date): Promise<void> {
    try {
      // Configurer la notification avec les données de l'alarme
      const alarmConfig: AlarmConfig = {
        type: alarm.radioStation ? 'radio' : 'spotify',
        streamingUrl: alarm.radioStation 
          ? alarm.radioStation.url_resolved 
          : (alarm.spotifyPlaylist?.uri || ''),
        title: alarm.radioStation 
          ? `${alarm.radioStation.name}` 
          : (alarm.spotifyPlaylist?.name || 'Alarme'),
        artist: 'Aurora Wake',
        artwork: alarm.radioStation?.favicon || undefined
      };
      
      // Planifier la notification
      scheduleAlarm(triggerTime, alarmConfig, alarm.id);
      
      console.log(`Notification planifiée pour ${triggerTime.toLocaleString()}`);
    } catch (error) {
      ErrorService.handleError(error as Error, 'NotificationService.scheduleNotification');
    }
  }

  /**
   * Annule une notification pour une alarme
   * @param alarmId Identifiant de l'alarme
   */
  async cancelNotification(alarmId: string): Promise<void> {
    try {
      cancelAlarm(alarmId);
      console.log(`Notification annulée pour l'alarme ${alarmId}`);
    } catch (error) {
      ErrorService.handleError(error as Error, 'NotificationService.cancelNotification');
    }
  }
}

// Exporter une instance unique du service de notification
export const notificationService = NotificationService.getInstance(); 