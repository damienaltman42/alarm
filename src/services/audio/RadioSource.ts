import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { AudioSource } from './AudioSource';

/**
 * Source audio pour les stations de radio
 * Gère la lecture des stations de radio via expo-av
 */
export class RadioSource implements AudioSource {
  private sound: Audio.Sound | null = null;
  private playbackMonitoringInterval: NodeJS.Timeout | null = null;
  private radioUrl: string;
  private radioName: string;

  /**
   * Crée une nouvelle source audio de type radio
   * @param radioUrl URL de la station de radio
   * @param radioName Nom de la station
   */
  constructor(radioUrl: string, radioName: string) {
    this.radioUrl = radioUrl;
    this.radioName = radioName;
  }

  /**
   * Configure l'audio pour fonctionner en arrière-plan
   */
  private async configureAudioForBackground(): Promise<void> {
    try {
      // Configurer l'audio pour continuer en arrière-plan
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Erreur lors de la configuration audio pour l\'arrière-plan:', error);
      throw error;
    }
  }

  /**
   * Démarre la lecture de la radio
   * @returns Succès de l'opération
   */
  public async play(): Promise<boolean> {
    try {
      // Arrêter toute lecture en cours
      await this.stop();
      
      // Configurer l'audio pour l'arrière-plan
      await this.configureAudioForBackground();
      
      // Charger et jouer la radio
      const { sound } = await Audio.Sound.createAsync(
        { uri: this.radioUrl },
        { shouldPlay: true, isLooping: true }
      );
      
      this.sound = sound;
      
      // Configurer la surveillance de la lecture
      this.setupPlaybackMonitoring();
      
      console.log(`Lecture de la radio: ${this.radioName}`);
      return true;
    } catch (error) {
      console.error('Erreur lors de la lecture de la radio:', error);
      return false;
    }
  }

  /**
   * Arrête la lecture de la radio
   * @returns Succès de l'opération
   */
  public async stop(): Promise<boolean> {
    try {
      // Arrêter la surveillance de la lecture
      if (this.playbackMonitoringInterval) {
        clearInterval(this.playbackMonitoringInterval);
        this.playbackMonitoringInterval = null;
      }
      
      // Arrêter la lecture audio si elle est active
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la radio:', error);
      return false;
    }
  }

  /**
   * Obtient le nom de la station de radio
   * @returns Nom de la station
   */
  public getName(): string {
    return this.radioName;
  }

  /**
   * Configure la surveillance de la lecture
   */
  private setupPlaybackMonitoring(): void {
    // Arrêter toute surveillance existante
    if (this.playbackMonitoringInterval) {
      clearInterval(this.playbackMonitoringInterval);
    }
    
    // Vérifier périodiquement que la lecture continue
    this.playbackMonitoringInterval = setInterval(async () => {
      if (this.sound) {
        try {
          const status = await this.sound.getStatusAsync();
          
          // Si la lecture n'est pas en cours mais devrait l'être
          if (!status.isLoaded || !status.isPlaying) {
            console.log('La lecture radio s\'est arrêtée, tentative de reprise...');
            await this.sound.playAsync();
          }
        } catch (error) {
          console.error('Erreur lors de la surveillance de la lecture radio:', error);
        }
      }
    }, 5000); // Vérifier toutes les 5 secondes
  }

  /**
   * Nettoie les ressources
   */
  public cleanup(): void {
    this.stop();
  }
} 