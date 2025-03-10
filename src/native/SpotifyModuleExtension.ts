import { NativeModules, Platform } from 'react-native';

interface SpotifyPlayerModule {
  playUri(uri: string): Promise<boolean>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  isPlaying(): Promise<boolean>;
  seekTo(positionMs: number): Promise<void>;
  stop(): Promise<void>;
  getPlaybackPosition(): Promise<number>;
}

// Ce module sera implémenté nativement côté iOS et Android
const NativeSpotifyPlayerModule = NativeModules.SpotifyPlayerModule as SpotifyPlayerModule | undefined;

class SpotifyPlayerExtension {
  private static instance: SpotifyPlayerExtension;

  public isAvailable = !!NativeSpotifyPlayerModule;

  private constructor() {}

  public static getInstance(): SpotifyPlayerExtension {
    if (!SpotifyPlayerExtension.instance) {
      SpotifyPlayerExtension.instance = new SpotifyPlayerExtension();
    }
    return SpotifyPlayerExtension.instance;
  }

  /**
   * Joue une URI Spotify (piste, album, playlist)
   */
  public async playUri(uri: string): Promise<boolean> {
    if (!this.isAvailable) {
      console.warn('Module Spotify Player non disponible');
      return false;
    }

    try {
      return await NativeSpotifyPlayerModule!.playUri(uri);
    } catch (error) {
      console.error('Erreur lors de la lecture de l\'URI Spotify:', error);
      return false;
    }
  }

  /**
   * Met en pause la lecture en cours
   */
  public async pause(): Promise<boolean> {
    if (!this.isAvailable) {
      console.warn('Module Spotify Player non disponible');
      return false;
    }

    try {
      await NativeSpotifyPlayerModule!.pause();
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise en pause:', error);
      return false;
    }
  }

  /**
   * Reprend la lecture en cours
   */
  public async resume(): Promise<boolean> {
    if (!this.isAvailable) {
      console.warn('Module Spotify Player non disponible');
      return false;
    }

    try {
      await NativeSpotifyPlayerModule!.resume();
      return true;
    } catch (error) {
      console.error('Erreur lors de la reprise de la lecture:', error);
      return false;
    }
  }

  /**
   * Vérifie si la lecture est en cours
   */
  public async isPlaying(): Promise<boolean> {
    if (!this.isAvailable) {
      console.warn('Module Spotify Player non disponible');
      return false;
    }

    try {
      return await NativeSpotifyPlayerModule!.isPlaying();
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'état de lecture:', error);
      return false;
    }
  }

  /**
   * Arrête la lecture en cours
   */
  public async stop(): Promise<boolean> {
    if (!this.isAvailable) {
      console.warn('Module Spotify Player non disponible');
      return false;
    }

    try {
      await NativeSpotifyPlayerModule!.stop();
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la lecture:', error);
      return false;
    }
  }

  /**
   * Se positionne à un moment précis de la piste
   */
  public async seekTo(positionMs: number): Promise<boolean> {
    if (!this.isAvailable) {
      console.warn('Module Spotify Player non disponible');
      return false;
    }

    try {
      await NativeSpotifyPlayerModule!.seekTo(positionMs);
      return true;
    } catch (error) {
      console.error('Erreur lors du positionnement:', error);
      return false;
    }
  }

  /**
   * Obtient la position actuelle de lecture
   */
  public async getPlaybackPosition(): Promise<number> {
    if (!this.isAvailable) {
      console.warn('Module Spotify Player non disponible');
      return 0;
    }

    try {
      return await NativeSpotifyPlayerModule!.getPlaybackPosition();
    } catch (error) {
      console.error('Erreur lors de l\'obtention de la position de lecture:', error);
      return 0;
    }
  }
}

export default SpotifyPlayerExtension.getInstance(); 