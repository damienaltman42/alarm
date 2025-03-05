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
      console.log('Tentative de lecture de playlist:', playlistUri);
      
      if (!isSpotifyRemoteAvailable()) {
        console.error('Le module Spotify Remote n\'est pas disponible');
        
        // Tentative forcée de charger le module en mode natif
        if (Platform.OS === 'ios') {
          console.log('Tentative forcée de charger Spotify Remote sur iOS...');
          try {
            const spotifyRemote = require('react-native-spotify-remote');
            const forceRemote = spotifyRemote.remote;
            console.log('Module Spotify Remote chargé:', !!forceRemote);
            
            if (forceRemote) {
              console.log('Vérification de la connexion Spotify...');
              const connectionInfo = SpotifyAuthService.getConnectionInfo();
              
              if (!connectionInfo.isConnected) {
                console.log('Non connecté à Spotify, tentative d\'authentification...');
                const connected = await SpotifyAuthService.authorize();
                if (!connected) {
                  console.error('Échec de la connexion à Spotify');
                  Alert.alert(
                    'Erreur Spotify',
                    'Impossible de se connecter à Spotify. Veuillez réessayer ou réinitialiser la connexion.'
                  );
                  return false;
                }
                console.log('Connexion à Spotify réussie');
              } else {
                console.log('Déjà connecté à Spotify');
              }
              
              console.log('Tentative de lecture avec forceRemote...');
              try {
                const result = await forceRemote.playUri(playlistUri);
                console.log('Lecture forcée réussie:', result);
                return true;
              } catch (playError: any) {
                console.error('Erreur lors de la lecture forcée:', playError.message);
                
                // Si la lecture échoue, essayons de réinitialiser Spotify
                if (playError.message && (
                  playError.message.includes('not logged in') || 
                  playError.message.includes('token') ||
                  playError.message.includes('session')
                )) {
                  Alert.alert(
                    'Session Spotify expirée',
                    'Votre session Spotify a expiré. Souhaitez-vous réinitialiser la connexion?',
                    [
                      {
                        text: 'Annuler',
                        style: 'cancel'
                      },
                      {
                        text: 'Réinitialiser',
                        onPress: async () => {
                          const reset = await SpotifyAuthService.resetAndReconnect();
                          if (reset) {
                            this.playPlaylist(playlistUri);
                          }
                        }
                      }
                    ]
                  );
                  return false;
                }
                
                throw playError;
              }
            }
          } catch (e: any) {
            console.error('Échec de la tentative forcée:', e.message);
          }
        }
        
        Alert.alert(
          'Spotify non disponible',
          'Le service Spotify n\'est pas disponible sur cet appareil ou cette build.'
        );
        return false;
      }

      console.log('Vérification de la connexion avant lecture...');
      const connectionInfo = SpotifyAuthService.getConnectionInfo();
      if (!connectionInfo.isConnected) {
        console.log('Non connecté à Spotify, tentative d\'authentification...');
        const connected = await SpotifyAuthService.authorize();
        if (!connected) {
          console.error('Impossible de se connecter à Spotify');
          return false;
        }
        console.log('Connexion à Spotify réussie');
      } else {
        console.log('Déjà connecté à Spotify');
      }

      // Vérifier si l'utilisateur a un compte premium
      const connectionStatus = SpotifyAuthService.getConnectionInfo();
      if (!connectionStatus.isPremium) {
        Alert.alert(
          'Compte Spotify Premium requis',
          'Un compte Spotify Premium est nécessaire pour utiliser cette fonctionnalité.'
        );
        return false;
      }

      console.log('Tentative de lecture de la playlist:', playlistUri);
      await remote.playUri(playlistUri);
      console.log('Lecture de la playlist démarrée avec succès');
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la lecture de la playlist:', error.message);
      
      // Afficher un message d'erreur spécifique si possible
      let errorMessage = 'Impossible de lire la playlist. Vérifiez que l\'application Spotify est installée et que vous êtes connecté.';
      
      if (error.message) {
        if (error.message.includes('not installed')) {
          errorMessage = 'L\'application Spotify n\'est pas installée sur votre appareil. Veuillez l\'installer depuis l\'App Store.';
        } else if (error.message.includes('token') || error.message.includes('session')) {
          errorMessage = 'Votre session Spotify a expiré. Veuillez vous reconnecter.';
          
          // Proposer une réinitialisation
          Alert.alert(
            'Session Spotify expirée',
            'Votre session Spotify a expiré. Souhaitez-vous réinitialiser la connexion?',
            [
              {
                text: 'Annuler',
                style: 'cancel'
              },
              {
                text: 'Réinitialiser',
                onPress: async () => {
                  const reset = await SpotifyAuthService.resetAndReconnect();
                  if (reset) {
                    this.playPlaylist(playlistUri);
                  }
                }
              }
            ]
          );
          return false;
        }
      }
      
      Alert.alert(
        'Erreur de lecture',
        errorMessage
      );
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
      console.error('Erreur lors de la mise en pause:', error.message);
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