// Importations conditionnelles pour éviter les erreurs dans Expo Go
let auth: any = null;
let remote: any = null;
let spotifyModulesLoaded = false;

try {
  const spotifyRemote = require('react-native-spotify-remote');
  auth = spotifyRemote.auth;
  remote = spotifyRemote.remote;
  spotifyModulesLoaded = true;
  console.log('Module Spotify chargé avec succès:', !!auth, !!remote);
} catch (error: any) {
  console.warn('Erreur lors du chargement du module Spotify:', error.message);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, Linking } from 'react-native';
import { SpotifyAuthConfig, SpotifyTokens, SpotifyConnectionInfo } from '../types/spotify';

// Clés de stockage dans AsyncStorage
const SPOTIFY_ACCESS_TOKEN_KEY = 'spotify_access_token';
const SPOTIFY_REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const SPOTIFY_EXPIRATION_KEY = 'spotify_expiration';
// Clé pour stocker la méthode d'authentification
const SPOTIFY_AUTH_METHOD_KEY = 'spotify_auth_method';

// Configuration par défaut pour Spotify
const defaultConfig: SpotifyAuthConfig = {
  clientId: '39d474184067408497b09fad92b1c0fa',
  tokenRefreshUrl: 'https://refreshspotifytoken-cfrizo5ptq-ew.a.run.app',
  tokenSwapUrl: 'https://swapspotifytoken-cfrizo5ptq-ew.a.run.app',
  redirectUrl: Platform.select({
    ios: 'aurorawake://spotify-auth-callback',
    android: 'aurorawake://spotify-auth-callback',
  }) || 'aurorawake://spotify-auth-callback',
  scopes: [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'user-modify-playback-state',
    'streaming'
  ],
};

// URL Spotify pour vérifier si l'application est installée
const SPOTIFY_APP_URL = Platform.select({
  ios: 'spotify:',
  android: 'spotify:',
}) || 'spotify:';

// Vérifier si la redirection est correctement configurée
const checkSpotifyRedirectConfig = () => {
  console.log('URL de redirection Spotify configurée:', defaultConfig.redirectUrl);
  
  // Vérifier que l'URL est dans le bon format
  if (!defaultConfig.redirectUrl.includes('://')) {
    console.error('URL de redirection mal formatée:', defaultConfig.redirectUrl);
    return false;
  }
  
  // Vérifier le scheme spécifique à iOS
  if (Platform.OS === 'ios' && !defaultConfig.redirectUrl.startsWith('aurorawake://')) {
    console.warn('Sur iOS, le scheme devrait commencer par aurorawake://', defaultConfig.redirectUrl);
  }
  
  return true;
};

// Initialiser la vérification de la redirection
checkSpotifyRedirectConfig();

// Vérifier si les modules Spotify sont disponibles
const isSpotifySDKAvailable = () => {
  const result = spotifyModulesLoaded && auth !== null && remote !== null;
  console.log('Vérification disponibilité SDK Spotify:', result);
  return result;
};

// Vérifier si l'application Spotify est installée
const isSpotifyAppInstalled = async (): Promise<boolean> => {
  try {
    console.log('Vérification si Spotify est installé...');
    const canOpen = await Linking.canOpenURL(SPOTIFY_APP_URL);
    console.log('Spotify installé:', canOpen);
    return canOpen;
  } catch (error) {
    console.warn('Erreur lors de la vérification de l\'installation de Spotify:', error);
    return false;
  }
};

// Ouvrir l'application Spotify avant l'authentification
const openSpotifyApp = async (): Promise<boolean> => {
  try {
    console.log('Tentative d\'ouverture de l\'application Spotify...');
    await Linking.openURL(SPOTIFY_APP_URL);
    
    // Attendre un moment pour que Spotify s'ouvre
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Application Spotify ouverte avec succès');
    return true;
  } catch (error) {
    console.warn('Erreur lors de l\'ouverture de Spotify:', error);
    return false;
  }
};

class SpotifyAuthService {
  private isInitialized = false;
  private connectionInfo: SpotifyConnectionInfo = {
    isConnected: false,
    isSpotifyInstalled: false,
    isPremium: false
  };
  private config: SpotifyAuthConfig = defaultConfig;
  // Ajouter un flag pour suivre quelle méthode d'authentification est utilisée
  private isUsingAlternativeAuth = false;

