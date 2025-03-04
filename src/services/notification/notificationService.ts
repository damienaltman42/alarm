import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm } from '../../types';
import { ErrorService } from '../../utils/errorHandling';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // On gère le son nous-mêmes avec la radio
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Service responsable de la gestion des notifications pour les alarmes
 */
export class NotificationService {
  private notificationListeners: any[] = [];

  constructor() {
    this.configureNotifications();
  }

  /**
   * Configure les notifications
   */
  private configureNotifications(): void {
    // Configurer les écouteurs d'événements de notification
    this.notificationListeners.push(
      Notifications.addNotificationReceivedListener(this.handleNotificationReceived)
    );
    this.notificationListeners.push(
      Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse)
    );
  }

  /**
   * Gère la réception d'une notification
   */
  private handleNotificationReceived = (notification: Notifications.Notification): void => {
    console.log('Notification reçue:', notification);
    // Ici, on pourrait ajouter une logique supplémentaire si nécessaire
  };

  /**
   * Gère la réponse à une notification
   */
  private handleNotificationResponse = (response: Notifications.NotificationResponse): void => {
    console.log('Réponse à la notification:', response);
    const { actionIdentifier, notification } = response;
    const alarmId = notification.request.content.data?.alarmId as string;

    if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // L'utilisateur a appuyé sur la notification
      console.log('Notification appuyée, alarmId:', alarmId);
    }
  };

  /**
   * Planifie une notification pour une alarme
   * @param alarm L'alarme pour laquelle planifier une notification
   * @param triggerDate Date de déclenchement
   */
  async scheduleNotification(alarm: Alarm, triggerDate: Date): Promise<string> {
    try {
      // Annuler toute notification existante pour cette alarme
      await this.cancelNotification(alarm.id);

      // Créer le contenu de la notification
      const content: Notifications.NotificationContentInput = {
        title: alarm.label || 'Réveil',
        body: `Il est ${alarm.time}${alarm.radioStation ? ` - ${alarm.radioStation.name}` : ''}`,
        data: { alarmId: alarm.id },
        sound: false, // On gère le son nous-mêmes
      };

      // Configurer le déclencheur
      const trigger: Notifications.NotificationTriggerInput = triggerDate;

      // Planifier la notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger,
      });

      console.log(`Notification planifiée (${notificationId}) pour ${triggerDate.toLocaleString()}`);
      return notificationId;
    } catch (error) {
      ErrorService.handleError(error as Error, 'NotificationService.scheduleNotification');
      return '';
    }
  }

  /**
   * Annule une notification
   * @param alarmId ID de l'alarme
   */
  async cancelNotification(alarmId: string): Promise<void> {
    try {
      // Récupérer toutes les notifications planifiées
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Trouver les notifications correspondant à cette alarme
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.alarmId === alarmId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          console.log(`Notification annulée: ${notification.identifier}`);
        }
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'NotificationService.cancelNotification');
    }
  }

  /**
   * Demande les permissions de notification
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      
      return status === 'granted';
    } catch (error) {
      ErrorService.handleError(error as Error, 'NotificationService.requestPermissions');
      return false;
    }
  }

  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    // Supprimer les écouteurs d'événements
    this.notificationListeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.notificationListeners = [];
  }
}

// Exporter une instance singleton
export const notificationService = new NotificationService(); 