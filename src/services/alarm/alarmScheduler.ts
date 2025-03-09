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
      
      // Vérifier si l'alarme est en mode snooze
      if (alarm.snoozeUntil) {
        const snoozeUntil = new Date(alarm.snoozeUntil);
        
        // Si le temps de snooze est dépassé (avec une fenêtre de 15 secondes)
        if (now >= snoozeUntil && now.getSeconds() < 15) {
          console.log(`Réveil après snooze pour l'alarme ${alarm.id}`);
          
          // Réinitialiser le snoozeUntil avant de déclencher l'alarme
          const updatedAlarm = { ...alarm, snoozeUntil: null };
          await alarmStorage.updateAlarm(updatedAlarm);
          
          // Déclencher l'alarme
          await this.triggerAlarm(updatedAlarm);
          return;
        }
      }
      
      // Pour les alarmes normales, continuer avec la vérification standard
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
      
      // Pour les alarmes sans jours de répétition
      if (alarm.repeatDays.length === 0) {
        // Déclencher si l'heure correspond et si les secondes sont dans la fenêtre
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
      
      // Vérifier si l'alarme sort de snooze
      const isSnoozeWakeup = !!alarm.snoozeUntil;
      
      // Marquer cette alarme comme active
      this.activeAlarmId = alarm.id;
      console.log(`Déclenchement de l'alarme ${alarm.id} (${alarm.label})`);
      
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
      
      // Désactiver les alarmes ponctuelles qui ne sont pas en sortie de snooze
      if (alarm.repeatDays && alarm.repeatDays.length === 0 && !isSnoozeWakeup) {
        console.log(`Désactivation de l'alarme ponctuelle ${alarm.id} après déclenchement`);
        
        const updatedAlarm: Alarm = {
          ...alarm,
          enabled: false
        };
        
        await alarmStorage.updateAlarm(updatedAlarm);
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