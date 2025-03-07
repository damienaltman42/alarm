import { AppState, AppStateStatus, Platform } from 'react-native';
import { Alarm, AlarmSchedulerOptions } from '../../types';
import { alarmStorage } from './alarmStorage';
import { ErrorService } from '../../utils/errorHandling';
import { AudioSourceFactory } from '../audio/AudioSourceFactory';
import { Audio } from 'expo-av';
import { startPeriodicAlarmCheck, stopPeriodicAlarmCheck } from '../notification/BackgroundNotificationService';

/**
 * Service responsable de la planification et du déclenchement des alarmes
 */
export class AlarmScheduler {
  private activeAlarmId: string | null = null;
  private appStateSubscription: any = null;
  private isRunningInForeground: boolean = false;
  private checkIntervalSeconds: number;

  constructor(options: AlarmSchedulerOptions = {}) {
    this.checkIntervalSeconds = options.checkIntervalSeconds || 30;
    
    // Configurer l'écouteur d'état de l'application
    this.setupAppStateListener();
    
    // Démarrer le vérificateur périodique
    startPeriodicAlarmCheck(this.checkIntervalSeconds);
    
    console.log(`AlarmScheduler initialisé (intervalle: ${this.checkIntervalSeconds}s)`);
  }

  /**
   * Configure l'écouteur d'état de l'application
   */
  private setupAppStateListener(): void {
    // Supprimer l'ancien écouteur s'il existe
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Ajouter un nouvel écouteur
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
    
    // Initialiser l'état courant
    this.isRunningInForeground = AppState.currentState === 'active';
  }

  /**
   * Gère les changements d'état de l'application
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    console.log("AppState change :", nextAppState);
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
      
      // Calculer si l'alarme doit sonner maintenant
      const now = new Date();
      const [hours, minutes] = alarm.time.split(':').map(Number);
      
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();
      
      // Vérifier si c'est l'heure de l'alarme
      let shouldRing = false;
      
      // S'assurer que repeatDays est initialisé
      if (!alarm.repeatDays) {
        alarm.repeatDays = [];
      }

      // Si l'alarme n'a pas de jours de répétition
      if (alarm.repeatDays.length === 0) {
        // Déclencher si l'heure correspond et si les secondes sont < 15
        shouldRing = (
          currentHours === hours &&
          currentMinutes === minutes &&
          currentSeconds < 15
        );
      } else {
        // Pour les alarmes répétitives, vérifier le jour
        const today = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
        const repeatDay = today === 0 ? 7 : today; // Convertir 0 -> 7 pour la compatibilité
        
        // Vérifier si aujourd'hui est un jour configuré pour l'alarme
        const isDayConfigured = alarm.repeatDays.includes(repeatDay);
        
        shouldRing = (
          isDayConfigured &&
          currentHours === hours &&
          currentMinutes === minutes &&
          currentSeconds < 15
        );
      }
      
      // Si l'alarme doit sonner
      if (shouldRing) {
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
      // Éviter de déclencher plusieurs alarmes en même temps
      if (this.activeAlarmId) {
        console.log(`Une alarme est déjà active (${this.activeAlarmId}), impossible de déclencher ${alarm.id}`);
        return;
      }
      
      // Marquer cette alarme comme active
      this.activeAlarmId = alarm.id;
      console.log(`Déclenchement de l'alarme ${alarm.id} (${alarm.label})`);
      
      // S'assurer que repeatDays est initialisé
      if (!alarm.repeatDays) {
        alarm.repeatDays = [];
      }
      
      // Nettoyer l'ancien format days s'il existe encore
      const alarmAny = alarm as any;
      if (alarmAny.days) {
        // Convertir si nécessaire
        if (Array.isArray(alarmAny.days) && alarmAny.days.length > 0) {
          const convertedDays = alarmAny.days.map((day: number) => day === 0 ? 7 : day);
          alarm.repeatDays = [...new Set([...alarm.repeatDays, ...convertedDays])];
        }
        
        // Supprimer days complètement
        delete alarmAny.days;
      }
      
      // Mettre à jour l'alarme immédiatement pour éviter les déclenchements multiples
      const updatedAlarm: Alarm = {
        ...alarm,
        // Si l'alarme n'a pas de jours de répétition, la désactiver
        enabled: alarm.repeatDays.length > 0
      };
      
      // Si l'alarme n'avait pas de jours de répétition, on la désactive
      if (alarm.repeatDays.length === 0) {
        console.log(`Désactivation de l'alarme ponctuelle ${alarm.id} après déclenchement`);
      } else {
        console.log(`L'alarme répétitive ${alarm.id} reste active pour les prochaines occurrences (jours: ${alarm.repeatDays})`);
      }
      
      // Sauvegarder l'alarme mise à jour
      await alarmStorage.updateAlarm(updatedAlarm);
      
      // Créer et jouer la source audio
      const audioSource = AudioSourceFactory.createSourceForAlarm(alarm);
      if (audioSource) {
        const success = await audioSource.play();
        if (!success) {
          console.error(`Échec de la lecture audio pour l'alarme ${alarm.id}`);
          this.activeAlarmId = null;
          return;
        }
      } else {
        // Fallback au son par défaut si aucune source n'est disponible
        await this.playDefaultSound();
      }
      
      // Naviguer vers l'écran d'alarme ou avertir l'utilisateur
      this.notifyUser(alarm);
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.triggerAlarm');
      this.activeAlarmId = null;
    }
  }

  /**
   * Notifie l'utilisateur de l'alarme active
   */
  private notifyUser(alarm: Alarm): void {
    try {
      // Cette fonction devrait naviguer vers l'écran d'alarme
      // Si vous avez une fonction de navigation globale, utilisez-la ici
      console.log(`Notification utilisateur pour l'alarme ${alarm.id}`);
      
      // Exemple : naviguer vers l'écran d'alarme
      if (global.navigateToAlarmScreen) {
        global.navigateToAlarmScreen(alarm);
      } else {
        console.warn('Aucune fonction de navigation disponible');
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.notifyUser');
    }
  }

  /**
   * Joue le son par défaut si aucune source audio n'est disponible
   */
  private async playDefaultSound(): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/default_alarm.mp3')
      );
      await sound.playAsync();
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.playDefaultSound');
    }
  }

  /**
   * Met à jour une alarme dans le stockage
   */
  async updateAlarm(alarm: Alarm): Promise<void> {
    try {
      await alarmStorage.updateAlarm(alarm);
      console.log(`Alarme ${alarm.id} mise à jour`);
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.updateAlarm');
    }
  }

  /**
   * Supprime une alarme
   */
  async deleteAlarm(alarmId: string): Promise<void> {
    try {
      // Si c'est l'alarme active, l'arrêter
      if (alarmId === this.activeAlarmId) {
        this.activeAlarmId = null;
      }
      
      // Supprimer du stockage
      await alarmStorage.deleteAlarm(alarmId);
      console.log(`Alarme ${alarmId} supprimée`);
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmScheduler.deleteAlarm');
    }
  }

  /**
   * Récupère l'ID de l'alarme active
   */
  getActiveAlarmId(): string | null {
    return this.activeAlarmId;
  }

  /**
   * Nettoie les ressources utilisées
   */
  cleanup(): void {
    // Arrêter le vérificateur périodique
    stopPeriodicAlarmCheck();
    
    // Supprimer l'écouteur d'état
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    console.log('AlarmScheduler nettoyé');
  }
}

// Instance unique du planificateur d'alarmes
export const alarmScheduler = new AlarmScheduler(); 