  /**
   * Initialise le SDK Spotify
   */
  async initialize(): Promise<boolean> {
    // Restaurer le flag d'authentification alternative dès le début
    await this.restoreAuthMethod();
    
    // Si nous utilisons l'authentification alternative, considérer comme initialisé
    if (this.isUsingAlternativeAuth) {
      console.log('🔄 Utilisation de l\'authentification alternative, ignorant l\'initialisation du SDK natif');
      this.isInitialized = true;
      
      // Vérifier si nous avons un token valide
      const hasToken = await this.hasValidToken();
      if (hasToken) {
        this.connectionInfo.isConnected = true;
        console.log('Token valide trouvé, utilisation de l\'authentification alternative');
      }
      
      return true;
    }

    if (this.isInitialized) return true;

    try {
      // Vérifier si les modules Spotify sont disponibles
      if (!isSpotifySDKAvailable()) {
        console.warn('Les modules Spotify ne sont pas disponibles dans cet environnement.');
        
        // Debug info
        if (Platform.OS === 'ios') {
          // Sur un appareil réel, essayons de forcer l'initialisation
          try {
            const spotifyRemote = require('react-native-spotify-remote');
            console.log('Tentative forcée de charger Spotify:', !!spotifyRemote.auth, !!spotifyRemote.remote);
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
        } else if (error.message.includes('Code manquant')) {
          console.log('Vérifiez que l\'application Spotify est installée et que vous avez accepté l\'autorisation');
          
          // Si nous avons un token valide, utiliser l'authentification alternative
          const hasToken = await this.hasValidToken();
          if (hasToken) {
            console.log('Token valide trouvé, utilisation de l\'authentification alternative');
            this.isUsingAlternativeAuth = true;
            this.isInitialized = true;
            this.connectionInfo.isConnected = true;
            return true;
          }
        }
        
        return false;
      }
    } catch (error: any) {
      console.error('Erreur globale lors de l\'initialisation de Spotify:', error.message);
      return false;
    }
  }

  /**
   * Authentifie l'utilisateur auprès de Spotify
   */
  async authorize(): Promise<boolean> {
    try {
      // Si nous utilisons déjà l'authentification alternative avec un token valide
      if (this.isUsingAlternativeAuth) {
        const hasToken = await this.hasValidToken();
        if (hasToken) {
          console.log('✅ Déjà authentifié avec la méthode alternative');
          return true;
        }
        // Sinon, essayer d'utiliser la méthode d'authentification alternative
        return await this.authorizeAlternative();
      }

      // Vérifier si le service est initialisé
      if (!this.isInitialized) {
        console.log('Initialisation du service Spotify...');
        await this.initialize();
      }

      // Vérifier si nous disposons déjà d'un token valide
      const hasToken = await this.hasValidToken();
      if (hasToken) {
        console.log('Token valide trouvé, connexion au service distant...');
        await this.connectRemote();
        return true;
      }

      console.log('Tentative d\'authentification Spotify...');
      
      try {
        if (!isSpotifySDKAvailable()) {
          console.error('SDK Spotify non disponible');
          return false;
        }
        
        const apiConfig = {
          clientID: this.config.clientId,
          redirectURL: this.config.redirectUrl,
          tokenSwapURL: this.config.tokenSwapUrl,
          tokenRefreshURL: this.config.tokenRefreshUrl,
          scopes: this.config.scopes,
        };
        
        console.log('Configuration d\'authentification:', JSON.stringify(apiConfig));
        
        // Vérifier que nous pouvons ouvrir l'URL de redirection
        const canOpenURL = await Linking.canOpenURL(apiConfig.redirectURL);
        console.log(`🔍 L'application peut-elle ouvrir l'URL de redirection? ${canOpenURL ? 'Oui' : 'Non'}`);
        
        if (!canOpenURL) {
          console.warn('⚠️ L\'application ne peut pas ouvrir l\'URL de redirection. Le schéma d\'URL peut ne pas être correctement enregistré.');
        }
        
        // Vérifier si l'application Spotify est installée
        const isSpotifyInstalled = await isSpotifyAppInstalled();
        console.log(`🎵 L'application Spotify est-elle installée? ${isSpotifyInstalled ? 'Oui' : 'Non'}`);
        
        if (isSpotifyInstalled) {
          console.log('🚀 Tentative d\'ouverture de l\'application Spotify avant authentification...');
          try {
            // Ouvrir l'application Spotify
            const opened = await openSpotifyApp();
            if (!opened) {
              console.warn('⚠️ Impossible d\'ouvrir l\'application Spotify, mais elle est installée');
            }
          } catch (e) {
            console.error('❌ Erreur lors de l\'ouverture de Spotify:', e);
          }
        } else {
          console.warn('⚠️ L\'application Spotify n\'est pas installée');
          Alert.alert(
            'Spotify non installé',
            'Veuillez installer l\'application Spotify pour utiliser cette fonctionnalité.'
          );
          return false;
        }
        
        // Appel à la méthode d'authentification avec gestion des erreurs améliorée
        console.log('🔐 Lancement de l\'authentification Spotify avec URL de redirection:', apiConfig.redirectURL);
        console.log('🔍 Vérification que les paramètres sont corrects:');
        console.log('  - ClientID:', !!apiConfig.clientID);
        console.log('  - TokenSwapURL:', !!apiConfig.tokenSwapURL);
        console.log('  - TokenRefreshURL:', !!apiConfig.tokenRefreshURL);
        console.log('  - Scopes:', apiConfig.scopes.join(', '));
        
        const res = await auth.authorize(apiConfig);
        console.log('✅ Authentification réussie:', !!res.accessToken);
        
        if (!res.accessToken) {
          console.error('❌ Token d\'accès non reçu après authentification');
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
        console.error('❌ Erreur lors de l\'authentification Spotify:', error.message);
        
        // Vérifier si l'erreur contient "code" pour voir si c'est lié à la redirection
        if (error.message && error.message.includes('code')) {
          console.error('⚠️ Erreur liée au code d\'autorisation. Vérifiez que l\'URL de redirection est correctement enregistrée dans la console développeur Spotify.');
          console.error('⚠️ Vérifiez que l\'URL suivante est bien enregistrée: ' + this.config.redirectUrl);
          
          // Essayer la méthode alternative
          console.log('⚠️ Échec de l\'authentification native, tentative avec la méthode alternative...');
          return await this.authorizeAlternative();
        }
        
        // Gérer les erreurs spécifiques
        if (error.message && (
          error.message.includes('clientID cannot be null') || 
          error.message.includes('client') && error.message.includes('null')
        )) {
          console.error('❌ Erreur de configuration ClientID:', this.config);
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
            'Impossible de se connecter à Spotify. Veuillez réessayer. Erreur: ' + error.message
          );
        }
        
        return false;
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'authentification Spotify:', error.message);
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
   * Vérifie si un token d'accès valide est disponible
   */
  async hasValidToken(): Promise<boolean> {
    try {
      const expiration = await AsyncStorage.getItem(SPOTIFY_EXPIRATION_KEY);
      const token = await AsyncStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
      
      if (!token || !expiration) return false;
      
      // Vérifier si le token est expiré (avec 5 minutes de marge)
      const expirationTime = parseInt(expiration, 10);
      const isValid = expirationTime > Date.now() + (5 * 60 * 1000);
      
      // Si le token est valide, mettre à jour l'état d'authentification
      if (isValid) {
        console.log('Token Spotify valide trouvé');
        
        // Si nous avons un token valide, nous sommes probablement connectés
        // via la méthode alternative (le SDK natif ne stocke pas ses tokens de cette façon)
        this.isUsingAlternativeAuth = true;
        this.connectionInfo.isConnected = true;
        this.isInitialized = true;
        
        // Sauvegarder la méthode pour les prochaines utilisations
        await this.saveAuthMethod();
      }
      
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
      
      // Sauvegarder la méthode d'authentification utilisée
      if (this.isUsingAlternativeAuth) {
        await this.saveAuthMethod();
      }
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
      // Effacer aussi la méthode d'authentification
      await this.clearAuthMethod();
    } catch (error) {
      console.error('Erreur lors de l\'effacement des tokens:', error);
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
      console.log('🔄 Réinitialisation de la connexion Spotify...');
      
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
        console.warn('⚠️ Les modules Spotify ne sont pas disponibles dans cet environnement.');
        return false;
      }
      
      // Essayer de déconnecter la session existante
      try {
        console.log('🔌 Tentative de déconnexion de la session existante...');
        await remote.disconnect();
        try {
          await auth.endSession();
        } catch (sessionError) {
          console.log('ℹ️ Erreur ignorée lors de la fin de session:', sessionError);
        }
      } catch (disconnectError) {
        console.log('ℹ️ Erreur ignorée lors de la déconnexion:', disconnectError);
        // On continue malgré cette erreur
      }
      
      // Attendre un court instant pour s'assurer que tout est déconnecté
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Réinitialiser le module Spotify (lorsque possible)
      try {
        if (Platform.OS === 'ios') {
          console.log('🔄 Tentative de recharger le module Spotify...');
          const spotifyRemote = require('react-native-spotify-remote');
          auth = spotifyRemote.auth; 
          remote = spotifyRemote.remote;
          spotifyModulesLoaded = !!(auth && remote);
          console.log('✅ Module Spotify rechargé:', spotifyModulesLoaded);
        }
      } catch (reloadError) {
        console.warn('⚠️ Erreur lors du rechargement du module:', reloadError);
      }
      
      // Réinitialiser et tenter une nouvelle connexion
      console.log('🔄 Tentative de réinitialisation complète...');
      const initialized = await this.initialize();
      if (!initialized) {
        console.error('❌ Échec de la réinitialisation - Impossible d\'initialiser Spotify');
        return false;
      }
      
      // Vérifier si nous avons déjà un token valide après l'initialisation
      const hasToken = await this.hasValidToken();
      if (hasToken) {
        console.log('✅ Token valide restauré, connexion au service distant...');
        await this.connectRemote();
        return true;
      }
      
      // Tenter une nouvelle authentification avec des logs détaillés
      console.log('🔐 Tentative d\'authentification après réinitialisation...');
      
      // Essayer d'abord l'authentification standard SDK
      console.log('🔍 Essai de l\'authentification standard Spotify...');
      let authResult = await this.authorize();
      
      // Si l'authentification standard échoue, essayer l'alternative
      if (!authResult) {
        console.log('⚠️ Authentification standard échouée, tentative d\'authentification alternative...');
        authResult = await this.authorizeAlternative();
      }
      
      console.log('📊 Résultat de l\'authentification après réinitialisation:', authResult);
      
      return authResult;
    } catch (error: any) {
      console.error('❌ Erreur lors de la réinitialisation de Spotify:', error.message);
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

  /**
   * Traite directement un code d'autorisation Spotify
   * Cette méthode est utile lorsque le code d'autorisation est obtenu via une URL de redirection
   */
  async handleAuthorizationCode(code: string): Promise<boolean> {
    try {
      if (!code) {
        console.error('❌ Code d\'autorisation manquant');
        return false;
      }

      console.log('🔄 Traitement du code d\'autorisation Spotify:', code.substring(0, 5) + '...');
      
      if (!isSpotifySDKAvailable() || auth === null) {
        console.warn('❌ Les modules Spotify ne sont pas disponibles');
        return false;
      }
      
      if (!this.isInitialized) {
        console.log('⚙️ Service non initialisé, tentative d\'initialisation...');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('❌ Échec de l\'initialisation');
          return false;
        }
      }
      
      try {
        // Appeler manuellement le serveur d'échange de tokens
        const tokenSwapUrl = `${this.config.tokenSwapUrl}?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(this.config.redirectUrl)}`;
        console.log('🔄 Envoi de la requête d\'échange de tokens:', tokenSwapUrl);
        
        // Utiliser fetch pour échanger le code contre un token
        const response = await fetch(tokenSwapUrl);
        if (!response.ok) {
          console.error('❌ Erreur lors de l\'échange de tokens:', await response.text());
          return false;
        }
        
        const tokenData = await response.json();
        console.log('✅ Tokens reçus avec succès');
        
        // Sauvegarder les tokens
        await this.saveTokens({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expirationDate: Date.now() + (tokenData.expires_in || 3600) * 1000
        });
        
        // Connecter au service distant Spotify
        await this.connectRemote();
        
        return true;
      } catch (error: any) {
        console.error('❌ Erreur lors du traitement du code d\'autorisation:', error.message);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Erreur globale lors du traitement du code d\'autorisation:', error.message);
      return false;
    }
  }

  /**
   * Méthode alternative d'authentification utilisant directement une URL Spotify
   * Utilise le navigateur système pour l'authentification et intercepte le code via l'URL de redirection
   */
  async authorizeAlternative(): Promise<boolean> {
    try {
      console.log('🔄 Tentative d\'authentification alternative Spotify');
      
      // Générer un état aléatoire pour sécuriser la redirection
      const state = Math.random().toString(36).substring(2, 15);
      
      // Construire l'URL d'authentification
      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.append('client_id', this.config.clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', this.config.redirectUrl);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', this.config.scopes.join(' '));
      
      console.log('🔗 URL d\'authentification construite:', authUrl.toString());
      console.log('🔍 Vérification des paramètres:');
      console.log('  - ClientID:', this.config.clientId);
      console.log('  - RedirectURI:', this.config.redirectUrl);
      console.log('  - Scopes:', this.config.scopes.join(' '));
      
      // Enregistrer un écouteur pour intercepter la redirection
      const authPromise = new Promise<string>((resolve, reject) => {
        const subscription = Linking.addEventListener('url', event => {
          const { url } = event;
          console.log('🔗 URL de redirection reçue:', url);
          
          if (url.includes('spotify-auth-callback')) {
            // Extraire le code et l'état de l'URL
            const code = url.includes('code=') ? url.split('code=')[1].split('&')[0] : null;
            const returnedState = url.includes('state=') ? url.split('state=')[1].split('&')[0] : null;
            
            // Vérifier l'état pour prévenir les attaques CSRF
            if (returnedState !== state) {
              console.error('❌ État de redirection invalide');
              subscription.remove();
              reject(new Error('État de redirection invalide'));
              return;
            }
            
            if (code) {
              console.log('✅ Code d\'autorisation reçu');
              subscription.remove();
              resolve(code);
            } else {
              console.error('❌ Pas de code dans l\'URL de redirection');
              subscription.remove();
              reject(new Error('Pas de code dans l\'URL de redirection'));
            }
          }
        });
        
        // Timeout après 3 minutes
        setTimeout(() => {
          subscription.remove();
          reject(new Error('Timeout lors de l\'authentification Spotify'));
        }, 3 * 60 * 1000);
      });
      
      // Ouvrir l'URL d'authentification dans le navigateur
      console.log('🌐 Ouverture du navigateur pour authentification Spotify:', authUrl.toString());
      await Linking.openURL(authUrl.toString());
      
      // Attendre la redirection avec le code
      const code = await authPromise;
      console.log('🔐 Code d\'autorisation reçu, échange contre token...');
      
      // Échanger le code contre un token
      try {
        // Si nous avons un URL d'échange de token, l'utiliser
        if (this.config.tokenSwapUrl) {
          console.log('📡 Utilisation du service d\'échange de token:', this.config.tokenSwapUrl);
          
          // Construire l'URL avec le code
          const tokenUrl = `${this.config.tokenSwapUrl}?code=${code}`;
          console.log('🔗 URL d\'échange de token:', tokenUrl);
          
          // Faire la requête
          const response = await fetch(tokenUrl);
          if (!response.ok) {
            console.error('❌ Erreur lors de l\'échange du code contre un token:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Détails de l\'erreur:', errorText);
            throw new Error('Erreur lors de l\'échange du code: ' + response.status);
          }
          
          // Récupérer les tokens
          const tokenData = await response.json();
          console.log('✅ Tokens reçus avec succès:', !!tokenData.access_token);
          
          // Sauvegarder les tokens
          if (tokenData.access_token) {
            const expirationDate = Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1000 : 3600 * 1000);
            await this.saveTokens({
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token || '',
              expirationDate: expirationDate
            });
            
            // Marquer que nous utilisons l'authentification alternative
            this.isUsingAlternativeAuth = true;
            
            // Mettre à jour l'état de connexion
            this.connectionInfo.isConnected = true;
            this.isInitialized = true;
            
            // Vérifier le statut premium 
            console.log('🔍 Vérification du statut Premium après authentification réussie...');
            await this.checkPremiumStatus();
            
            return true;
          } else {
            console.error('❌ Tokens non reçus dans la réponse');
            return false;
          }
        } else {
          console.error('❌ URL d\'échange de token non configurée');
          return false;
        }
      } catch (error: any) {
        console.error('❌ Erreur lors de l\'échange du code d\'autorisation:', error.message);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Erreur globale lors de l\'authentification alternative:', error.message);
      return false;
    }
  }

  /**
   * Vérifie si l'utilisateur a un compte Premium en appelant l'API Spotify
   * Cette méthode est plus fiable que la détection via le SDK
   */
  async checkPremiumStatus(): Promise<boolean> {
    try {
      console.log('🔍 Vérification du statut Premium...');
      
      // Vérifier si nous avons un token valide
      const token = await this.getAccessToken();
      if (!token) {
        console.warn('⚠️ Aucun token d\'accès disponible pour vérifier le statut Premium');
        return false;
      }
      
      // Appeler l'API Spotify pour obtenir le profil utilisateur
      console.log('🔄 Appel de l\'API Spotify pour obtenir les infos utilisateur');
      const response = await fetch('https://api.spotify.com/v1/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('❌ Erreur lors de l\'appel à l\'API Spotify:', response.status);
        return false;
      }
      
      const userData = await response.json();
      console.log('✅ Données utilisateur récupérées:', userData.product);
      
      // Vérifier si l'utilisateur a un compte premium
      const isPremium = userData.product === 'premium';
      
      // Mettre à jour l'état interne
      this.connectionInfo.isPremium = isPremium;
      
      if (isPremium) {
        console.log('✅ L\'utilisateur a un compte Premium');
      } else {
        console.log('⚠️ L\'utilisateur n\'a pas de compte Premium (ou information non disponible)');
      }
      
      return isPremium;
    } catch (error: any) {
      console.error('❌ Erreur lors de la vérification du statut Premium:', error.message);
      return false;
    }
  }

  /**
   * Sauvegarde la méthode d'authentification utilisée
   */
  private async saveAuthMethod(): Promise<void> {
    try {
      await AsyncStorage.setItem(SPOTIFY_AUTH_METHOD_KEY, 'alternative');
      console.log('✅ Méthode d\'authentification alternative sauvegardée');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la méthode d\'authentification:', error);
    }
  }

