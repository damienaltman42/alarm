import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';
import { RadioSource } from './RadioSource';
import { SpotifySource } from './SpotifySource';

/**
 * Service de gestion audio
 * Gère la lecture des radios et des playlists Spotify pour les alarmes
 * @deprecated Utilisez plutôt les classes RadioSource et SpotifySource
 */
export class AudioService {
  private static instance: AudioService;
  private sound: Audio.Sound | null = null;
  private previewSound: Audio.Sound | null = null;
  private playbackMonitoringInterval: NodeJS.Timeout | null = null;
  private radioSource: RadioSource | null = null;
  private spotifySource: SpotifySource | null = null;

  /**
   * Obtient l'instance unique du service audio
   */
  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * Configure l'audio pour fonctionner en arrière-plan
   */
  public async configureAudioForBackground(): Promise<void> {
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
   * Joue une station de radio
   * @param radioUrl URL de la station de radio
   * @param radioName Nom de la station
   * @returns Succès de l'opération
   * @deprecated Utilisez plutôt RadioSource
   */
  public async playRadio(radioUrl: string, radioName: string = 'Radio'): Promise<boolean> {
    try {
      // Arrêter toute lecture en cours
      await this.stopSound();
      
      // Créer et utiliser une source radio
      this.radioSource = new RadioSource(radioUrl, radioName);
      return await this.radioSource.play();
    } catch (error) {
      console.error('Erreur lors de la lecture de la radio:', error);
      return false;
    }
  }

  /**
   * Joue une playlist Spotify
   * @param playlistUri URI de la playlist Spotify
   * @param playlistName Nom de la playlist
   * @returns Succès de l'opération
   * @deprecated Utilisez plutôt SpotifySource
   */
  public async playSpotifyPlaylist(playlistUri: string, playlistName: string = 'Playlist Spotify'): Promise<boolean> {
    try {
      // Arrêter toute lecture en cours
      await this.stopSound();
      
      // Créer et utiliser une source Spotify
      this.spotifySource = new SpotifySource(playlistUri, playlistName);
      return await this.spotifySource.play();
    } catch (error) {
      console.error('Erreur lors de la lecture de la playlist Spotify:', error);
      return false;
    }
  }

  /**
   * Prévisualise une station de radio
   * @param radioUrl URL de la station de radio
   * @param radioName Nom de la station
   * @returns Succès de l'opération
   * @deprecated Utilisez plutôt RadioSource
   */
  public async previewRadio(radioUrl: string, radioName: string = 'Radio'): Promise<boolean> {
    try {
      // Arrêter toute prévisualisation en cours
      await this.stopPreview();
      
      // Charger et jouer la radio
      const { sound } = await Audio.Sound.createAsync(
        { uri: radioUrl },
        { shouldPlay: true, isLooping: false }
      );
      
      this.previewSound = sound;
      
      console.log(`Prévisualisation de la radio: ${radioName}`);
      return true;
    } catch (error) {
      console.error('Erreur lors de la prévisualisation de la radio:', error);
      return false;
    }
  }

  /**
   * Arrête la prévisualisation
   * @returns Succès de l'opération
   */
  public async stopPreview(): Promise<boolean> {
    try {
      if (this.previewSound) {
        await this.previewSound.stopAsync();
        await this.previewSound.unloadAsync();
        this.previewSound = null;
      }
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la prévisualisation:', error);
      return false;
    }
  }

  /**
   * Arrête toute lecture audio
   * @returns Succès de l'opération
   */
  public async stopSound(): Promise<boolean> {
    try {
      // Arrêter la surveillance de la lecture
      if (this.playbackMonitoringInterval) {
        clearInterval(this.playbackMonitoringInterval);
        this.playbackMonitoringInterval = null;
      }
      
      // Arrêter la source Spotify si elle est active
      if (this.spotifySource) {
        await this.spotifySource.stop();
        this.spotifySource = null;
      }
      
      // Arrêter la source radio si elle est active
      if (this.radioSource) {
        await this.radioSource.stop();
        this.radioSource = null;
      }
      
      // Arrêter la lecture audio si elle est active
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la lecture audio:', error);
      return false;
    }
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
            console.log('La lecture s\'est arrêtée, tentative de reprise...');
            await this.sound.playAsync();
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
    this.stopSound();
    this.stopPreview();
  }
}

// Exporter une instance unique du service audio
export const audioService = AudioService.getInstance(); 