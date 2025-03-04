import { RadioStation, Country, Tag } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorManager } from './ErrorManager';

// Clés pour le stockage en cache
const CACHE_KEYS = {
  COUNTRIES: '@aurora_wake_countries',
  TAGS: '@aurora_wake_tags',
};

// Durée de validité du cache (24 heures en millisecondes)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Liste des serveurs API disponibles
const API_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://fr1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
];

// Sélection aléatoire d'un serveur API
const getRandomServer = (): string => {
  const randomIndex = Math.floor(Math.random() * API_SERVERS.length);
  return API_SERVERS[randomIndex];
};

// Clé pour stocker le serveur actuel
const CURRENT_SERVER_KEY = '@aurora_wake_current_server';

// Configuration de base pour les requêtes
const baseHeaders = {
  'User-Agent': 'AuroraWake/1.0',
  'Content-Type': 'application/json',
};

class RadioService {
  private baseUrl: string;
  private cachedCountries: Country[] | null = null;
  private cachedTags: Tag[] | null = null;
  private cacheTimestamp: {
    countries: number;
    tags: number;
  } = {
    countries: 0,
    tags: 0,
  };
  private serverFailures: Record<string, number> = {};

  constructor() {
    this.baseUrl = getRandomServer();
    this.loadCachedData();
    this.loadLastWorkingServer();
  }

  // Charger le dernier serveur fonctionnel
  private async loadLastWorkingServer(): Promise<void> {
    try {
      const lastServer = await AsyncStorage.getItem(CURRENT_SERVER_KEY);
      if (lastServer && API_SERVERS.includes(lastServer)) {
        this.baseUrl = lastServer;
        console.log(`Utilisation du dernier serveur fonctionnel: ${this.baseUrl}`);
      }
    } catch (error) {
      // Ignorer les erreurs et utiliser le serveur aléatoire par défaut
    }
  }

  // Sauvegarder le serveur actuel s'il fonctionne bien
  private async saveCurrentServer(): Promise<void> {
    try {
      await AsyncStorage.setItem(CURRENT_SERVER_KEY, this.baseUrl);
    } catch (error) {
      // Ignorer les erreurs de sauvegarde
    }
  }

  // Méthode pour changer de serveur API si nécessaire
  public changeServer(): string {
    // Incrémenter le compteur d'échecs pour le serveur actuel
    this.serverFailures[this.baseUrl] = (this.serverFailures[this.baseUrl] || 0) + 1;
    
    // Filtrer les serveurs qui ont échoué trop souvent (plus de 3 fois)
    const availableServers = API_SERVERS.filter(
      server => (this.serverFailures[server] || 0) < 3
    );
    
    // Si tous les serveurs ont échoué trop souvent, réinitialiser les compteurs
    if (availableServers.length === 0) {
      Object.keys(this.serverFailures).forEach(key => {
        this.serverFailures[key] = 0;
      });
      
      // Utiliser tous les serveurs à nouveau
      let newServer = getRandomServer();
      while (newServer === this.baseUrl && API_SERVERS.length > 1) {
        newServer = getRandomServer();
      }
      this.baseUrl = newServer;
    } else {
      // Choisir un serveur parmi ceux qui n'ont pas échoué trop souvent
      const randomIndex = Math.floor(Math.random() * availableServers.length);
      const newServer = availableServers[randomIndex];
      
      // Ne pas choisir le même serveur si possible
      if (newServer === this.baseUrl && availableServers.length > 1) {
        const nextIndex = (randomIndex + 1) % availableServers.length;
        this.baseUrl = availableServers[nextIndex];
      } else {
        this.baseUrl = newServer;
      }
    }
    
    errorManager.logError(`Changement de serveur API vers ${this.baseUrl}`, 'info');
    return this.baseUrl;
  }

  // Charger les données en cache au démarrage
  private async loadCachedData(): Promise<void> {
    try {
      // Charger les pays en cache
      const countriesData = await AsyncStorage.getItem(CACHE_KEYS.COUNTRIES);
      if (countriesData) {
        const { data, timestamp } = JSON.parse(countriesData);
        this.cachedCountries = data;
        this.cacheTimestamp.countries = timestamp;
      }

      // Charger les tags en cache
      const tagsData = await AsyncStorage.getItem(CACHE_KEYS.TAGS);
      if (tagsData) {
        const { data, timestamp } = JSON.parse(tagsData);
        this.cachedTags = data;
        this.cacheTimestamp.tags = timestamp;
      }
    } catch (error) {
      errorManager.logError('Erreur lors du chargement des données en cache', 'warning', { error });
    }
  }