  /**
   * Restaure la méthode d'authentification utilisée
   */
  private async restoreAuthMethod(): Promise<void> {
    try {
      // Vérifier d'abord si nous avons un token valide
      const token = await AsyncStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
      const expiration = await AsyncStorage.getItem(SPOTIFY_EXPIRATION_KEY);
      
      const hasToken = token && expiration && parseInt(expiration, 10) > Date.now();
      
      // Récupérer la méthode d'auth (si elle existe)
      const method = await AsyncStorage.getItem(SPOTIFY_AUTH_METHOD_KEY);
      
      // Si nous avons un token valide mais pas de méthode enregistrée,
      // considérer par défaut que c'est l'authentification alternative
      if (hasToken && !method) {
        this.isUsingAlternativeAuth = true;
        // Sauvegarder cette méthode pour la prochaine fois
        await this.saveAuthMethod();
        console.log('🔄 Token valide trouvé sans méthode d\'authentification, utilisation de la méthode alternative par défaut');
      } else {
        // Sinon utiliser la méthode sauvegardée
        this.isUsingAlternativeAuth = method === 'alternative';
      }
      
      console.log(`🔍 Méthode d'authentification restaurée: ${this.isUsingAlternativeAuth ? 'alternative' : 'native'}`);
      console.log(`🔑 Statut du token: ${hasToken ? 'valide' : 'invalide ou expiré'}`);
    } catch (error) {
      console.error('Erreur lors de la restauration de la méthode d\'authentification:', error);
      this.isUsingAlternativeAuth = false;
    }
  }

