import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm } from '../../types';
import { ErrorService } from '../../utils/errorHandling';

// Clé pour le stockage des alarmes dans AsyncStorage
const ALARMS_STORAGE_KEY = '@aurora_wake_alarms';

/**
 * Service responsable du stockage et de la récupération des alarmes
 */
export class AlarmStorage {
  /**
   * Récupère toutes les alarmes stockées
   * @returns Liste des alarmes
   */
  async getAlarms(): Promise<Alarm[]> {
    try {
      const alarmsJson = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      if (!alarmsJson) {
        return [];
      }
      return JSON.parse(alarmsJson) as Alarm[];
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmStorage.getAlarms');
      return [];
    }
  }

  /**
   * Sauvegarde une alarme
   * @param alarm Alarme à sauvegarder
   */
  async saveAlarm(alarm: Alarm): Promise<void> {
    try {
      const alarms = await this.getAlarms();
      const existingIndex = alarms.findIndex(a => a.id === alarm.id);
      
      if (existingIndex >= 0) {
        // Mettre à jour une alarme existante
        alarms[existingIndex] = alarm;
      } else {
        // Ajouter une nouvelle alarme
        alarms.push(alarm);
      }
      
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmStorage.saveAlarm');
    }
  }

  /**
   * Supprime une alarme
   * @param alarmId ID de l'alarme à supprimer
   */
  async deleteAlarm(alarmId: string): Promise<void> {
    try {
      const alarms = await this.getAlarms();
      const filteredAlarms = alarms.filter(alarm => alarm.id !== alarmId);
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(filteredAlarms));
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmStorage.deleteAlarm');
    }
  }

  /**
   * Met à jour le statut d'activation d'une alarme
   * @param alarmId ID de l'alarme
   * @param enabled Nouvel état d'activation
   */
  async updateAlarmStatus(alarmId: string, enabled: boolean): Promise<void> {
    try {
      const alarms = await this.getAlarms();
      const alarmIndex = alarms.findIndex(alarm => alarm.id === alarmId);
      
      if (alarmIndex >= 0) {
        alarms[alarmIndex].enabled = enabled;
        await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmStorage.updateAlarmStatus');
    }
  }
}

// Exporter une instance singleton
export const alarmStorage = new AlarmStorage(); 