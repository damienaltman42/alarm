import { Alarm } from '../../types';
import { alarmStorage } from './alarmStorage';
import { alarmScheduler } from './alarmScheduler';
import { ErrorService } from '../../utils/errorHandling';

/**
 * Service principal pour la gestion des alarmes
 * Sert de façade pour les autres services spécialisés
 */
class AlarmManager {
  /**
   * Initialise le gestionnaire d'alarmes
   */
  async initialize(): Promise<void> {
    try {
      // Enregistrer la tâche en arrière-plan
      await alarmScheduler.registerBackgroundTask();
      
      // Charger et reprogrammer les alarmes existantes
      const alarms = await this.getAlarms();
      for (const alarm of alarms) {
        if (alarm.enabled) {
          await this.updateAlarm(alarm);
        }
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmManager.initialize');
    }
  }

  /**
   * Récupère toutes les alarmes
   */
  async getAlarms(): Promise<Alarm[]> {
    return alarmStorage.getAlarms();
  }

  /**
   * Ajoute ou met à jour une alarme
   */
  async updateAlarm(alarm: Alarm): Promise<void> {
    return alarmScheduler.updateAlarm(alarm);
  }

  /**
   * Supprime une alarme
   */
  async deleteAlarm(alarmId: string): Promise<void> {
    return alarmScheduler.deleteAlarm(alarmId);
  }

  /**
   * Vérifie si une alarme doit être déclenchée et la met à jour si nécessaire
   */
  async checkAndUpdateAlarm(alarm: Alarm): Promise<void> {
    return alarmScheduler.checkAndUpdateAlarm(alarm);
  }

  /**
   * Arrête l'alarme active
   */
  async stopAlarm(): Promise<void> {
    return alarmScheduler.stopAlarm();
  }

  /**
   * Récupère l'ID de l'alarme active
   */
  getActiveAlarmId(): string | null {
    return alarmScheduler.getActiveAlarmId();
  }
}

// Exporter une instance singleton
export const alarmManager = new AlarmManager();

export * from './alarmStorage';
export * from './alarmManager'; 