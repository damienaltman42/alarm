import { Alarm } from '../../types';
import { alarmStorage } from './alarmStorage';
import { alarmPlayer } from './alarmPlayer';
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
   * Snooze l'alarme active
   */
  async snoozeAlarm(minutes: number = 5): Promise<void> {
    return alarmScheduler.snoozeAlarm(minutes);
  }

  /**
   * Prévisualise une station de radio
   */
  async previewRadio(radioUrl: string): Promise<void> {
    return alarmPlayer.previewRadio(radioUrl);
  }

  /**
   * Arrête la prévisualisation
   */
  async stopPreview(): Promise<void> {
    return alarmPlayer.stopPreview();
  }

  /**
   * Récupère l'ID de l'alarme active
   */
  getActiveAlarmId(): string | null {
    return alarmScheduler.getActiveAlarmId();
  }

  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    alarmScheduler.cleanup();
    alarmPlayer.cleanup();
  }
}

// Exporter une instance singleton
export const alarmManager = new AlarmManager();

export * from './alarmStorage';
export * from './alarmManager'; 