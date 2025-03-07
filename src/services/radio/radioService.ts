import { RadioStation, Country, Tag, RadioSearchParams } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { radioFavorites } from './radioFavorites';
import { ErrorService } from '../../utils/errorHandling';

// Clés de cache
const CACHE_KEYS = {
  COUNTRIES: 'radio_countries',
  TAGS: 'radio_tags',
  SEARCH_RESULTS: 'radio_search_results',
};

// Durée de validité du cache en millisecondes (24 heures)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// URL de base de l'API Radio Browser
const API_BASE_URL = 'https://de1.api.radio-browser.info/json';

/**
 * Service de gestion des radios
 * Gère la recherche et le cache des stations de radio
 */
class RadioService {
  /**
   * Recherche des stations de radio
   * @param params Paramètres de recherche
   * @returns Liste des stations trouvées
   */
  public async searchStations(params: RadioSearchParams): Promise<RadioStation[]> {
    try {
      // Construire l'URL de recherche
      let url = `${API_BASE_URL}/stations/search?`;
      
      // Ajouter les paramètres de recherche
      if (params.name) url += `name=${encodeURIComponent(params.name)}&`;
      if (params.country) url += `country=${encodeURIComponent(params.country)}&`;
      if (params.countrycode) url += `countrycode=${encodeURIComponent(params.countrycode)}&`;
      if (params.tag) url += `tag=${encodeURIComponent(params.tag)}&`;
      // Support pour la recherche par plusieurs tags
      if (params.tagList && params.tagList.length > 0) {
        // L'API Radio Browser attend une liste de tags séparés par des virgules
        url += `tagList=${encodeURIComponent(params.tagList.join(','))}&`;
      }
      if (params.limit) url += `limit=${params.limit}&`;
      if (params.hidebroken !== undefined) url += `hidebroken=${params.hidebroken}&`;
      if (params.is_https !== undefined) url += `is_https=${params.is_https}&`;
      if (params.bitrateMin) url += `bitrateMin=${params.bitrateMin}&`;
      // Support pour la pagination
      if (params.offset !== undefined) url += `offset=${params.offset}&`;
      
      // Ajouter les paramètres de tri (par défaut: votes décroissant)
      const order = params.order || 'votes';
      const reverse = params.reverse !== undefined ? params.reverse : true;
      url += `order=${order}&reverse=${reverse}`;
      
      console.log('URL de recherche radio:', url);
      
      // Afficher les paramètres de recherche pour le débogage
      if (params.countrycode) {
        console.log('Code pays ajouté à la recherche:', params.countrycode);
        console.log('Paramètres de recherche:', params);
      }
      
      // Log des tags pour le débogage
      if (params.tagList && params.tagList.length > 0) {
        console.log('Tags ajoutés à la recherche:', params.tagList);
      }
      
      // Log pour la pagination
      if (params.offset !== undefined) {
        console.log(`Pagination - offset: ${params.offset}, limit: ${params.limit || 'non défini'}`);
      }
      
      // Effectuer la requête
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'AuroraWake/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la recherche de stations: ${response.status}`);
      }
      
      const stations = await response.json();
      
      // Vérifier que la réponse est un tableau
      if (!Array.isArray(stations)) {
        console.error('La réponse de l\'API n\'est pas un tableau:', stations);
        return [];
      }
      
      // Tri supplémentaire côté client pour s'assurer que les stations sont bien triées par votes
      if (order === 'votes') {
        stations.sort((a: RadioStation, b: RadioStation) => {
          const votesA = a.votes || 0;
          const votesB = b.votes || 0;
          return reverse ? votesB - votesA : votesA - votesB;
        });
      }
      
      console.log(`Recherche radio: ${stations.length} stations trouvées`);
      
      // Mettre en cache les résultats si nous avons au moins une station
      if (stations.length > 0) {
        await this.cacheData(CACHE_KEYS.SEARCH_RESULTS, stations);
      }
      
      return stations;
    } catch (error) {
      console.error('Erreur lors de la recherche de stations:', error);
      
      // En cas d'erreur, essayer de récupérer les données du cache
      try {
        const cachedData = await this.getCachedData<RadioStation[]>(CACHE_KEYS.SEARCH_RESULTS);
        if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
          console.log(`Utilisation des données en cache: ${cachedData.length} stations`);
          return cachedData;
        }
      } catch (cacheError) {
        console.error('Erreur lors de la récupération des données du cache:', cacheError);
      }
      
