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
  'https://nl.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

// Sélection aléatoire d'un serveur API
const getRandomServer = (): string => {
  const randomIndex = Math.floor(Math.random() * API_SERVERS.length);
  return API_SERVERS[randomIndex];
};

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

  constructor() {
    this.baseUrl = getRandomServer();
    this.loadCachedData();
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

  // Méthode pour changer de serveur API si nécessaire
  public changeServer(): void {
    let newServer = getRandomServer();
    while (newServer === this.baseUrl && API_SERVERS.length > 1) {
      newServer = getRandomServer();
    }
    this.baseUrl = newServer;
    errorManager.logError(`Changement de serveur API vers ${this.baseUrl}`, 'info');
  }

  // Récupérer la liste des stations avec filtres optionnels et retentatives
  public async getStations(params: {
    country?: string;
    tag?: string;
    name?: string;
    limit?: number;
    offset?: number;
    hidebroken?: boolean;
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
        queryParams.append('limit', '100');
      }
      
      const url = `${this.baseUrl}/json/stations/search?${queryParams.toString()}`;
      console.log("STEP 3: URL complète", url);
      
      try {
        const response = await fetch(url, { 
          headers: baseHeaders
        });
        
        console.log("STEP 4: Réponse reçue", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("STEP 5: Nombre de stations reçues", data.length);
        
        // Vérifier et normaliser les données des stations
        const normalizedData = data.map((station: any) => {
          // S'assurer que tags est toujours un tableau
          if (!station.tags || typeof station.tags === 'string') {
            console.log(`Station ${station.name}: tags est ${typeof station.tags}`, station.tags);
            // Si tags est une chaîne, la diviser en tableau
            if (typeof station.tags === 'string') {
              station.tags = station.tags.split(',').map((tag: string) => tag.trim());
            } else {
              station.tags = [];
            }
          }
          return station;
        });
        
        console.log("STEP 6: Données normalisées", {
          sampleStation: normalizedData.length > 0 ? {
            name: normalizedData[0].name,
            tagsType: typeof normalizedData[0].tags,
            tagsIsArray: Array.isArray(normalizedData[0].tags),
            tagsLength: normalizedData[0].tags ? normalizedData[0].tags.length : 0
          } : 'Aucune station'
        });
        
        return normalizedData as RadioStation[];
      } catch (networkError) {
        console.error("Erreur réseau lors de la requête:", networkError);
        
        // Si c'est une erreur réseau et que nous avons déjà essayé plusieurs serveurs
        if (retryCount >= 2) {
          // Retourner un tableau vide plutôt que de planter l'application
          console.log("Trop de tentatives échouées, retour d'un tableau vide");
          return [];
        }
        
        // Changer de serveur et réessayer
        this.changeServer();
        console.log(`Changement de serveur vers ${this.baseUrl} et nouvelle tentative`);
        return this.getStations(params, retryCount + 1);
      }
    } catch (error) {
      errorManager.logError('Erreur lors de la récupération des stations', 'error', { 
        error, 
        params, 
        retryCount 
      });
      
      // Changer de serveur
      this.changeServer();
      
      // Réessayer jusqu'à 3 fois maximum
      if (retryCount < 2) {
        return this.getStations(params, retryCount + 1);
      }
      
      // En dernier recours, retourner un tableau vide plutôt que de planter l'application
      console.log("Échec de toutes les tentatives, retour d'un tableau vide");
      return [];
    }
  }

  // Rechercher des stations par nom
  public async searchStationsByName(name: string, limit = 30): Promise<RadioStation[]> {
    return this.getStations({ name, limit });
  }

  // Récupérer les stations par pays
  public async getStationsByCountry(country: string, limit = 30): Promise<RadioStation[]> {
    return this.getStations({ country, limit });
  }

  // Récupérer les stations par tag (genre)
  public async getStationsByTag(tag: string, limit = 30): Promise<RadioStation[]> {
    return this.getStations({ tag, limit });
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