  /**
   * Efface la méthode d'authentification sauvegardée
   */
  private async clearAuthMethod(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SPOTIFY_AUTH_METHOD_KEY);
      this.isUsingAlternativeAuth = false;
      console.log('🧹 Méthode d\'authentification effacée');
    } catch (error) {
      console.error('Erreur lors de l\'effacement de la méthode d\'authentification:', error);
    }
  }

  /**
   * Force le statut Premium de l'utilisateur
   * Utilisé pour contourner les vérifications dans les contextes où nous savons que l'utilisateur est Premium
   * ou lorsque nous voulons permettre la lecture malgré les erreurs de vérification
   */
  forceSetPremiumStatus(isPremium: boolean): void {
    console.log(`Statut Premium forcé à: ${isPremium}`);
    this.connectionInfo.isPremium = isPremium;
  }

  /**
   * Force le statut d'installation de l'application Spotify
   * Utilisé pour contourner les vérifications dans les contextes où nous savons que Spotify est installé
   * ou lorsque nous voulons permettre la lecture malgré les erreurs de vérification
   */
  forceSetInstallationStatus(isInstalled: boolean): void {
    console.log(`Statut d'installation Spotify forcé à: ${isInstalled}`);
    this.connectionInfo.isSpotifyInstalled = isInstalled;
  }
}

export default new SpotifyAuthService(); 