      // Si aucune donnée en cache, retourner un tableau vide
      return [];
    }
  }

  /**
   * Récupère la liste des pays
   * @param forceRefresh Force le rafraîchissement depuis l'API
   * @returns Liste des pays
   */
  public async getCountries(forceRefresh: boolean = false): Promise<Country[]> {
    try {
      // Vérifier si les données sont en cache et valides
      if (!forceRefresh) {
        const cachedData = await this.getCachedData<Country[]>(CACHE_KEYS.COUNTRIES);
        if (cachedData) {
          return cachedData;
        }
      }
      
      // Effectuer la requête
      const response = await fetch(`${API_BASE_URL}/countries`);
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des pays: ${response.status}`);
      }
      
      const countries = await response.json();
      
      // Trier les pays par nombre de stations (décroissant)
      countries.sort((a: Country, b: Country) => b.stationcount - a.stationcount);
      
      // Mettre en cache les résultats
      await this.cacheData(CACHE_KEYS.COUNTRIES, countries);
      
      return countries;
    } catch (error) {
      console.error('Erreur lors de la récupération des pays:', error);
      
      // En cas d'erreur, essayer de récupérer les données du cache
      const cachedData = await this.getCachedData<Country[]>(CACHE_KEYS.COUNTRIES);
      return cachedData || [];
    }
  }

  /**
   * Récupère la liste des tags
   * @param forceRefresh Force le rafraîchissement depuis l'API
   * @returns Liste des tags
   */
  public async getTags(forceRefresh: boolean = false): Promise<Tag[]> {
    try {
      // Vérifier si les données sont en cache et valides
      if (!forceRefresh) {
        const cachedData = await this.getCachedData<Tag[]>(CACHE_KEYS.TAGS);
        if (cachedData) {
          return cachedData;
        }
      }
      
      // Effectuer la requête
      const response = await fetch(`${API_BASE_URL}/tags`);
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des tags: ${response.status}`);
      }
      
      const tags = await response.json();
      
      // Trier les tags par nombre de stations (décroissant)
      tags.sort((a: Tag, b: Tag) => b.stationcount - a.stationcount);
      
      // Mettre en cache les résultats
      await this.cacheData(CACHE_KEYS.TAGS, tags);
      
      return tags;
    } catch (error) {
      console.error('Erreur lors de la récupération des tags:', error);
      
      // En cas d'erreur, essayer de récupérer les données du cache
      const cachedData = await this.getCachedData<Tag[]>(CACHE_KEYS.TAGS);
      return cachedData || [];
    }
  }

  /**
   * Récupère les stations favorites
   * @returns Liste des stations favorites
   */
  async getFavorites(): Promise<RadioStation[]> {
    return radioFavorites.getFavorites();
  }

  /**
   * Ajoute une station aux favoris
   * @param station Station à ajouter
   */
  async addToFavorites(station: RadioStation): Promise<void> {
    return radioFavorites.addToFavorites(station);
  }

  /**
   * Supprime une station des favoris
   * @param stationId ID de la station à supprimer
   */
  async removeFromFavorites(stationId: string): Promise<void> {
    return radioFavorites.removeFromFavorites(stationId);
  }

  /**
   * Vérifie si une station est dans les favoris
   * @param stationId ID de la station
   * @returns true si la station est dans les favoris, false sinon
   */
  async isFavorite(stationId: string): Promise<boolean> {
    return radioFavorites.isFavorite(stationId);
  }

  /**
   * Efface le cache des données radio
   */
  public async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEYS.COUNTRIES,
        CACHE_KEYS.TAGS,
        CACHE_KEYS.SEARCH_RESULTS,
      ]);
    } catch (error) {
      console.error('Erreur lors de l\'effacement du cache radio:', error);
      throw error;
    }
  }

  /**
   * Met en cache des données avec un timestamp
   * @param key Clé de cache
   * @param data Données à mettre en cache
   */
  private async cacheData<T>(key: string, data: T): Promise<void> {
    try {
      const cacheItem = {
        timestamp: Date.now(),
        data,
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error(`Erreur lors de la mise en cache des données (${key}):`, error);
    }
  }

  /**
   * Récupère des données du cache si elles sont valides
   * @param key Clé de cache
   * @returns Données du cache ou null si invalides
   */
  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cachedItem = await AsyncStorage.getItem(key);
      
      if (!cachedItem) {
        return null;
      }
      
      const { timestamp, data } = JSON.parse(cachedItem);
      
      // Vérifier si les données sont encore valides
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data as T;
      }
      
      return null;
    } catch (error) {
      console.error(`Erreur lors de la récupération des données du cache (${key}):`, error);
      return null;
    }
  }
}

// Exporter une instance unique du service radio
export const radioService = new RadioService(); 