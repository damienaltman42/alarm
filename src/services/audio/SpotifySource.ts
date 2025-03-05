import { AudioSource } from './AudioSource';
import SpotifyService from '../SpotifyService';
import { Alert } from 'react-native';

/**
 * Source audio pour Spotify
 * Gère la lecture des playlists Spotify via SpotifyService
 */
export class SpotifySource implements AudioSource {
  private playlistUri: string;
  private playlistName: string;
  private isPlaying: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  /**
   * Crée une nouvelle source audio de type Spotify
   * @param playlistUri URI de la playlist Spotify
   * @param playlistName Nom de la playlist
   */
  constructor(playlistUri: string, playlistName: string) {
    this.playlistUri = playlistUri;
    this.playlistName = playlistName;
  }

  /**
   * Démarre la lecture de la playlist Spotify
   * @returns Succès de l'opération
   */
  public async play(): Promise<boolean> {
    try {
      // Arrêter toute lecture en cours
      await this.stop();
      
      // Réinitialiser le compteur de tentatives
      this.retryCount = 0;
      
      return await this.attemptPlay();
    } catch (error) {
      console.error('Erreur lors de la lecture de la playlist Spotify:', error);
      return false;
    }
  }

  /**
   * Tente de jouer la playlist avec possibilité de réessayer
   * @returns Succès de l'opération
   */
  private async attemptPlay(): Promise<boolean> {
    try {
      // Tenter de jouer la playlist
      const success = await SpotifyService.playPlaylist(this.playlistUri);
      
      if (success) {
        this.isPlaying = true;
        console.log(`Lecture de la playlist Spotify: ${this.playlistName}`);
        return true;
      } else {
        // Si la lecture a échoué mais que nous n'avons pas atteint le nombre maximum de tentatives
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`Tentative ${this.retryCount}/${this.maxRetries} de lecture Spotify...`);
          
          // Attendre un peu avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 1000));
          return await this.attemptPlay();
        }
        
        console.error('Impossible de lire la playlist Spotify après plusieurs tentatives.');
        Alert.alert(
          'Erreur Spotify',
          'Impossible de lire la playlist Spotify. Vérifiez que Spotify est installé et que vous êtes connecté.'
        );
        return false;
      }
    } catch (error: any) {
      // Gérer spécifiquement l'erreur "Player is not ready"
      if (error.message && error.message.includes('not ready')) {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`Lecteur Spotify non prêt. Tentative ${this.retryCount}/${this.maxRetries}...`);
          
          // Attendre un peu plus longtemps avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 2000));
          return await this.attemptPlay();
        }
        
        console.error('Le lecteur Spotify n\'est pas prêt après plusieurs tentatives.');
        Alert.alert(
          'Erreur Spotify',
          'Le lecteur Spotify n\'est pas prêt. Veuillez ouvrir l\'application Spotify et réessayer.'
        );
      }
      
      console.error('Erreur lors de la lecture de la playlist Spotify:', error);
      return false;
    }
  }

  /**
   * Arrête la lecture de la playlist Spotify
   * @returns Succès de l'opération
   */
  public async stop(): Promise<boolean> {
    try {
      if (this.isPlaying) {
        try {
          await SpotifyService.pausePlayback();
          this.isPlaying = false;
          return true;
        } catch (error: any) {
          // Gérer spécifiquement l'erreur "Player is not ready"
          if (error.message && error.message.includes('not ready')) {
            console.warn('Le lecteur Spotify n\'est pas prêt pour arrêter la lecture.');
          } else {
            console.warn('Erreur lors de l\'arrêt de Spotify:', error);
          }
          
          // Même en cas d'erreur, on considère que la lecture est arrêtée
          this.isPlaying = false;
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de Spotify:', error);
      return false;
    }
  }

  /**
   * Obtient le nom de la playlist Spotify
   * @returns Nom de la playlist
   */
  public getName(): string {
    return this.playlistName;
  }

  /**
   * Nettoie les ressources
   */
  public cleanup(): void {
    this.stop();
  }
} 