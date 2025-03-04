import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { AppState, AppStateStatus } from 'react-native';
import { Alarm, AlarmSchedulerOptions } from '../../types';
import { alarmStorage } from './alarmStorage';
import { alarmPlayer } from './alarmPlayer';
import { notificationService } from '../notification/notificationService';
import { ErrorService } from '../../utils/errorHandling';

// Nom de la tâche en arrière-plan
const BACKGROUND_ALARM_TASK = 'BACKGROUND_ALARM_TASK';

// Définir la tâche en arrière-plan
TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
  try {
    const scheduler = new AlarmScheduler();
    await scheduler.checkAllAlarms();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Erreur dans la tâche en arrière-plan:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Service responsable de la planification et du déclenchement des alarmes
 */
export class AlarmScheduler {
  private activeAlarmId: string | null = null;
  private appStateSubscription: any = null;
  private options: AlarmSchedulerOptions;

  constructor(options: AlarmSchedulerOptions = {}) {
    this.options = {
      minimumInterval: options.minimumInterval || 60, // Vérifier toutes les minutes
      stopOnTerminate: options.stopOnTerminate ?? false,
      startOnBoot: options.startOnBoot ?? true,
    };
    
    this.setupAppStateListener();
  }

  /**
   * Configure l'écouteur d'état de l'application
   */
  private setupAppStateListener(): void {
    // Nettoyer l'ancien écouteur s'il existe
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Configurer le nouvel écouteur
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Gère les changements d'état de l'application
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    if (nextAppState === 'active') {
      // L'application est revenue au premier plan
      await this.checkAllAlarms();
    }
  };

  /**
   * Enregistre la tâche en arrière-plan
   */
  async registerBackgroundTask(): Promise<void> {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
        minimumInterval: this.options.minimumInterval,
        stopOnTerminate: this.options.stopOnTerminate,
        startOnBoot: this.options.startOnBoot,
      });
      console.log('Tâche en arrière-plan enregistrée');
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.registerBackgroundTask');
    }
  }

  /**
   * Vérifie toutes les alarmes et met à jour celles qui doivent être déclenchées
   */
  async checkAllAlarms(): Promise<void> {
    try {
      // Si une alarme est déjà active, ne rien faire
      if (this.activeAlarmId) {
        return;
      }
      
      // Récupérer toutes les alarmes
      const alarms = await alarmStorage.getAlarms();
      
      // Vérifier chaque alarme
      for (const alarm of alarms) {
        if (alarm.enabled) {
          await this.checkAndUpdateAlarm(alarm);
        }
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.checkAllAlarms');
    }
  }

  /**
   * Vérifie si une alarme doit être déclenchée et la met à jour si nécessaire
   * @param alarm L'alarme à vérifier
   */
  async checkAndUpdateAlarm(alarm: Alarm): Promise<void> {
    try {
      const now = new Date();
      const nextOccurrence = this.calculateNextOccurrence(alarm);
      
      if (!nextOccurrence) {
        return;
      }
      
      // Calculer la différence en minutes
      const diffMs = nextOccurrence.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes <= 0) {
        // L'alarme doit être déclenchée maintenant
        await this.triggerAlarm(alarm);
      } else if (diffMinutes <= 15) {
        // L'alarme est imminente, planifier une notification
        await notificationService.scheduleNotification(alarm, nextOccurrence);
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.checkAndUpdateAlarm');
    }
  }

  /**
   * Déclenche une alarme
   * @param alarm L'alarme à déclencher
   */
  async triggerAlarm(alarm: Alarm): Promise<void> {
    try {
      // Marquer cette alarme comme active
      this.activeAlarmId = alarm.id;
      
      // Jouer la radio si disponible
      if (alarm.radioStation) {
        await alarmPlayer.playRadio(
          alarm.radioStation.url_resolved || alarm.radioStation.url,
          alarm.radioStation.name
        );
      }
      
      // Créer une notification immédiate
      await notificationService.scheduleNotification(alarm, new Date());
      
      console.log(`Alarme déclenchée: ${alarm.id} - ${alarm.time}`);
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.triggerAlarm');
      this.activeAlarmId = null;
    }
  }

  /**
   * Arrête l'alarme active
   */
  async stopAlarm(): Promise<void> {
    try {
      if (this.activeAlarmId) {
        await alarmPlayer.stopAlarm();
        this.activeAlarmId = null;
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.stopAlarm');
    }
  }

  /**
   * Snooze l'alarme active
   * @param minutes Nombre de minutes pour le snooze
   */
  async snoozeAlarm(minutes: number = 5): Promise<void> {
    try {
      if (!this.activeAlarmId) {
        return;
      }
      
      // Arrêter l'alarme actuelle
      await alarmPlayer.stopAlarm();
      
      // Récupérer l'alarme
      const alarms = await alarmStorage.getAlarms();
      const alarm = alarms.find(a => a.id === this.activeAlarmId);
      
      if (alarm) {
        // Calculer la nouvelle heure de déclenchement
        const snoozeTime = new Date();
        snoozeTime.setMinutes(snoozeTime.getMinutes() + minutes);
        
        // Planifier une notification pour le snooze
        await notificationService.scheduleNotification(alarm, snoozeTime);
        
        console.log(`Alarme snooze pour ${minutes} minutes: ${alarm.id}`);
      }
      
      this.activeAlarmId = null;
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.snoozeAlarm');
    }
  }

  /**
   * Met à jour une alarme
   * @param alarm L'alarme à mettre à jour
   */
  async updateAlarm(alarm: Alarm): Promise<void> {
    try {
      // Sauvegarder l'alarme
      await alarmStorage.saveAlarm(alarm);
      
      if (alarm.enabled) {
        // Vérifier si l'alarme doit être déclenchée prochainement
        await this.checkAndUpdateAlarm(alarm);
      } else {
        // Annuler les notifications pour cette alarme
        await notificationService.cancelNotification(alarm.id);
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.updateAlarm');
    }
  }

  /**
   * Supprime une alarme
   * @param alarmId ID de l'alarme à supprimer
   */
  async deleteAlarm(alarmId: string): Promise<void> {
    try {
      // Annuler les notifications pour cette alarme
      await notificationService.cancelNotification(alarmId);
      
      // Supprimer l'alarme du stockage
      await alarmStorage.deleteAlarm(alarmId);
      
      // Si c'est l'alarme active, l'arrêter
      if (this.activeAlarmId === alarmId) {
        await this.stopAlarm();
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.deleteAlarm');
    }
  }

  /**
   * Calcule la prochaine occurrence d'une alarme
   * @param alarm L'alarme
   * @returns La date de la prochaine occurrence ou null si aucune
   */
  private calculateNextOccurrence(alarm: Alarm): Date | null {
    try {
      if (!alarm.enabled || alarm.days.length === 0) {
        return null;
      }
      
      const [hours, minutes] = alarm.time.split(':').map(Number);
      const now = new Date();
      
      // Trouver le prochain jour où l'alarme doit sonner
      let nextDate: Date | null = null;
      let minDiff = Number.MAX_SAFE_INTEGER;
      
      for (const day of alarm.days) {
        const date = this.getNextDayOfWeek(day, hours, minutes);
        const diff = date.getTime() - now.getTime();
        
        if (diff > 0 && diff < minDiff) {
          nextDate = date;
          minDiff = diff;
        }
      }
      
      return nextDate;
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.calculateNextOccurrence');
      return null;
    }
  }

  /**
   * Calcule la prochaine date pour un jour de la semaine donné
   * @param dayOfWeek Jour de la semaine (0-6, où 0 est dimanche)
   * @param hours Heures
   * @param minutes Minutes
   * @returns Date correspondante
   */
  private getNextDayOfWeek(dayOfWeek: number, hours: number, minutes: number): Date {
    const now = new Date();
    const result = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + (dayOfWeek + 7 - now.getDay()) % 7,
      hours,
      minutes
    );
    
    // Si la date calculée est dans le passé, ajouter une semaine
    if (result < now) {
      result.setDate(result.getDate() + 7);
    }
    
    return result;
  }

  /**
   * Récupère l'ID de l'alarme active
   */
  getActiveAlarmId(): string | null {
    return this.activeAlarmId;
  }

  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Exporter une instance singleton
export const alarmScheduler = new AlarmScheduler(); 