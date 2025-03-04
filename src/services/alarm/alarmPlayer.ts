import { Audio, InterruptionModeAndroid, InterruptionModeIOS, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';
import { AlarmPlayerOptions, RadioStation } from '../../types';
import { ErrorService } from '../../utils/errorHandling';

/**
 * Service responsable de la lecture audio des alarmes
 */
export class AlarmPlayer {
  private sound: Audio.Sound | null = null;
  private previewSound: Audio.Sound | null = null;
  private isPlaying: boolean = false;

  constructor(private options: AlarmPlayerOptions = {}) {
    this.configureAudioForBackground();
  }

  /**
   * Configure l'audio pour fonctionner en arrière-plan
   */
  private async configureAudioForBackground(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: this.options.interruptionModeIOS || InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: this.options.shouldDuckAndroid ?? true,
        interruptionModeAndroid: this.options.interruptionModeAndroid || InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: this.options.playThroughEarpieceAndroid ?? false,
      });
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmPlayer.configureAudioForBackground');
    }
  }

  /**
   * Joue une station de radio
   * @param radioUrl URL de la station de radio
   * @param radioName Nom de la station pour les logs
   */
  async playRadio(radioUrl: string, radioName: string): Promise<void> {
    try {
      // Arrêter tout son en cours
      await this.stopAlarm();
      
      console.log(`Démarrage de la radio: ${radioName}`);
      
      // Créer et charger le nouveau son
      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri: radioUrl });
      await this.sound.playAsync();
      this.isPlaying = true;
      
      // Configurer la gestion des erreurs de lecture
      this.sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
          // Si le statut indique une erreur de chargement
          console.error(`Erreur de lecture: ${(status as any).error}`);
          this.stopAlarm();
        }
      });
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmPlayer.playRadio');
    }
  }

  /**
   * Arrête l'alarme en cours
   */
  async stopAlarm(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.isPlaying = false;
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmPlayer.stopAlarm');
    }
  }

  /**
   * Prévisualise une station de radio
   * @param radioUrl URL de la station de radio
   */
  async previewRadio(radioUrl: string): Promise<void> {
    try {
      // Arrêter la prévisualisation précédente
      await this.stopPreview();
      
      // Créer et charger le nouveau son de prévisualisation
      this.previewSound = new Audio.Sound();
      await this.previewSound.loadAsync({ uri: radioUrl });
      await this.previewSound.playAsync();
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmPlayer.previewRadio');
    }
  }

  /**
   * Arrête la prévisualisation
   */
  async stopPreview(): Promise<void> {
    try {
      if (this.previewSound) {
        await this.previewSound.stopAsync();
        await this.previewSound.unloadAsync();
        this.previewSound = null;
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmPlayer.stopPreview');
    }
  }

  /**
   * Vérifie si une alarme est en cours de lecture
   */
  isAlarmPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    await this.stopAlarm();
    await this.stopPreview();
  }
}

// Exporter une instance singleton
export const alarmPlayer = new AlarmPlayer(); 