import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm } from '../../types';
import { ErrorService } from '../../utils/errorHandling';

// Clé pour le stockage des alarmes dans AsyncStorage
const ALARMS_STORAGE_KEY = '@rhythmee_alarms';

/**
 * Service de stockage des alarmes
 * Gère la persistance des alarmes dans AsyncStorage
 */
export class AlarmStorage {
  /**
   * Récupère toutes les alarmes stockées
   * @returns Liste des alarmes
   */
  public async getAlarms(): Promise<Alarm[]> {
    try {
      const alarmsJson = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      return alarmsJson ? JSON.parse(alarmsJson) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des alarmes:', error);
      return [];
    }
  }

  /**
   * Sauvegarde les alarmes dans le stockage
   * @param alarms Liste des alarmes à sauvegarder
   */
  public async saveAlarms(alarms: Alarm[]): Promise<void> {
    try {
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des alarmes:', error);
      throw error;
    }
  }

  /**
   * Ajoute une nouvelle alarme
   * @param alarm Alarme à ajouter
   */
  public async addAlarm(alarm: Alarm): Promise<void> {
    const alarms = await this.getAlarms();
    alarms.push(alarm);
    await this.saveAlarms(alarms);
  }

  /**
   * Met à jour une alarme existante
   * @param updatedAlarm Alarme mise à jour
   */
  public async updateAlarm(updatedAlarm: Alarm): Promise<void> {
    const alarms = await this.getAlarms();
    const index = alarms.findIndex(a => a.id === updatedAlarm.id);
    
    if (index !== -1) {
      alarms[index] = updatedAlarm;
      await this.saveAlarms(alarms);
    } else {
      throw new Error(`Alarme avec l'ID ${updatedAlarm.id} non trouvée`);
    }
  }

  /**
   * Supprime une alarme
   * @param alarmId ID de l'alarme à supprimer
   */
  public async deleteAlarm(alarmId: string): Promise<void> {
    const alarms = await this.getAlarms();
    const filteredAlarms = alarms.filter(a => a.id !== alarmId);
    
    if (filteredAlarms.length < alarms.length) {
      await this.saveAlarms(filteredAlarms);
    } else {
      throw new Error(`Alarme avec l'ID ${alarmId} non trouvée`);
    }
  }

  /**
   * Récupère une alarme spécifique par son ID
   * @param alarmId ID de l'alarme à récupérer
   * @returns L'alarme trouvée ou null si non trouvée
   */
  public async getAlarmById(alarmId: string): Promise<Alarm | null> {
    const alarms = await this.getAlarms();
    return alarms.find(a => a.id === alarmId) || null;
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
        await this.saveAlarms(alarms);
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmStorage.updateAlarmStatus');
    }
  }
}

// Exporter une instance unique du service de stockage
export const alarmStorage = new AlarmStorage(); 