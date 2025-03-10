// Suppression des importations de react-native-spotify-remote
let auth: any = null;
let remote: any = null;
let spotifyModulesLoaded = false;

try {
  // Nous n'utilisons plus react-native-spotify-remote
  spotifyModulesLoaded = false;
  console.log('Module Spotify Remote non utilisé');
} catch (error: any) {
  console.warn('Erreur:', error.message);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { SpotifyAuthConfig, SpotifyTokens, SpotifyConnectionInfo } from '../types/spotify';

// Clés de stockage dans AsyncStorage
const SPOTIFY_ACCESS_TOKEN_KEY = 'spotify_access_token';
const SPOTIFY_REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const SPOTIFY_EXPIRATION_KEY = 'spotify_expiration';

// Configuration par défaut pour Spotify
const defaultConfig: SpotifyAuthConfig = {
  clientId: '39d474184067408497b09fad92b1c0fa',
  tokenRefreshUrl: 'https://europe-west1-rhythmee-spotify-auth.cloudfunctions.net/refreshSpotifyToken',
  tokenSwapUrl: 'https://europe-west1-rhythmee-spotify-auth.cloudfunctions.net/swapSpotifyToken',
  redirectUrl: Platform.select({
    ios: 'rhythmee://spotify-auth-callback',
    android: 'rhythmee://spotify-auth-callback',
  }) || 'rhythmee://spotify-auth-callback',
  scopes: [
    'user-read-private',
    'playlist-read-private',
    'user-modify-playback-state',
    'streaming'
  ],
};

// Vérifier si la redirection est correctement configurée
const checkSpotifyRedirectConfig = () => {
  console.log('URL de redirection Spotify configurée:', defaultConfig.redirectUrl);
  
  // Vérifier que l'URL est dans le bon format
  if (!defaultConfig.redirectUrl.includes('://')) {
    console.error('URL de redirection mal formatée:', defaultConfig.redirectUrl);
    return false;
  }
  
  // Vérifier le scheme spécifique à iOS
  if (Platform.OS === 'ios' && !defaultConfig.redirectUrl.startsWith('rhythmee://')) {
    console.warn('Sur iOS, le scheme devrait commencer par rhythmee://', defaultConfig.redirectUrl);
  }
  
  return true;
};

// Initialiser la vérification de la redirection
checkSpotifyRedirectConfig();

// Vérifier si les modules Spotify sont disponibles
const isSpotifySDKAvailable = () => {
  return false; // react-native-spotify-remote n'est plus disponible
};

class SpotifyAuthService {
  private isInitialized = false;
  private connectionInfo: SpotifyConnectionInfo = {
    isConnected: false,
    isSpotifyInstalled: false,
    isPremium: false
  };
  private config: SpotifyAuthConfig = defaultConfig;

  /**
   * Initialise le SDK Spotify
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Vérifier si les modules Spotify sont disponibles
      if (!isSpotifySDKAvailable()) {
        console.warn('Les modules Spotify ne sont pas disponibles dans cet environnement.');
        
        // Debug info
        if (Platform.OS === 'ios') {
          // Sur un appareil réel, essayons de forcer l'initialisation
          try {
            // Nous n'utilisons plus react-native-spotify-remote
            console.log('Tentative forcée de charger Spotify: false');
          } catch (error: any) {
            console.error('Erreur lors de la tentative forcée:', error.message);
          }
        }
        
        return false;
      }

      console.log('SDK Spotify disponible, initialisation...');
      
      // Sur iOS, nous supposons que Spotify est installé 
      // La vérification isSpotifyInstalled n'est pas fiable dans ce SDK
      this.connectionInfo.isSpotifyInstalled = true;
      
      try {
        // Initialiser avec la configuration
        console.log('Tentative d\'initialisation avec config:', this.config.clientId);
        const configToUse = {
          clientID: this.config.clientId,
          redirectURL: this.config.redirectUrl,
          tokenRefreshURL: this.config.tokenRefreshUrl,
          tokenSwapURL: this.config.tokenSwapUrl,
          scopes: this.config.scopes,
        };
        
        console.log('Configuration d\'initialisation complète:', JSON.stringify(configToUse));
        
        // Vérifier si l'URL de redirection est bien configurée
        if (!this.config.redirectUrl.includes('://')) {
          console.error('URL de redirection mal formatée, cela peut causer des problèmes');
        }
        
        // Ajouter un timeout pour l'initialisation, mais plus long (15 secondes)
        const initPromise = auth.initialize(configToUse);
        const timeoutPromise = new Promise<any>((_, reject) => {
          setTimeout(() => reject(new Error('Initialisation timeout - vérifiez votre connexion')), 15000);
        });
        
        // Race entre l'initialisation et le timeout
        const result = await Promise.race([initPromise, timeoutPromise]);
        console.log('Initialisation réussie:', result);
        
        // Restaurer les tokens si disponibles
        await this.restoreAccessToken();
        
        this.isInitialized = true;
        return true;
      } catch (error: any) {
        console.error('Erreur lors de l\'initialisation de Spotify:', error.message);
        
        // Information de debug supplémentaire
        if (error.message.includes('clientID cannot be null')) {
          console.error('Configuration invalide. ClientID manquant:', this.config);
        } else if (error.message.includes('timeout')) {
          console.error('Timeout lors de l\'initialisation Spotify');
          console.log('Vérifiez que l\'application Spotify est installée et que vous avez accepté l\'autorisation');
        } else if (error.message.includes('cancelled')) {
          console.error('L\'utilisateur a annulé l\'authentification Spotify');
        }
        
        // On définit explicitement l'état comme non initialisé
        this.isInitialized = false;
        
        Alert.alert(
          'Erreur Spotify',
          'Impossible d\'initialiser Spotify. ' + 
          (error.message.includes('timeout') ? 
            'Délai dépassé. Vérifiez que vous avez accepté l\'autorisation dans l\'app Spotify.' : 
            (error.message.includes('cancelled') ? 
              'Vous avez annulé l\'autorisation Spotify.' :
              'Veuillez vérifier votre connexion et réessayer.'))
        );
        return false;
      }
    } catch (error: any) {
      console.error('Erreur globale lors de l\'initialisation de Spotify:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Authentifie l'utilisateur avec Spotify
   */
  async authorize(): Promise<boolean> {
    try {
      // Vérifier si les modules Spotify sont disponibles avant d'essayer d'autoriser
      if (!isSpotifySDKAvailable() || auth === null) {
        console.warn('Les modules Spotify ne sont pas disponibles dans cet environnement Release');
        
        // En mode Release, on simule une connexion réussie pour éviter le crash
        if (!__DEV__) {
          console.log('Mode Release détecté, simulation de connexion Spotify pour éviter le crash');
          // Mettre à jour les états internes sans réelle connexion
          this.connectionInfo.isConnected = false;
          return false;
        }
        
        return false;
      }
      
      if (!this.isInitialized) {
        console.log('Service non initialisé, tentative d\'initialisation...');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Échec de l\'initialisation');
          return false;
        }
      }
      
      try {
        console.log('Tentative d\'authentification Spotify');
        
        // Vérifier que la configuration contient bien un clientID
        if (!this.config.clientId) {
          console.error('ClientID manquant dans la configuration');
          Alert.alert(
            'Erreur de configuration',
            'La configuration Spotify est incomplète. Veuillez contacter le support.'
          );
          return false;
        }
        
        // Adapter la configuration pour correspondre au format attendu
        const apiConfig = {
          clientID: this.config.clientId,
          redirectURL: this.config.redirectUrl,
          tokenRefreshURL: this.config.tokenRefreshUrl,
          tokenSwapURL: this.config.tokenSwapUrl,
          scopes: this.config.scopes,
        };
        
        console.log('Configuration API Spotify:', JSON.stringify(apiConfig));
        
        // Appel à la méthode d'authentification
        const res = await auth.authorize(apiConfig);
        console.log('Authentification réussie:', !!res.accessToken);
        
        if (!res.accessToken) {
          console.error('Token d\'accès non reçu après authentification');
          return false;
        }
        
        // Sauvegarder les tokens
        await this.saveTokens({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken, 
          expirationDate: Date.now() + (res.expiresIn ? parseInt(res.expiresIn) : 3600) * 1000
        });

        // Connecter au service distant Spotify
        await this.connectRemote();
        
        return true;
      } catch (error: any) {
        console.error('Erreur lors de l\'authentification Spotify:', error.message);
        
        // Gérer les erreurs spécifiques
        if (error.message && (
          error.message.includes('clientID cannot be null') || 
          error.message.includes('client') && error.message.includes('null')
        )) {
          console.error('Erreur de configuration ClientID:', this.config);
          Alert.alert(
            'Erreur de configuration',
            'La configuration Spotify est incorrecte. Veuillez contacter le support.'
          );
        } else if (error.message && error.message.includes('Spotify app is not installed')) {
          Alert.alert(
            'Spotify non installé',
            'Veuillez installer l\'application Spotify depuis l\'App Store pour utiliser cette fonctionnalité.'
          );
        } else {
          Alert.alert(
            'Erreur d\'authentification',
            'Impossible de se connecter à Spotify. Veuillez réessayer.'
          );
        }
        
        return false;
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'authentification Spotify:', error.message);
      return false;
    }
  }

  /**
   * Déconnecte l'utilisateur de Spotify
   */
  async logout(): Promise<void> {
    try {
      if (!isSpotifySDKAvailable()) {
        await this.clearTokens();
        return;
      }

      await remote.disconnect();
      try {
        await auth.endSession();
      } catch (error) {
        console.log('Erreur ignorée lors de la fin de session:', error);
      }
      await this.clearTokens();
      
      this.connectionInfo.isConnected = false;
      this.connectionInfo.isPremium = false;
    } catch (error) {
      console.error('Erreur lors de la déconnexion de Spotify:', error);
    }
  }

  /**
   * Connecte l'application au service distant Spotify
   */
  private async connectRemote(): Promise<void> {
    try {
      console.log('Démarrage de la connexion au service distant Spotify...');
      if (!isSpotifySDKAvailable()) {
        console.warn('SDK Spotify non disponible, impossible de connecter au remote');
        return;
      }

      const token = await this.getAccessToken();
      if (!token) {
        console.error('Aucun token disponible pour la connexion remote');
        throw new Error('No token available');
      }

      console.log('Tentative de connexion au service distant Spotify avec token');
      try {
        // Sur iOS, nous supposons que Spotify est installé
        // La vérification isSpotifyInstalled n'est pas disponible dans cette version du SDK
        this.connectionInfo.isSpotifyInstalled = true;
        
        // Ajout d'un timeout pour la connexion
        const connectPromise = remote.connect(token);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connexion timeout - application Spotify peut-être non installée')), 5000);
        });
        
        // Race entre la connexion et le timeout
        await Promise.race([connectPromise, timeoutPromise]);
        
        console.log('Connexion au service distant Spotify réussie');
        this.connectionInfo.isConnected = true;
  
        // Nous supposons que l'utilisateur a un compte premium
        // Certaines API pour vérifier cela ne sont pas fiables sur toutes les versions du SDK
        this.connectionInfo.isPremium = true;
        console.log('État de connexion mis à jour:', this.connectionInfo);
      } catch (error: any) {
        console.error('Erreur lors de la connexion au service distant:', error.message);
        
        // Si nous avons une erreur spécifique sur l'application Spotify
        if (error.message && (
          error.message.includes('Spotify app is not installed') || 
          error.message.includes('No spotify installed') ||
          error.message.includes('timeout')
        )) {
          console.warn('Application Spotify non installée détectée via erreur');
          Alert.alert(
            'Spotify non installé',
            'Veuillez installer l\'application Spotify depuis l\'App Store pour utiliser cette fonctionnalité.'
          );
          this.connectionInfo.isSpotifyInstalled = false;
        } else if (error.message && (
          error.message.includes('premium') || 
          error.message.includes('subscription')
        )) {
          // Si l'erreur indique un problème d'abonnement
          console.warn('Utilisateur sans compte Premium détecté via erreur');
          this.connectionInfo.isPremium = false;
          Alert.alert(
            'Compte Premium requis',
            'Un compte Spotify Premium est nécessaire pour utiliser cette fonctionnalité.'
          );
        } else {
          // Pour toute autre erreur, on considère qu'on est connecté à Spotify
          // mais que nous n'avons pas pu établir la connexion remote
          console.log('Erreur non spécifique, on suppose connecté à Spotify mais sans remote');
          this.connectionInfo.isConnected = true;
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la connexion au service distant Spotify:', error.message);
      this.connectionInfo.isConnected = false;
    }
  }

  /**
   * Vérifie si l'utilisateur a un token d'accès valide
   */
  async hasValidToken(): Promise<boolean> {
    try {
      const expiration = await AsyncStorage.getItem(SPOTIFY_EXPIRATION_KEY);
      const token = await AsyncStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
      
      if (!token || !expiration) return false;
      
      // Vérifier si le token est expiré (avec 5 minutes de marge)
      const expirationTime = parseInt(expiration, 10);
      const isValid = expirationTime > Date.now() + (5 * 60 * 1000);
      
      return isValid;
    } catch (error) {
      console.error('Erreur lors de la vérification de la validité du token:', error);
      return false;
    }
  }

  /**
   * Récupère le token d'accès actuel
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Erreur lors de la récupération du token d\'accès:', error);
      return null;
    }
  }

  /**
   * Sauvegarde les tokens d'authentification
   */
  private async saveTokens(tokens: SpotifyTokens): Promise<void> {
    try {
      await AsyncStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, tokens.accessToken);
      if (tokens.refreshToken) {
        await AsyncStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
      await AsyncStorage.setItem(SPOTIFY_EXPIRATION_KEY, tokens.expirationDate.toString());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des tokens:', error);
    }
  }

  /**
   * Restaure le token d'accès à partir du stockage
   */
  private async restoreAccessToken(): Promise<void> {
    try {
      const accessToken = await AsyncStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(SPOTIFY_REFRESH_TOKEN_KEY);
      const expiration = await AsyncStorage.getItem(SPOTIFY_EXPIRATION_KEY);

      if (accessToken && expiration) {
        const expirationTime = parseInt(expiration, 10);
        
        // Si le token est expiré, essayer de le rafraîchir
        if (expirationTime <= Date.now() && refreshToken) {
          // La logique de rafraîchissement du token serait ici
          // mais elle nécessite un backend, donc on va simplement demander 
          // à l'utilisateur de se reconnecter
          return;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la restauration du token d\'accès:', error);
    }
  }

  /**
   * Efface les tokens stockés
   */
  private async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(SPOTIFY_REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(SPOTIFY_EXPIRATION_KEY);
    } catch (error) {
      console.error('Erreur lors de la suppression des tokens:', error);
    }
  }

  /**
   * Obtient les informations sur la connexion Spotify
   */
  getConnectionInfo(): SpotifyConnectionInfo {
    return { ...this.connectionInfo };
  }

  /**
   * Réinitialise complètement la connexion Spotify et tente une nouvelle authentification
   * Utile en cas de problèmes de connexion persistants
   */
  async resetAndReconnect(): Promise<boolean> {
    try {
      console.log('Réinitialisation de la connexion Spotify...');
      
      // Réinitialiser les états
      this.isInitialized = false;
      this.connectionInfo = {
        isConnected: false,
        isSpotifyInstalled: false,
        isPremium: false
      };
      
      // Effacer les tokens existants
      await this.clearTokens();
      
      // Si les modules ne sont pas disponibles, retourner immédiatement
      if (!isSpotifySDKAvailable()) {
        console.warn('Les modules Spotify ne sont pas disponibles dans cet environnement.');
        return false;
      }
      
      // Essayer de déconnecter la session existante
      try {
        console.log('Tentative de déconnexion de la session existante...');
        await remote.disconnect();
        try {
          await auth.endSession();
        } catch (sessionError) {
          console.log('Erreur ignorée lors de la fin de session:', sessionError);
        }
      } catch (disconnectError) {
        console.log('Erreur ignorée lors de la déconnexion:', disconnectError);
        // On continue malgré cette erreur
      }
      
      // Attendre un court instant pour s'assurer que tout est déconnecté
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Réinitialiser le module Spotify (lorsque possible)
      try {
        if (Platform.OS === 'ios') {
          console.log('Tentative de recharger le module Spotify...');
          // Nous n'utilisons plus react-native-spotify-remote
          console.log('Module Spotify rechargé: false');
        }
      } catch (reloadError) {
        console.warn('Erreur lors du rechargement du module:', reloadError);
      }
      
      // Réinitialiser et tenter une nouvelle connexion
      console.log('Tentative de réinitialisation complète...');
      const initialized = await this.initialize();
      if (!initialized) {
        console.error('Échec de la réinitialisation - Impossible d\'initialiser Spotify');
        return false;
      }
      
      // Tenter une nouvelle authentification avec des logs détaillés
      console.log('Tentative d\'authentification après réinitialisation...');
      const authResult = await this.authorize();
      console.log('Résultat de l\'authentification après réinitialisation:', authResult);
      
      return authResult;
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation de Spotify:', error.message);
      Alert.alert(
        'Erreur de réinitialisation',
        'La tentative de réinitialisation a échoué. Veuillez réessayer plus tard.'
      );
      return false;
    }
  }

  /**
   * Teste la configuration Spotify sans tenter de se connecter
   * Utile pour diagnostiquer les problèmes de configuration
   */
  async testConfiguration(): Promise<string> {
    try {
      console.log('Test de la configuration Spotify...');
      
      // Vérifier si les modules sont chargés
      if (!isSpotifySDKAvailable()) {
        return 'Modules Spotify non disponibles';
      }
      
      // Vérifier la configuration
      const configTest = {
        clientID: this.config.clientId,
        redirectURL: this.config.redirectUrl,
        tokenSwapURL: this.config.tokenSwapUrl,
        tokenRefreshURL: this.config.tokenRefreshUrl,
        scopes: this.config.scopes,
      };
      
      console.log('Configuration à tester:', JSON.stringify(configTest));
      
      // Vérifier la redirection URL
      if (!this.config.redirectUrl.includes('://')) {
        return 'URL de redirection mal formatée';
      }
      
      // Vérifier le client ID
      if (!this.config.clientId) {
        return 'Client ID manquant';
      }
      
      // Vérifier si l'app Spotify est installée
      // Note: Cette méthode n'est pas fiable dans toutes les versions du SDK
      try {
        const isSpotifyInstalled = this.connectionInfo.isSpotifyInstalled;
        if (!isSpotifyInstalled) {
          return 'Spotify ne semble pas être installé';
        }
      } catch (error) {
        console.warn('Impossible de vérifier si Spotify est installé');
      }
      
      return 'Configuration correcte';
    } catch (error: any) {
      console.error('Erreur lors du test de configuration:', error.message);
      return `Erreur: ${error.message}`;
    }
  }

  /**
   * Renvoie la configuration Spotify actuelle
   */
  getConfig(): SpotifyAuthConfig {
    return this.config;
  }
}

export default new SpotifyAuthService(); 