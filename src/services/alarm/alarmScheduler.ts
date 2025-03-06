import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Alarm, AlarmSchedulerOptions } from '../../types';
import { alarmStorage } from './alarmStorage';
import { notificationService } from '../notification/notificationService';
import { ErrorService } from '../../utils/errorHandling';
import { MediaType, startPlayback } from '../audio/TrackPlayerService';
import {alarmManager } from './alarmManager';

/**
 * Service responsable de la planification et du déclenchement des alarmes
 */
export class AlarmScheduler {
  private activeAlarmId: string | null = null;
  private appStateSubscription: any = null;
  private isRunningInForeground: boolean = false;

  constructor(options: AlarmSchedulerOptions = {}) {
    this.setupAppStateListener();
  }

  /**
   * Configure l'écouteur d'état de l'application
   */
  private setupAppStateListener(): void {
    console.log("+++++++++++++++here setupAppStateListener ++++++++++++++++++++++");
    // Nettoyer l'ancien écouteur s'il existe
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Configurer le nouvel écouteur
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    // Définir l'état initial
    this.isRunningInForeground = AppState.currentState === 'active';
  }

  /**
   * Gère les changements d'état de l'application
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    console.log("+++++++++++++++here handleAppStateChange ++++++++++++++++++++++");
    this.isRunningInForeground = nextAppState === 'active';
    
    if (nextAppState === 'active') {
      // L'application est revenue au premier plan
      await this.checkAllAlarms();
    }
  };

  /**
   * Vérifie toutes les alarmes et déclenche celles qui doivent l'être
   */
  async checkAllAlarms(): Promise<void> {
    try {
      const alarms = await alarmStorage.getAlarms();
      
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
   * Vérifie et met à jour une alarme spécifique
   * @param alarm L'alarme à vérifier
   */
  async checkAndUpdateAlarm(alarm: Alarm): Promise<void> {
    try {
      // Si l'alarme n'est pas activée, on ne fait rien
      if (!alarm.enabled) return;
      
      const now = new Date();
      const nextOccurrence = this.calculateNextOccurrence(alarm);
      
      if (!nextOccurrence) {
        console.log(`Aucune occurrence trouvée pour l'alarme ${alarm.id}`);
        return;
      }
      
      // Vérifier si l'alarme doit être déclenchée
      if (now >= nextOccurrence && now.getTime() - nextOccurrence.getTime() < 60000) {
        await this.triggerAlarm(alarm);
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
    console.log("+++++++++++++++here triggerAlarm ++++++++++++++++++++++");
    try {
      console.log(`[⏰ triggerAlarm] Déclenchement d'alarme (ID: ${alarm.id})`);
      console.log(`[⏰ triggerAlarm] État de l'application: ${AppState.currentState}`);
      
      // Vérifier si cette alarme est déjà active
      if (this.activeAlarmId === alarm.id) {
        console.log(`[⏰ triggerAlarm] Alarme ${alarm.id} déjà active, ignorée`);
        return;
      }
      
      // Vérifier les conditions de déclenchement
      const isBackgroundTask = !this.isRunningInForeground;
      const isInBackground = AppState.currentState !== 'active';
      
      console.log(`[⏰ triggerAlarm] Tâche d'arrière-plan: ${isBackgroundTask ? 'Oui' : 'Non'}`);
      console.log(`[⏰ triggerAlarm] App en arrière-plan: ${isInBackground ? 'Oui' : 'Non'}`);
      
      // Enregistrer cet ID comme l'alarme active
      this.activeAlarmId = alarm.id;
      
      // Étape 1: Créer une notification immédiate
      // Ceci fonctionnera dans tous les états de l'application
      try {
        await notificationService.scheduleNotification(alarm, new Date());
        console.log(`[⏰ triggerAlarm] Notification créée avec succès`);
      } catch (notifError) {
        console.error(`[⏰ triggerAlarm] Erreur notification:`, notifError);
      }
      
      // Étape 2: Démarrer la lecture audio
      // Sur iOS, cela ne fonctionnera que si l'application est active
      try {
        // Fonction utilitaire pour formater les tags
        const formatTags = (tags?: string | string[]) => {
          if (!tags) return '';
          if (Array.isArray(tags)) return tags.join(', ');
          return tags;
        };
        
        // Démarrer l'audio selon le type de source
        if (alarm.radioStation) {
          console.log(`[⏰ triggerAlarm] Tentative de lecture radio: ${alarm.radioStation.name}`);
          
          const success = await startPlayback(
            MediaType.RADIO,
            alarm.radioStation.url_resolved,
            `${alarm.radioStation.name} - ${alarm.radioStation.country}`,
            formatTags(alarm.radioStation.tags),
            alarm.radioStation.favicon || ''
          );
          
          console.log(`[⏰ triggerAlarm] Lecture radio: ${success ? 'Succès' : 'Échec'}`);
        } 
        else if (alarm.spotifyPlaylist) {
          console.log(`[⏰ triggerAlarm] Tentative de lecture Spotify: ${alarm.spotifyPlaylist.name || 'Playlist'}`);
          
          const success = await startPlayback(
            MediaType.SPOTIFY,
            alarm.spotifyPlaylist.uri || '',
            alarm.spotifyPlaylist.name || 'Playlist Spotify',
            'Aurora Wake',
            ''
          );
          
          console.log(`[⏰ triggerAlarm] Lecture Spotify: ${success ? 'Succès' : 'Échec'}`);
        } 
        else {
          // Aucune source audio spécifiée, utiliser le son par défaut
          console.log(`[⏰ triggerAlarm] Pas de source audio, lecture du son par défaut`);
          await this.playDefaultSound();
        }
      } catch (audioError) {
        console.error(`[⏰ triggerAlarm] Erreur audio:`, audioError);
        await this.playDefaultSound();
      }
      
      console.log(`[⏰ triggerAlarm] Traitement terminé`);
    } catch (error) {
      console.error(`[⏰ triggerAlarm] Erreur globale:`, error);
    }
  }
  
  /**
   * Joue le son d'alarme par défaut
   */
  private async playDefaultSound(): Promise<void> {
    console.log("+++++++++++++++here playDefaultSound ++++++++++++++++++++++");
    try {
      console.log('[⏰ playDefaultSound] Lecture du son par défaut');
      await alarmManager.stopAlarm();
      console.log('[⏰ playDefaultSound] Son par défaut joué');
    } catch (error) {
      console.error('[⏰ playDefaultSound] Erreur:', error);
    }
  }

  /**
   * Met à jour une alarme
   * @param alarm L'alarme à mettre à jour
   */
  async updateAlarm(alarm: Alarm): Promise<void> {
    console.log("+++++++++++++++here updateAlarm ++++++++++++++++++++++");
    try {
      await alarmStorage.saveAlarms([alarm]);
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.updateAlarm');
    }
  }

  /**
   * Supprime une alarme
   * @param alarmId Identifiant de l'alarme à supprimer
   */
  async deleteAlarm(alarmId: string): Promise<void> {
    console.log("+++++++++++++++here deleteAlarm ++++++++++++++++++++++");
    try {
      
      // Si c'est l'alarme active, l'arrêter
      if (this.activeAlarmId === alarmId) {
        await alarmManager.stopAlarm();
      }
      
      // Supprimer l'alarme du stockage
      await alarmStorage.deleteAlarm(alarmId);
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
    console.log("+++++++++++++++here calculateNextOccurrence ++++++++++++++++++++++");
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