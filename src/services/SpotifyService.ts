import SpotifyWebApi from 'spotify-web-api-js';
// Importation conditionnelle pour éviter les erreurs dans Expo Go
let remote: any = null;
let spotifyModulesLoaded = false;

try {
  const spotifyRemote = require('react-native-spotify-remote');
  remote = spotifyRemote.remote;
  spotifyModulesLoaded = true;
  console.log('Module Spotify Remote chargé avec succès:', !!remote);
} catch (error: any) {
  console.warn('Erreur lors du chargement du module Spotify:', error.message);
}

import { Alert, Platform } from 'react-native';
import SpotifyAuthService from './SpotifyAuthService';
import { SpotifyPlaylist } from '../types/spotify';

// Vérifier si le module remote Spotify est disponible
const isSpotifyRemoteAvailable = () => {
  const result = spotifyModulesLoaded && remote !== null;
  console.log('Vérification disponibilité Spotify Remote:', result);
  return result;
};

class SpotifyService {
  private spotifyApi: SpotifyWebApi.SpotifyWebApiJs;
  private isInitialized = false;

  constructor() {
    this.spotifyApi = new SpotifyWebApi();
  }

  /**
   * Initialise le service Spotify
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('Initialisation du service Spotify...');
      const token = await SpotifyAuthService.getAccessToken();
      
      if (!token) {
        console.warn('Aucun token Spotify disponible');
        return false;
      }
      
      this.spotifyApi.setAccessToken(token);
      this.isInitialized = true;
      console.log('Service Spotify initialisé avec succès');
      return true;
    } catch (error: any) {
      console.error('Erreur lors de l\'initialisation du service Spotify:', error.message);
      return false;
    }
  }

  /**
   * Récupère les playlists de l'utilisateur
   */
  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.warn('Impossible d\'initialiser le service Spotify');
          return [];
        }
      }
      
      console.log('Récupération des playlists utilisateur...');
      const response = await this.spotifyApi.getUserPlaylists();
      console.log(`${response.items.length} playlists récupérées`);
      
      return response.items.map(item => ({
        id: item.id,
        name: item.name,
        uri: item.uri,
        owner: {
          display_name: item.owner.display_name || 'Inconnu' // Valeur par défaut pour éviter undefined
        },
        images: item.images,
        description: item.description || undefined
      }));
    } catch (error: any) {
      console.error('Erreur lors de la récupération des playlists:', error.message);
      return [];
    }
  }

  /**
   * Joue une playlist Spotify
   */
  async playPlaylist(playlistUri: string): Promise<boolean> {
    try {
      console.log('+++++++++++++++here stop SpotifySource +++++++++++++++++++++++');
      console.log('Tentative de lecture de playlist:', playlistUri);
      
      if (!isSpotifyRemoteAvailable()) {
        console.error('Le module Spotify Remote n\'est pas disponible');
        return false;
      }
      
      // Vérifier d'abord si nous avons un token valide
      console.log('Vérification de la connexion avant lecture...');
      const hasToken = await SpotifyAuthService.hasValidToken();
      
      // Si nous avons un token valide, nous pouvons tenter la lecture directement
      if (hasToken) {
        try {
          console.log('Token valide trouvé, tentative de lecture directe...');
          
          // Réinitialiser si nécessaire
          await this.initialize();
          
          // Tenter de jouer directement avec notre token
          const token = await SpotifyAuthService.getAccessToken();
          if (!token) {
            console.error('Aucun token d\'accès disponible pour la lecture');
            return false;
          }
          
          // Forcer l'état Premium pour éviter les blocages
          // Dans un contexte d'alarme, on considère que l'utilisateur est Premium
          // si nous avons un token valide
          console.log('Définition forcée du statut Premium (token valide trouvé)');
          SpotifyAuthService.forceSetPremiumStatus(true);
          
          // Tenter la lecture avec remote directement
          try {
            console.log('Tentative de lecture directe via remote...');
            await remote.playUri(playlistUri);
            console.log('Lecture démarrée avec succès via remote');
            return true;
          } catch (remoteError: any) {
            console.warn('Erreur lors de la lecture via remote:', remoteError);
            
            // Si l'erreur contient "not installed" ou "premium", on ignore et on continue
            if (remoteError.message && 
               (remoteError.message.includes('not installed') || 
                remoteError.message.includes('premium') ||
                remoteError.message.includes('install'))) {
              console.log('Erreur de vérification Spotify ignorée, tentative alternative...');
              
              // Utiliser l'API Spotify Web comme solution de secours
              try {
                await this.spotifyApi.play({
                  context_uri: playlistUri,
                });
                console.log('Lecture démarrée via l\'API Web Spotify');
                return true;
              } catch (webApiError) {
                console.warn('Erreur également avec l\'API Web Spotify:', webApiError);
                throw webApiError;
              }
            } else {
              throw remoteError;
            }
          }
        } catch (error) {
          console.warn('Erreur lors de la tentative de lecture directe:', error);
          // On continue vers l'approche traditionnelle en dernier recours
        }
      }
      
      // Approche traditionnelle si tout le reste a échoué
      console.log('Tentative d\'approche traditionnelle...');
      await SpotifyAuthService.initialize();
      const connectionInfo = SpotifyAuthService.getConnectionInfo();
      
      // Forcer l'état installé et premium pour éviter les blocages
      // si nous avons un token valide
      if (hasToken) {
        console.log('Statut Premium et installation forcés pour permettre la lecture');
        SpotifyAuthService.forceSetInstallationStatus(true);
        SpotifyAuthService.forceSetPremiumStatus(true);
      }
        
      if (!connectionInfo.isConnected) {
        console.log('Non connecté à Spotify, tentative d\'authentification...');
        const connected = await SpotifyAuthService.resetAndReconnect();
        if (!connected) {
          console.error('Impossible de se connecter à Spotify');
          return false;
        }
      }
      
      // Une fois connecté, tenter de jouer la playlist
      try {
        await remote.playUri(playlistUri);
        console.log('Lecture de la playlist démarrée');
        return true;
      } catch (error) {
        console.error('Erreur lors de la lecture de la playlist:', error);
        return false;
      }
    } catch (error: any) {
      console.error('Erreur lors de la lecture de la playlist:', error.message);
      return false;
    }
  }

  /**
   * Met en pause la lecture
   */
  async pausePlayback(): Promise<boolean> {
    try {
      if (!isSpotifyRemoteAvailable()) {
        console.error('Le module Spotify Remote n\'est pas disponible');
        Alert.alert(
          'Spotify non disponible',
          'Le service Spotify n\'est pas disponible sur cet appareil ou cette build.'
        );
        return false;
      }

      await remote.pause();
      console.log('Lecture mise en pause');
      return true;
    } catch (error: any) {
      console.error('*** Erreur lors de la mise en pause:', error.message);
      return false;
    }
  }

  /**
   * Reprend la lecture
   */
  async resumePlayback(): Promise<boolean> {
    try {
      if (!isSpotifyRemoteAvailable()) {
        console.error('Le module Spotify Remote n\'est pas disponible');
        Alert.alert(
          'Spotify non disponible',
          'Le service Spotify n\'est pas disponible sur cet appareil ou cette build.'
        );
        return false;
      }

      await remote.resume();
      console.log('Lecture reprise');
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la reprise de la lecture:', error.message);
      return false;
    }
  }
}

export default new SpotifyService(); 