  // Récupérer la liste des stations avec filtres optionnels et retentatives
  public async getStations(params: {
    country?: string;
    tag?: string;
    name?: string;
    limit?: number;
    offset?: number;
    hidebroken?: boolean;
    countrycode?: string;
    tagList?: string;
    order?: string;
    reverse?: boolean;
  }, retryCount = 0): Promise<RadioStation[]> {
    try {
      const queryParams = new URLSearchParams();
      console.log("STEP 1: Préparation des paramètres", params);
      
      // Vérifier si le pays est vide et le gérer correctement
      if (params.country !== undefined && params.country.trim() === '') {
        console.log("Pays vide détecté, utilisation des stations populaires à la place");
        // Si le pays est vide, on peut retourner des stations populaires ou supprimer ce paramètre
        delete params.country;
      }
      
      // Ajout des paramètres à la requête
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      console.log("STEP 2: Paramètres URL", queryParams.toString());
      
      // Toujours masquer les stations cassées par défaut
      if (params.hidebroken === undefined) {
        queryParams.append('hidebroken', 'true');
      }
      
      // Limiter le nombre de résultats par défaut
      if (!params.limit) {
        queryParams.append('limit', '20');
      }
      
      // Définir l'ordre par défaut si non spécifié
      if (!params.order) {
        queryParams.append('order', 'votes');
        if (params.reverse === undefined) {
          queryParams.append('reverse', 'true');
        }
      }
      
      const url = `${this.baseUrl}/json/stations/search?${queryParams.toString()}`;
      console.log("STEP 3: URL complète", url);
      
      try {
        // Utiliser un timeout pour éviter les requêtes qui prennent trop de temps
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes de timeout
        
        const response = await fetch(url, { 
          headers: baseHeaders,
          signal: controller.signal
        });
        
        // Nettoyer le timeout
        clearTimeout(timeoutId);
        
        console.log("STEP 4: Réponse reçue", {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        });
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("STEP 5: Nombre de stations reçues", data.length);
        
        // Réinitialiser le compteur d'échecs pour ce serveur car il fonctionne
        this.serverFailures[this.baseUrl] = 0;
        
        // Sauvegarder ce serveur comme fonctionnel
        this.saveCurrentServer();
        
        // Vérifier et normaliser les données des stations
        const normalizedData = data.map((station: any) => {
          // S'assurer que tags est toujours un tableau ou une chaîne
          if (station.tags === null || station.tags === undefined) {
            station.tags = '';
          }
          
          return station;
        });
        
        console.log("STEP 6: Données normalisées", {
          sampleStation: normalizedData.length > 0 ? {
            name: normalizedData[0].name,
            tagsType: typeof normalizedData[0].tags,
            tagsIsArray: Array.isArray(normalizedData[0].tags),
            tagsLength: normalizedData[0].tags ? (Array.isArray(normalizedData[0].tags) ? normalizedData[0].tags.length : 1) : 0
          } : 'Aucune station'
        });
        
        return normalizedData as RadioStation[];
      } catch (error: unknown) {
        // Vérifier si c'est une erreur de timeout
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        console.error(`Erreur réseau lors de la requête: ${isTimeout ? 'Timeout' : error instanceof Error ? error.message : 'Erreur inconnue'}`);
        
        // Si c'est une erreur réseau et que nous avons déjà essayé plusieurs serveurs
        if (retryCount >= API_SERVERS.length) {
          // Retourner un tableau vide plutôt que de planter l'application
          console.log("Trop de tentatives échouées, retour d'un tableau vide");
          return [];
        }
        
        // Changer de serveur et réessayer
        const newServer = this.changeServer();
        console.log(`Changement de serveur vers ${newServer} et nouvelle tentative`);
        
        // Attendre un court délai avant de réessayer pour éviter de surcharger le réseau
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return this.getStations(params, retryCount + 1);
      }
    } catch (error: unknown) {
      errorManager.logError('Erreur lors de la récupération des stations', 'error', { 
        error: error instanceof Error ? error.message : 'Erreur inconnue', 
        params, 
        retryCount 
      });
      
      // Changer de serveur
      this.changeServer();
      
      // Réessayer jusqu'à ce qu'on ait essayé tous les serveurs
      if (retryCount < API_SERVERS.length) {
        // Attendre un court délai avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.getStations(params, retryCount + 1);
      }
      
      // En dernier recours, retourner un tableau vide plutôt que de planter l'application
      console.log("Échec de toutes les tentatives, retour d'un tableau vide");
      return [];
    }
  }

