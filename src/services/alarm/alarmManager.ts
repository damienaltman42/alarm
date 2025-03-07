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
  // Définir également la variable globale pour que alarmScheduler puisse l'utiliser
  global.navigateToAlarmScreen = navigateFunction;
}

/**
 * Gestionnaire d'alarmes
 * Coordonne les services de stockage et audio pour gérer les alarmes
 */
class AlarmManager {
  private activeAlarmId: string | null = null;
  private activeAudioSource: AudioSource | null = null;
  private previewAudioSource: AudioSource | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialise le gestionnaire d'alarmes
   */
  private async initialize(): Promise<void> {
    console.log('Initialisation du gestionnaire d\'alarmes en mode vérification périodique uniquement');
    // Plus de configuration des notifications
    
    // Migrer les alarmes existantes vers repeatDays
    await this.migrateAlarmsToDaysFormat();
  }

  /**
   * Migre toutes les alarmes existantes pour utiliser uniquement repeatDays
   * Cette fonction est appelée lors de l'initialisation
   */
  private async migrateAlarmsToDaysFormat(): Promise<void> {
    try {
      // Récupérer toutes les alarmes
      const alarms = await alarmStorage.getAlarms();
      let hasChanges = false;
      
      // Parcourir chaque alarme
      for (const alarm of alarms) {
        let needsUpdate = false;
        
        // Initialiser repeatDays si nécessaire
        if (!alarm.repeatDays) {
          alarm.repeatDays = [];
          needsUpdate = true;
        }
        
        // Vérifier si l'ancien format days existe avec une conversion de type temporaire
        const alarmAny = alarm as any;
        if (alarmAny.days) {
          // Si days existe, on le convertit puis on le supprime complètement
          if (Array.isArray(alarmAny.days) && alarmAny.days.length > 0) {
            // Convertir days (0-6) en repeatDays (1-7)
            const convertedDays = alarmAny.days.map((day: number) => day === 0 ? 7 : day);
            alarm.repeatDays = [...new Set([...alarm.repeatDays, ...convertedDays])];
          }
          
          // Supprimer complètement la propriété days dans tous les cas
          delete alarmAny.days;
          needsUpdate = true;
        }
        
        // Mettre à jour l'alarme si nécessaire
        if (needsUpdate) {
          await alarmStorage.updateAlarm(alarm);
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        console.log('✅ Migration des alarmes vers repeatDays terminée avec succès');
      } else {
        console.log('ℹ️ Aucune migration nécessaire pour les alarmes');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la migration des alarmes:', error);
    }
  }

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
    // Plus de programmation de notifications
  }

  /**
   * Met à jour une alarme existante
   * @param updatedAlarm Alarme mise à jour
   */
  public async updateAlarm(updatedAlarm: Alarm): Promise<void> {
    await alarmStorage.updateAlarm(updatedAlarm);
    // Plus de gestion des notifications
  }

  /**
   * Supprime une alarme
   * @param alarmId ID de l'alarme à supprimer
   */
  public async deleteAlarm(alarmId: string): Promise<void> {
    // Plus d'annulation de notifications
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
    // Plus de programmation de notifications
  }

  /**
   * Déclenche une alarme manuellement
   * @param alarmId ID de l'alarme à déclencher
   */
  public async triggerAlarmById(alarmId: string): Promise<void> {
    try {
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
            console.log(`Alarme ${alarmId} déclenchée avec succès`);
            // Plus de notification persistante
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
    } catch (error) {
      console.error(`Erreur lors du déclenchement manuel de l'alarme ${alarmId}:`, error);
      throw error;
    }
  }

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
   * @param minutes Minutes de report (minimum 1 minute)
   */
  public async snoozeAlarm(minutes: number = 5): Promise<void> {
    if (this.activeAlarmId) {
      try {
        // S'assurer que la valeur est au moins 1 minute
        const snoozeMinutes = Math.max(1, minutes);
        
        // Récupérer l'alarme active
        const alarm = await alarmStorage.getAlarmById(this.activeAlarmId);
        if (alarm) {
          // Calculer la nouvelle heure de déclenchement
          const snoozeDate = new Date();
          snoozeDate.setMinutes(snoozeDate.getMinutes() + snoozeMinutes);
          
          console.log(`Report de l'alarme ${alarm.id} jusqu'à ${snoozeDate.toLocaleTimeString()}`);
          
          // Mettre à jour l'alarme avec le champ snoozeUntil
          const updatedAlarm: Alarm = {
            ...alarm,
            snoozeUntil: snoozeDate
          };
          
          // Mettre à jour l'alarme dans le stockage
          await alarmStorage.updateAlarm(updatedAlarm);
          
          console.log(`Alarme ${alarm.id} reportée de ${snoozeMinutes} minutes (jusqu'à ${snoozeDate.toLocaleTimeString()})`);
        }
        
        // Arrêter l'alarme active
        await this.stopAlarm();
        
      } catch (error) {
        console.error('Erreur lors du snooze de l\'alarme:', error);
      }
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
   * Nettoie les ressources
   */
  public cleanup(): void {
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