import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Alarm, AlarmSchedulerOptions } from '../../types';
import { alarmStorage } from './alarmStorage';
import { notificationService } from '../notification/notificationService';
import { ErrorService } from '../../utils/errorHandling';
import { MediaType, startPlayback, stopPlayback } from '../audio/TrackPlayerService';
import {alarmManager } from './alarmManager';

// Nom de la tâche en arrière-plan
const BACKGROUND_ALARM_TASK = 'BACKGROUND_ALARM_TASK';

// Définir la tâche en arrière-plan
TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
  try {
    // Vérifier si l'application est au premier plan
    // Si oui, laisser l'application gérer les alarmes
    console.log("+++++++++++++++here++++++++++++++++++++++");
    if (AppState.currentState === 'active') {
      console.log('Application active, la tâche en arrière-plan ne vérifiera pas les alarmes');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
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
  private isRunningInForeground: boolean = false;

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
    
    // Définir l'état initial
    this.isRunningInForeground = AppState.currentState === 'active';
  }

  /**
   * Gère les changements d'état de l'application
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    this.isRunningInForeground = nextAppState === 'active';
    
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
      console.log("+++++++++++++++here registerBackgroundTask ++++++++++++++++++++++");
      console.log(this.options);
      await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
        minimumInterval: 10,
        stopOnTerminate: this.options.stopOnTerminate,
        startOnBoot: this.options.startOnBoot,
      });
      console.log('Tâche en arrière-plan enregistrée');
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.registerBackgroundTask');
    }
  }

  /**
   * Vérifie toutes les alarmes et déclenche celles qui doivent l'être
   */
  async checkAllAlarms(): Promise<void> {
    try {
      // Si l'application est au premier plan et qu'une tâche en arrière-plan est en cours,
      // nous ne voulons pas vérifier les alarmes à nouveau pour éviter les doublons
      console.log("+++++++++++++++here checkAllAlarms ++++++++++++++++++++++");
      if (this.isRunningInForeground && TaskManager.isTaskDefined(BACKGROUND_ALARM_TASK)) {
        const taskStatus = await BackgroundFetch.getStatusAsync();
        // 2 est la valeur pour "Available" dans BackgroundFetch
        if (taskStatus === 2) {
          console.log('Vérification des alarmes ignorée - déjà gérée par la tâche en arrière-plan');
          return;
        }
      }
      
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
        // L'alarme devrait être déclenchée maintenant (à moins de 1 minute près)
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