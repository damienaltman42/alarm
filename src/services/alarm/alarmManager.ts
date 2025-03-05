import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Alarm } from '../../types';
import { alarmStorage } from './alarmStorage';
import { notificationService } from '../notification/notificationService';
import { AudioSourceFactory } from '../audio/AudioSourceFactory';
import { AudioSource } from '../audio/AudioSource';
import { RadioSource } from '../audio/RadioSource';
import { SpotifySource } from '../audio/SpotifySource';

// Variable pour stocker la fonction de navigation
let navigateToAlarmScreen: ((alarm: Alarm) => void) | null = null;

/**
 * Définit la fonction de navigation vers l'écran d'alarme
 * @param navigateFunction Fonction de navigation
 */
export function setNavigateToAlarmScreen(navigateFunction: (alarm: Alarm) => void) {
  navigateToAlarmScreen = navigateFunction;
}

/**
 * Gestionnaire d'alarmes
 * Coordonne les services de stockage, notification et audio pour gérer les alarmes
 */
class AlarmManager {
  private activeAlarmId: string | null = null;
  private appStateSubscription: any = null;
  private activeAudioSource: AudioSource | null = null;
  private previewAudioSource: AudioSource | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialise le gestionnaire d'alarmes
   */
  private async initialize(): Promise<void> {
    // Initialiser le service de notification
    await notificationService.initialize();
    
    // Configurer les écouteurs de notification
    notificationService.addListeners(
      this.handleNotificationReceived,
      this.handleNotificationResponse
    );
    
    // Configurer l'écouteur d'état de l'application
    this.setupAppStateListener();
  }

  /**
   * Configure l'écouteur d'état de l'application
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Gère les changements d'état de l'application
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    // Si l'application revient au premier plan et qu'une alarme est active
    if (nextAppState === 'active' && this.activeAlarmId) {
      // La surveillance de la lecture est maintenant gérée par les sources audio
    }
  };

  /**
   * Récupère toutes les alarmes
   * @returns Liste des alarmes
   */
  public async getAlarms(): Promise<Alarm[]> {
    return await alarmStorage.getAlarms();
  }

  /**
   * Ajoute une nouvelle alarme
   * @param alarm Alarme à ajouter
   */
  public async addAlarm(alarm: Alarm): Promise<void> {
    await alarmStorage.addAlarm(alarm);
    
    // Programmer l'alarme si elle est activée
    if (alarm.enabled) {
      await this.scheduleAlarm(alarm);
    }
  }

  /**
   * Met à jour une alarme existante
   * @param updatedAlarm Alarme mise à jour
   */
  public async updateAlarm(updatedAlarm: Alarm): Promise<void> {
    await alarmStorage.updateAlarm(updatedAlarm);
    
    // Annuler l'ancienne programmation
    await notificationService.cancelAlarm(updatedAlarm.id);
    
    // Reprogrammer l'alarme si elle est activée
    if (updatedAlarm.enabled) {
      await this.scheduleAlarm(updatedAlarm);
    }
  }

  /**
   * Supprime une alarme
   * @param alarmId ID de l'alarme à supprimer
   */
  public async deleteAlarm(alarmId: string): Promise<void> {
    // Annuler la notification
    await notificationService.cancelAlarm(alarmId);
    
    // Supprimer l'alarme du stockage
    await alarmStorage.deleteAlarm(alarmId);
  }

  /**
   * Active ou désactive une alarme
   * @param alarmId ID de l'alarme
   * @param enabled État d'activation
   */
  public async toggleAlarm(alarmId: string, enabled: boolean): Promise<void> {
    // Récupérer l'alarme
    const alarm = await alarmStorage.getAlarmById(alarmId);
    if (!alarm) {
      throw new Error(`Alarme avec l'ID ${alarmId} non trouvée`);
    }
    
    // Mettre à jour l'état d'activation
    const updatedAlarm = { ...alarm, enabled };
    
    // Mettre à jour l'alarme
    await alarmStorage.updateAlarm(updatedAlarm);
    
    // Programmer ou annuler la notification
    if (enabled) {
      await this.scheduleAlarm(updatedAlarm);
    } else {
      await notificationService.cancelAlarm(alarmId);
    }
  }

  /**
   * Programme une alarme
   * @param alarm Alarme à programmer
   */
  private async scheduleAlarm(alarm: Alarm): Promise<void> {
    await notificationService.scheduleAlarm(alarm);
  }

  /**
   * Gère la réception d'une notification
   */
  private handleNotificationReceived = async (notification: Notifications.Notification): Promise<void> => {
    const alarmId = notification.request.content.data?.alarmId;
    const isSnooze = notification.request.content.data?.isSnooze;
    
    if (alarmId) {
      // Récupérer l'alarme
      const alarm = await alarmStorage.getAlarmById(alarmId);
      
      if (alarm) {
        // Stocker l'ID de l'alarme active
        this.activeAlarmId = alarmId;
        
        // Arrêter toute source audio active
        if (this.activeAudioSource) {
          await this.activeAudioSource.stop();
          this.activeAudioSource = null;
        }
        
        // Créer et démarrer la source audio appropriée
        const audioSource = AudioSourceFactory.createSourceForAlarm(alarm);
        if (audioSource) {
          this.activeAudioSource = audioSource;
          const success = await audioSource.play();
          
          if (success) {
            // Créer une notification persistante
            await notificationService.createPersistentNotification(
              alarm.label || 'Alarme',
              `Il est ${alarm.time} - ${audioSource.getName()}`,
              { alarmId }
            );
          }
        }
        
        // Naviguer vers l'écran d'alarme si la fonction de navigation est définie
        if (navigateToAlarmScreen) {
          try {
            navigateToAlarmScreen(alarm);
          } catch (error) {
            console.error('Erreur lors de la navigation vers l\'écran d\'alarme:', error);
          }
        }
      }
    }
  };

