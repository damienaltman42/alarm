import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';
import { AudioSource, AudioSourceUtils } from './AudioSource';

/**
 * Source audio pour les radios
 */
export class RadioSource implements AudioSource {
  private sound: Audio.Sound | null = null;
  private playbackMonitoringInterval: NodeJS.Timeout | null = null;
  private radioUrl: string;
  private radioName: string;
  private isStoppingSound: boolean = false;
  
  /**
   * Crée une nouvelle source audio pour une station de radio
   * @param radioUrl URL de la station de radio
   * @param radioName Nom de la station de radio
   */
  constructor(radioUrl: string, radioName: string) {
    this.radioUrl = radioUrl;
    this.radioName = radioName;
  }
  
  /**
   * Configure l'audio pour jouer en arrière-plan
   */
  private async configureAudioForBackground(): Promise<void> {
    try {
      // Configuration spécifique à chaque plateforme
      if (Platform.OS === 'ios') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        });
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la configuration de l\'audio:', error);
    }
  }
  
  /**
   * Joue la radio
   * @returns Succès de l'opération
   */
  public async play(): Promise<boolean> {
    console.log("+++++++++++++++here play RadioSource +++++++++++++++++++++++");
    try {
      // Arrêter toute lecture en cours
      await this.stop();
      
      // Configurer l'audio pour jouer en arrière-plan
      await this.configureAudioForBackground();
      console.log(this.radioUrl)
      // Charger et jouer la radio
      console.log('Lecture de la radio:', this.radioName);
      this.sound = new Audio.Sound();
      await this.sound.loadAsync({ uri: this.radioUrl });
      await this.sound.playAsync();
      
      // Configurer la surveillance de la lecture
      this.setupPlaybackMonitoring();
      
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
    console.log("+++++++++++++++here stop RadioSource +++++++++++++++++++++++");
    // Éviter les arrêts multiples simultanés
    if (this.isStoppingSound) {
      console.log('Arrêt déjà en cours pour cette source radio, opération ignorée');
      return true;
    }

    try {
      this.isStoppingSound = true;
      
      // Arrêter la surveillance de la lecture
      console.log('Arrêt de la surveillance de la lecture dans le RadioSource');
      if (this.playbackMonitoringInterval) {
        clearInterval(this.playbackMonitoringInterval);
        this.playbackMonitoringInterval = null;
      }
      
      // Arrêter la lecture audio si elle est active
      const result = await AudioSourceUtils.safeStop(
        this.sound,
        async (sound) => { await sound.stopAsync(); },
        async (sound) => { await sound.unloadAsync(); },
        'la radio'
      );
      
      if (result) {
        this.sound = null;
      }
      
      return result;
    } catch (error) {
      console.error('Erreur inattendue lors de l\'arrêt de la radio:', error);
      return false;
    } finally {
      this.isStoppingSound = false;
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
    if (this.playbackMonitoringInterval) {
      clearInterval(this.playbackMonitoringInterval);
    }
    
    this.playbackMonitoringInterval = setInterval(async () => {
      if (this.sound) {
        try {
          const status = await this.sound.getStatusAsync();
          if (!status.isLoaded || !status.isPlaying) {
            console.log('La lecture radio s\'est arrêtée, tentative de reprise...');
            // Tenter de reprendre la lecture
            if (status.isLoaded) {
              await this.sound.playAsync();
            } else {
              // Recharger si nécessaire
              await this.play();
            }
          }
        } catch (error) {
          console.error('Erreur lors de la surveillance de la lecture:', error);
        }
      }
    }, 5000); // Vérifier toutes les 5 secondes
  }

  /**
   * Nettoie les ressources
   */
  public cleanup(): void {
    this.stop().catch(error => {
      console.error('Erreur lors du nettoyage de la source radio:', error);
    });
  }
} 