  // Rechercher des stations avec des critères multiples et pagination
  public async searchStationsAdvanced(options: {
    name?: string;
    country?: string;
    countrycode?: string;
    tag?: string;
    tagList?: string[];
    limit?: number;
    offset?: number;
    order?: 'name' | 'votes' | 'clickcount' | 'clicktrend' | 'random' | 'bitrate';
    reverse?: boolean;
    hidebroken?: boolean;
  }): Promise<RadioStation[]> {
    const params: any = { ...options };
    
    // Convertir tagList en chaîne si c'est un tableau
    if (options.tagList && Array.isArray(options.tagList) && options.tagList.length > 0) {
      params.tagList = options.tagList.join(',');
    }
    
    // Définir hidebroken à true par défaut
    if (params.hidebroken === undefined) {
      params.hidebroken = true;
    }
    
    return this.getStations(params);
  }

  // Rechercher des stations par nom
  public async searchStationsByName(name: string, limit = 20, offset = 0, order = 'votes', reverse = true): Promise<RadioStation[]> {
    return this.getStations({ 
      name, 
      limit, 
      offset, 
      order, 
      reverse,
      hidebroken: true 
    });
  }

  // Récupérer les stations par pays
  public async getStationsByCountry(country: string, limit = 20, offset = 0, order = 'votes', reverse = true): Promise<RadioStation[]> {
    return this.getStations({ 
      country, 
      limit, 
      offset, 
      order, 
      reverse,
      hidebroken: true 
    });
  }

  // Récupérer les stations par tag (genre)
  public async getStationsByTag(tag: string, limit = 20, offset = 0, order = 'votes', reverse = true): Promise<RadioStation[]> {
    return this.getStations({ 
      tag, 
      limit, 
      offset, 
      order, 
      reverse,
      hidebroken: true 
    });
  }

  // Récupérer la liste des pays disponibles avec mise en cache
  public async getCountries(): Promise<Country[]> {
    // Vérifier si les données en cache sont valides
    if (this.cachedCountries && (Date.now() - this.cacheTimestamp.countries < CACHE_DURATION)) {
      console.log('Données en cache utilisées');
      return this.cachedCountries;
    }
    console.log('Données en cache non utilisées');
    try {
      const response = await fetch(`${this.baseUrl}/json/countries`, {
        headers: baseHeaders,
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      this.cachedCountries = data as Country[];
      this.cacheTimestamp.countries = Date.now();
      
      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem(CACHE_KEYS.COUNTRIES, JSON.stringify({
        data: this.cachedCountries,
        timestamp: this.cacheTimestamp.countries,
      }));
      
      return this.cachedCountries;
    } catch (error) {
      errorManager.logError('Erreur lors de la récupération des pays', 'error', { error });
      
      // Si nous avons des données en cache, les utiliser même si elles sont périmées
      if (this.cachedCountries) {
        return this.cachedCountries;
      }
      
      this.changeServer();
      throw error;
    }
  }

  // Récupérer la liste des tags (genres) disponibles avec mise en cache
  public async getTags(): Promise<Tag[]> {
    // Vérifier si les données en cache sont valides
    if (this.cachedTags && (Date.now() - this.cacheTimestamp.tags < CACHE_DURATION)) {
      return this.cachedTags;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/json/tags`, {
        headers: baseHeaders,
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      this.cachedTags = data as Tag[];
      this.cacheTimestamp.tags = Date.now();
      
      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem(CACHE_KEYS.TAGS, JSON.stringify({
        data: this.cachedTags,
        timestamp: this.cacheTimestamp.tags,
      }));
      
      return this.cachedTags;
    } catch (error) {
      errorManager.logError('Erreur lors de la récupération des tags', 'error', { error });
      
      // Si nous avons des données en cache, les utiliser même si elles sont périmées
      if (this.cachedTags) {
        return this.cachedTags;
      }
      
      this.changeServer();
      throw error;
    }
  }
}

// Exporter une instance unique du service
export const radioService = new RadioService(); 