  /**
   * Gère la réponse à une notification
   */
  private handleNotificationResponse = async (response: Notifications.NotificationResponse): Promise<void> => {
    const alarmId = response.notification.request.content.data?.alarmId;
    
    if (alarmId) {
      // Naviguer vers l'écran d'alarme
      const alarm = await alarmStorage.getAlarmById(alarmId);
      
      if (alarm && navigateToAlarmScreen) {
        try {
          navigateToAlarmScreen(alarm);
        } catch (error) {
          console.error('Erreur lors de la navigation vers l\'écran d\'alarme:', error);
        }
      }
    }
  };

  /**
   * Arrête l'alarme active
   */
  public async stopAlarm(): Promise<void> {
    // Arrêter la source audio active
    if (this.activeAudioSource) {
      await this.activeAudioSource.stop();
      this.activeAudioSource = null;
    }
    
    // Réinitialiser l'ID de l'alarme active
    this.activeAlarmId = null;
  }

  /**
   * Reporte l'alarme active
   * @param minutes Minutes de report
   */
  public async snoozeAlarm(minutes: number = 5): Promise<void> {
    if (this.activeAlarmId) {
      // Arrêter l'alarme
      await this.stopAlarm();
      
      // Programmer une notification de snooze
      await notificationService.scheduleSnooze(this.activeAlarmId, minutes);
    }
  }

  /**
   * Prévisualise une station de radio
   * @param radioUrl URL de la station
   * @param radioName Nom de la station
   */
  public async previewRadio(radioUrl: string, radioName: string = 'Radio'): Promise<void> {
    // Arrêter toute prévisualisation en cours
    await this.stopPreview();
    
    // Créer et démarrer une source audio pour la prévisualisation
    const radioSource = new RadioSource(radioUrl, radioName);
    this.previewAudioSource = radioSource;
    await radioSource.play();
  }

  /**
   * Prévisualise une playlist Spotify
   * @param playlistUri URI de la playlist
   * @param playlistName Nom de la playlist
   */
  public async previewSpotify(playlistUri: string, playlistName: string): Promise<void> {
    // Arrêter toute prévisualisation en cours
    await this.stopPreview();
    
    // Créer et démarrer une source audio pour la prévisualisation
    const spotifySource = new SpotifySource(playlistUri, playlistName);
    this.previewAudioSource = spotifySource;
    await spotifySource.play();
  }

  /**
   * Arrête la prévisualisation
   */
  public async stopPreview(): Promise<void> {
    if (this.previewAudioSource) {
      await this.previewAudioSource.stop();
      this.previewAudioSource = null;
    }
  }

  /**
   * Vérifie si une alarme est active
   * @returns Vrai si une alarme est active
   */
  public isAlarmActive(): boolean {
    return this.activeAlarmId !== null;
  }

  /**
   * Récupère l'ID de l'alarme active
   * @returns ID de l'alarme active ou null
   */
  public getActiveAlarmId(): string | null {
    return this.activeAlarmId;
  }

  /**
   * Récupère la source audio en cours de prévisualisation
   * @returns Source audio en cours de prévisualisation ou null
   */
  public getPreviewAudioSource(): AudioSource | null {
    return this.previewAudioSource;
  }

  /**
   * Vérifie et met à jour une alarme
   * @param alarm Alarme à vérifier
   */
  public async checkAndUpdateAlarm(alarm: Alarm): Promise<void> {
    try {
      // Si l'alarme est activée mais n'est pas programmée, la programmer
      if (alarm.enabled) {
        await this.scheduleAlarm(alarm);
      } else {
        // Si l'alarme est désactivée, annuler sa programmation
        await notificationService.cancelAlarm(alarm.id);
      }
    } catch (error) {
      console.error(`Erreur lors de la vérification de l'alarme ${alarm.id}:`, error);
    }
  }

  /**
   * Nettoie les ressources
   */
  public cleanup(): void {
    // Supprimer l'écouteur d'état de l'application
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Supprimer les écouteurs de notification
    notificationService.removeListeners();
    
    // Arrêter les sources audio
    if (this.activeAudioSource) {
      this.activeAudioSource.cleanup();
      this.activeAudioSource = null;
    }
    
    if (this.previewAudioSource) {
      this.previewAudioSource.cleanup();
      this.previewAudioSource = null;
    }
  }
}

// Exporter une instance unique du gestionnaire d'alarmes
export const alarmManager = new AlarmManager(); 