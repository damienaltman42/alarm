import SpotifyWebApi from 'spotify-web-api-js';
// Suppression des importations de react-native-spotify-remote
let spotifyModulesLoaded = false;

try {
  spotifyModulesLoaded = true;
  console.log('Module Spotify Remote non utilisé');
} catch (error: any) {
  console.warn('Erreur:', error.message);
}

import { Alert, Platform, Linking } from 'react-native';
import SpotifyAuthService from './SpotifyAuthService';
import { SpotifyPlaylist } from '../types/spotify';
import axios, { AxiosRequestConfig } from 'axios';
import { Audio } from 'expo-av';
import * as ApplicationModule from 'expo-application';

// Interface pour un appareil Spotify
interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
  supports_volume: boolean;
}

// Mise à jour de la fonction de vérification de disponibilité
const isSpotifyRemoteAvailable = () => {
  return false; // react-native-spotify-remote n'est plus disponible
};

class SpotifyService {
  private spotifyApi: SpotifyWebApi.SpotifyWebApiJs;
  private isInitialized = false;
  private baseUrl = 'https://api.spotify.com/v1';
  private previewSound: Audio.Sound | null = null;
  private currentPreviewUrl: string | null = null;

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
      
      return response.items.map((item: any) => ({
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
   * Recherche des playlists par nom
   */
  async searchPlaylists(query: string): Promise<SpotifyPlaylist[]> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.warn('Impossible d\'initialiser le service Spotify');
          return [];
        }
      }
      
      console.log('Recherche de playlists pour:', query);
      const response = await this.spotifyApi.searchPlaylists(query, { limit: 20 });
      console.log(`${response.playlists.items.length} playlists trouvées`);
      
      return response.playlists.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        uri: item.uri,
        owner: {
          display_name: item.owner.display_name || 'Inconnu'
        },
        images: item.images,
        description: item.description || undefined
      }));
    } catch (error: any) {
      console.error('Erreur lors de la recherche de playlists:', error.message);
      return [];
    }
  }

  /**
   * Ouvre l'application Spotify avec une URI spécifique
   * Utilise plusieurs méthodes différentes pour maximiser les chances de succès
   */
  public async openSpotifyWithPlaylist(uri: string): Promise<boolean> {
    try {
      console.log('👉 Tentative d\'ouverture directe avec URI:', uri);
      
      // S'assurer que l'URI est au bon format
      // Format standard: spotify:playlist:1234567890
      let spotifyUri = uri;
      
      // Si c'est juste un ID, le formater en URI complète
      if (uri.match(/^[a-zA-Z0-9]{22}$/)) {
        spotifyUri = `spotify:playlist:${uri}`;
        console.log('🔄 Conversion d\'ID en URI:', spotifyUri);
      } else if (!uri.startsWith('spotify:')) {
        spotifyUri = `spotify:${uri}`;
        console.log('🔄 Ajout du préfixe spotify:', spotifyUri);
      }
      
      // Format URI web est différent
      // Format standard: https://open.spotify.com/playlist/1234567890
      const webUri = spotifyUri.replace('spotify:', 'https://open.spotify.com/').replace(':', '/');
      
      // Format pour une ouverture directe dans l'app Spotify
      // Format standard: spotify://playlist/1234567890
      const directUri = spotifyUri.replace('spotify:', 'spotify://').replace(':', '/');
      
      // Format alternatif: intent://spotify/playlist/123456...
      const intentUri = `intent://spotify/${spotifyUri.replace('spotify:', '').replace(':', '/')}#Intent;scheme=spotify;package=com.spotify.music;end`;
      
      console.log('📱 URI Spotify:', spotifyUri);
      console.log('🌐 URI Web:', webUri);
      console.log('📱 URI Direct:', directUri);
      console.log('🔗 URI Intent:', intentUri);
      
      // Tentative méthode 1: URI spotify: standard
      try {
        const canOpen = await Linking.canOpenURL(spotifyUri);
        if (canOpen) {
          console.log('✅ Ouverture avec URI Spotify standard');
          await Linking.openURL(spotifyUri);
          return true;
        } else {
          console.log('❌ Impossible d\'ouvrir avec l\'URI standard');
        }
      } catch (error) {
        console.log('❌ Erreur URI standard:', error);
      }
      
      // Tentative méthode 2: URI spotify:// direct
      try {
        const canOpenDirect = await Linking.canOpenURL(directUri);
        if (canOpenDirect) {
          console.log('✅ Ouverture avec URI direct');
          await Linking.openURL(directUri);
          return true;
        } else {
          console.log('❌ Impossible d\'ouvrir avec l\'URI direct');
        }
      } catch (error) {
        console.log('❌ Erreur URI direct:', error);
      }
      
      // Tentative méthode 3: URI intent:// (surtout utile sur Android)
      if (Platform.OS === 'android') {
        try {
          const canOpenIntent = await Linking.canOpenURL(intentUri);
          if (canOpenIntent) {
            console.log('✅ Ouverture avec URI intent');
            await Linking.openURL(intentUri);
            return true;
          } else {
            console.log('❌ Impossible d\'ouvrir avec l\'URI intent');
          }
        } catch (error) {
          console.log('❌ Erreur URI intent:', error);
        }
      }
      
      // Méthode 5 (dernier recours): Ouvrir dans le navigateur
      try {
        console.log('✅ Tentative d\'ouverture dans le navigateur:', webUri);
        await Linking.openURL(webUri);
        return true;
      } catch (error) {
        console.log('❌ Erreur ouverture web:', error);
        
        // Si même l'URL web échoue, essayer d'ouvrir le site Spotify
        try {
          await Linking.openURL('https://open.spotify.com');
          return true;
        } catch (finalError) {
          console.log('❌ Erreur finale:', finalError);
          return false;
        }
      }
    } catch (error) {
      console.error('⚠️ Erreur globale lors de l\'ouverture de Spotify:', error);
      return false;
    }
  }

  /**
   * Récupère un token d'accès valide avec gestion automatique du refresh
   * @returns Token d'accès valide ou null en cas d'échec
   */
  private async getValidAccessToken(): Promise<string | null> {
    try {
      // Vérifier si nous avons un token valide
      const hasToken = await SpotifyAuthService.hasValidToken();
      
      if (hasToken) {
        // Récupérer le token
        const token = await SpotifyAuthService.getAccessToken();
        return token;
      } else {
        console.log('Token expiré détecté, tentative de reconnexion...');
        
        // Tenter de se reconnecter
        const reconnected = await SpotifyAuthService.resetAndReconnect();
        
        if (reconnected) {
          console.log('Reconnexion réussie, récupération du nouveau token');
          // Récupérer le nouveau token
          const newToken = await SpotifyAuthService.getAccessToken();
          return newToken;
        } else {
          console.warn('Échec de la reconnexion à Spotify');
          return null;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du token d\'accès:', error);
      return null;
    }
  }

  /**
   * Effectue un appel API sécurisé avec gestion automatique du token
   * @param method Méthode HTTP
   * @param endpoint Point de terminaison de l'API
   * @param params Paramètres de l'URL
   * @param data Données du corps de la requête
   * @returns Le résultat de l'appel API ou null en cas d'erreur
   */
  private async secureApiCall<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    params?: Record<string, any>,
    data?: any
  ): Promise<T | null> {
    try {
      // Obtenir un token d'accès valide
      const accessToken = await this.getValidAccessToken();
      
      if (!accessToken) {
        console.warn('Aucun token d\'accès valide pour l\'appel API');
        return null;
      }
      
      // Construire l'URL avec les paramètres
      let url = `${this.baseUrl}${endpoint}`;
      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          queryParams.append(key, String(value));
        });
        
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
      
      // Configuration de la requête
      const config: AxiosRequestConfig = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      // Ajouter le corps de la requête si nécessaire
      if (data && (method === 'post' || method === 'put')) {
        config.data = data;
      }
      
      // Afficher des informations sur l'appel
      console.log(`Appel API Spotify: ${method.toUpperCase()} ${url}`);
      
      // Effectuer la requête
      const response = await axios(config);
      
      // Si la réponse est 204 No Content, retourner un objet vide
      if (response.status === 204) {
        return {} as T;
      }
      
      return response.data;
    } catch (error: any) {
      // Log détaillé des erreurs
      if (error.response) {
        // Erreur avec réponse du serveur
        console.error(`Erreur lors de l'appel API ${endpoint}: ${error.response.status} ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // Pas de réponse du serveur
        console.error(`Aucune réponse du serveur pour l'appel API ${endpoint}: ${error.message}`);
      } else {
        // Autre erreur
        console.error(`Erreur lors de la configuration de l'appel API ${endpoint}: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Récupère tous les appareils Spotify disponibles
   * Avec une tentative d'activation des appareils si aucun n'est trouvé
   */
  public async getAvailableDevices(): Promise<SpotifyDevice[]> {
    try {
      // Appeler l'API de manière sécurisée
      const response = await this.secureApiCall<{ devices: SpotifyDevice[] }>('get', '/me/player/devices');
      
      // Si on n'a pas de réponse ou pas d'appareils, retourner un tableau vide
      if (!response || !response.devices || response.devices.length === 0) {
        console.warn('Aucun appareil retourné par l\'API Spotify');
        
        // Tentative de "réveil" des appareils
        try {
          console.log('Tentative de réveil des appareils Spotify...');
          
          // Méthode 1: Tentative d'obtenir l'état actuel du lecteur
          try {
            await this.secureApiCall<any>('get', '/me/player');
            console.log('État du lecteur récupéré, peut réveiller les appareils');
          } catch (playerError) {
            console.log('Impossible de récupérer l\'état du lecteur:', playerError);
          }
          
          // Méthode 2: Tentative de récupérer les playlists récemment jouées
          try {
            await this.secureApiCall<any>('get', '/me/player/recently-played', { limit: 1 });
            console.log('Playlists récemment jouées récupérées');
          } catch (recentError) {
            console.log('Impossible de récupérer les playlists récentes:', recentError);
          }
          
          // Attendre un peu pour que le réveil prenne effet
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Réessayer d'obtenir les appareils
          const retryResponse = await this.secureApiCall<{ devices: SpotifyDevice[] }>('get', '/me/player/devices');
          
          if (retryResponse && retryResponse.devices && retryResponse.devices.length > 0) {
            console.log(`✅ Réveil réussi! ${retryResponse.devices.length} appareil(s) trouvé(s)`);
            const availableDevices = retryResponse.devices.filter(device => !device.is_restricted);
            
            if (availableDevices.length > 0) {
              console.log(`${availableDevices.length} appareil(s) disponible(s)`);
              console.log(`Premier appareil: ${availableDevices[0].name} (${availableDevices[0].type})`);
            }
            
            return availableDevices;
          } else {
            console.warn('Aucun appareil trouvé même après tentative de réveil');
            return [];
          }
        } catch (wakeupError) {
          console.warn('Erreur lors de la tentative de réveil des appareils:', wakeupError);
          return [];
        }
      }
      
      // Filtrer les appareils pour ne garder que ceux qui ne sont pas restreints
      const availableDevices = response.devices.filter(device => !device.is_restricted);
      
      if (availableDevices.length === 0 && response.devices.length > 0) {
        console.warn(`${response.devices.length} appareil(s) trouvé(s) mais tous sont restreints`);
      } else if (availableDevices.length > 0) {
        console.log(`${availableDevices.length} appareil(s) disponible(s)`);
        // Log du premier appareil à titre d'information
        console.log(`Premier appareil: ${availableDevices[0].name} (${availableDevices[0].type})`);
      }
      
      return availableDevices;
    } catch (error: any) {
      // Gestion spécifique des erreurs 403 (compte non Premium)
      if (error.response?.status === 403) {
        console.warn('Accès restreint aux appareils (403) - Compte non Premium?');
        return [];
      }
      
      console.error('Erreur lors de la récupération des appareils:', error?.response?.data || error.message);
      return [];
    }
  }

  /**
   * Tente d'activer un appareil Spotify pour le rendre disponible pour la lecture
   * Cette méthode essaie plusieurs approches pour "réveiller" un appareil
   */
  public async activateSpotifyDevice(): Promise<SpotifyDevice | null> {
    console.log('Tentative d\'activation d\'un appareil Spotify...');
    
    try {
      // 1. Récupérer les appareils disponibles
      const devices = await this.getAvailableDevices();
      
      if (devices && devices.length > 0) {
        // Déjà un appareil actif?
        const activeDevice = devices.find((device: SpotifyDevice) => device.is_active);
        if (activeDevice) {
          console.log(`Appareil déjà actif: ${activeDevice.name}`);
          return activeDevice;
        }
        
        // Sinon prendre le premier appareil
        const deviceToActivate = devices[0];
        console.log(`Tentative d'activation de l'appareil: ${deviceToActivate.name}`);
        
        try {
          // Tenter d'activer l'appareil via l'API
          await this.secureApiCall('put', '/me/player', {}, {
            device_ids: [deviceToActivate.id],
            play: false // Ne pas démarrer la lecture
          });
          
          console.log(`✅ Appareil ${deviceToActivate.name} activé avec succès`);
          
          // Attendre que l'appareil soit vraiment activé
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return deviceToActivate;
        } catch (activateError) {
          console.error('Échec de l\'activation de l\'appareil via l\'API:', activateError);
          // Continuer avec d'autres approches
        }
      }
      
      // 2. Si aucun appareil n'est disponible, tenter d'ouvrir et fermer Spotify
      console.log('Aucun appareil disponible, tentative d\'ouverture directe de Spotify');
      
      // Ouvrir Spotify sans URI spécifique
      try {
        const canOpen = await Linking.canOpenURL('spotify:');
        if (canOpen) {
          // Ouvrir Spotify brièvement
          await Linking.openURL('spotify:');
          
          // Attendre un peu
          console.log('Spotify ouvert, attente pour activation...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Revenir à notre application (optionnel si nous voulons rester dans Spotify)
          if (Platform.OS === 'ios') {
            try {
              const bundleId = ApplicationModule.applicationId;
              if (bundleId) {
                await Linking.openURL(`${bundleId}://`);
              }
            } catch (appError) {
              console.warn('Erreur lors de la récupération du bundleId:', appError);
            }
          }
          
          // Vérifier à nouveau les appareils
          console.log('Vérification des appareils après ouverture de Spotify');
          const refreshedDevices = await this.getAvailableDevices();
          
          if (refreshedDevices && refreshedDevices.length > 0) {
            const newActiveDevice = refreshedDevices.find((device: SpotifyDevice) => device.is_active) || refreshedDevices[0];
            console.log(`Appareil trouvé après ouverture: ${newActiveDevice.name}`);
            
            // Tenter d'activer cet appareil
            try {
              await this.secureApiCall('put', '/me/player', {}, {
                device_ids: [newActiveDevice.id],
                play: false
              });
              console.log(`✅ Appareil ${newActiveDevice.name} activé après ouverture de Spotify`);
              return newActiveDevice;
            } catch (finalActivateError) {
              console.error('Échec de l\'activation finale de l\'appareil:', finalActivateError);
            }
            
            return newActiveDevice;
          }
        } else {
          console.warn('Impossible d\'ouvrir Spotify (non installé?)');
        }
      } catch (openError) {
        console.error('Erreur lors de l\'ouverture de Spotify:', openError);
      }
      
      // 3. Dernier recours - essayer de jouer un morceau très court pour activer l'appareil
      console.log('Tentative de réveil final avec une requête à l\'API de lecture récente');
      
      try {
        // Récupérer l'historique de lecture pourrait réveiller le SDK
        await this.secureApiCall<any>('get', '/me/player/recently-played', { limit: 1 });
        
        // Attendre un peu
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Vérifier une dernière fois
        const lastChanceDevices = await this.getAvailableDevices();
        if (lastChanceDevices && lastChanceDevices.length > 0) {
          const lastDevice = lastChanceDevices[0];
          console.log(`✅ Dernier appareil trouvé: ${lastDevice.name}`);
          return lastDevice;
        }
      } catch (lastError) {
        console.error('Échec de la dernière tentative de réveil:', lastError);
      }
      
      console.warn('⚠️ Impossible d\'activer un appareil Spotify, veuillez ouvrir l\'application manuellement');
      return null;
    } catch (error) {
      console.error('Erreur globale lors de l\'activation de l\'appareil:', error);
      return null;
    }
  }

  /**
   * Prévisualise une playlist Spotify 
   * @param playlistId ID de la playlist à prévisualiser
   * @param options Options de lecture (position, position_ms, trackUri)
   * @param forceApiWeb Force l'utilisation de l'API Web, même sans appareil actif
   */
  public async previewPlaylist(
    playlistId: string, 
    options?: { 
      position?: number; 
      position_ms?: number;
      trackUri?: string;
    },
    forceApiWeb?: boolean
  ): Promise<boolean> {
    try {
      console.log(`Préparation de la playlist ${playlistId}`);
      
      // Activer un appareil Spotify avant de tenter la lecture
      if (forceApiWeb) {
        console.log('Mode API Web forcé, tentative d\'activation d\'un appareil Spotify...');
        const device = await this.activateSpotifyDevice();
        
        if (!device) {
          console.warn('Aucun appareil Spotify n\'a pu être activé');
          Alert.alert(
            'Aucun appareil Spotify disponible',
            'Veuillez ouvrir l\'application Spotify et démarrer la lecture manuellement avant d\'utiliser cette fonctionnalité.',
            [{ text: 'OK' }]
          );
          return false;
        }
        
        console.log(`Appareil Spotify activé: ${device.name} (${device.id})`);
      }
      
      // Tenter d'abord de trouver la playlist dans les playlists de l'utilisateur
      try {
        const userPlaylists = await this.getUserPlaylists();
        const playlist = userPlaylists.find((p: SpotifyPlaylist) => p.id === playlistId);
        
        if (playlist) {
          console.log(`Playlist trouvée dans les playlists de l'utilisateur: ${playlist.name}`);
          return this.playPlaylist(playlist, options, false, forceApiWeb);
        }
      } catch (userPlaylistsError) {
        console.warn('Impossible de récupérer les playlists de l\'utilisateur:', userPlaylistsError);
      }
      
      // Si la playlist n'est pas trouvée, tenter avec les recherches récentes
      try {
        // On utilise la méthode simplifiée qui renvoie juste les playlists
        const searchPlaylist = await this.searchPlaylists(playlistId);
        const exactMatch = searchPlaylist.find((p: SpotifyPlaylist) => p.id === playlistId);
        
        if (exactMatch) {
          console.log(`Playlist trouvée par recherche: ${exactMatch.name}`);
          return this.playPlaylist(exactMatch, options, false, forceApiWeb);
        }
      } catch (searchError) {
        console.warn('Recherche de playlist échouée:', searchError);
      }
      
      // Si la playlist n'est toujours pas trouvée, on crée un objet playlist minimal
      console.log('Playlist non trouvée, utilisation directe de l\'ID');
      const minimalPlaylist: SpotifyPlaylist = {
        id: playlistId,
        name: 'Playlist inconnue',
        description: 'Playlist générée via ID',
        uri: `spotify:playlist:${playlistId}`,
        images: [],
        owner: {
          display_name: 'Utilisateur inconnu'
        }
      };
      
      // Lancer la lecture avec l'objet playlist minimal
      return this.playPlaylist(minimalPlaylist, options, false, forceApiWeb);
    } catch (error) {
      console.error('Erreur lors de la prévisualisation de la playlist:', error);
      return false;
    }
  }

  /**
   * Lance la lecture d'une playlist via l'API Web (Premium) ou ouvre directement l'app (Non-Premium)
   * @param playlist La playlist à lire
   * @param options Options supplémentaires (position, position_ms)
   * @param forceDirect Force l'ouverture directe même pour les comptes Premium
   * @param forceApiWeb Force l'utilisation de l'API Web, même sans appareil actif
   */
  public async playPlaylist(
    playlist: SpotifyPlaylist, 
    options?: { 
      position?: number; 
      position_ms?: number;
      trackUri?: string;
    },
    forceDirect?: boolean,
    forceApiWeb?: boolean
  ): Promise<boolean> {
    // Si forceDirect est vrai, ouvrir directement Spotify
    if (forceDirect) {
      return this.openSpotifyWithPlaylist(playlist.uri);
    }
    
    try {
      // Tenter d'activer un appareil Spotify avant de démarrer la lecture
      console.log('Activation d\'un appareil Spotify avant la lecture...');
      const activeDevice = await this.activateSpotifyDevice();
      
      if (!activeDevice) {
        console.warn('Aucun appareil Spotify n\'a pu être activé');
        
        if (forceApiWeb) {
          console.error('Impossible d\'utiliser l\'API Web sans appareil actif');
          Alert.alert(
            'Aucun appareil Spotify disponible',
            'Veuillez ouvrir l\'application Spotify et démarrer la lecture manuellement avant d\'utiliser cette fonctionnalité.',
            [{ text: 'OK' }]
          );
          return false;
        }
        
        // Si on ne force pas l'API Web, on peut ouvrir directement Spotify
        console.log('Passage en mode ouverture directe de Spotify');
        return this.openSpotifyWithPlaylist(playlist.uri);
      }
      
      // S'assurer que l'URI est correctement formatée pour l'API
      const uri = playlist.uri.startsWith('spotify:') ? playlist.uri : `spotify:playlist:${playlist.id}`;
      
      // Configurer les données pour démarrer la lecture selon la documentation officielle
      const data: any = {
        context_uri: uri,
        offset: {
          position: options?.position || 0
        },
        position_ms: options?.position_ms || 0
      };

      // Si un URI de piste spécifique est fourni, l'utiliser comme offset
      if (options?.trackUri) {
        data.offset = {
          uri: options.trackUri
        };
      }

      console.log('Tentative de lecture avec l\'URI:', uri);
      console.log('Sur l\'appareil:', activeDevice.id, activeDevice.name);
      console.log('Payload:', JSON.stringify(data, null, 2));
      
      // Paramètres de l'appel
      const params = { device_id: activeDevice.id };
      
      // Appeler l'API de manière sécurisée
      try {
        await this.secureApiCall('put', '/me/player/play', params, data);
        return true;
      } catch (error: any) {
        // Si une erreur 403 (Premium requis) se produit et qu'on ne force pas l'API Web
        if (error.response?.status === 403 && !forceApiWeb) {
          console.warn('Erreur 403 - Compte Premium requis, passage en mode ouverture directe');
          return this.openSpotifyWithPlaylist(playlist.uri);
        }
        
        // Si on force l'API Web, on ne passe pas à l'ouverture directe
        if (forceApiWeb) {
          console.error('Erreur API Spotify avec forceApiWeb activé:', error?.response?.data || error.message);
          Alert.alert(
            'Erreur Spotify',
            'Impossible de lancer la lecture via l\'API Web. Vérifiez que vous avez un compte Premium et que l\'application Spotify est ouverte.',
            [{ text: 'OK' }]
          );
          return false;
        }
        
        // Pour toute autre erreur API, tenter également l'ouverture directe
        console.error('Erreur API Spotify, passage en mode ouverture directe');
        return this.openSpotifyWithPlaylist(playlist.uri);
      }
    } catch (error: any) {
      console.error('Erreur globale lors du démarrage de la lecture:', error?.response?.data || error.message);
      
      // Si on force l'API Web, on ne passe pas à l'ouverture directe
      if (forceApiWeb) {
        Alert.alert(
          'Erreur Spotify',
          'Une erreur est survenue lors de la tentative de lecture. Veuillez vérifier votre connexion et réessayer.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // Tenter l'ouverture directe de Spotify comme solution de secours finale
      return this.openSpotifyWithPlaylist(playlist.uri);
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

      // Utiliser l'API Web Spotify à la place
      const token = await this.getValidAccessToken();
      if (!token) return false;
      
      await this.secureApiCall('put', '/me/player/pause', {}, {});
      console.log('Lecture mise en pause via API Web');
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

      // Utiliser l'API Web Spotify à la place
      const token = await this.getValidAccessToken();
      if (!token) return false;
      
      await this.secureApiCall('put', '/me/player/play', {}, {});
      console.log('Lecture reprise via API Web');
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la reprise de la lecture:', error.message);
      return false;
    }
  }
}

export default new SpotifyService();