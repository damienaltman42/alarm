import { RadioStation, Country, Tag, RadioSearchParams } from '../types';
import { ErrorService } from '../utils/errorHandling';

// Liste des serveurs API disponibles
const API_SERVERS = [
  'https://de1.api.radio-browser.info',
  'http://de1.api.radio-browser.info',
  'https://fr1.api.radio-browser.info',
  'http://fr1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'http://at1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'http://nl1.api.radio-browser.info',
];

// Configuration de base pour les requêtes
const baseHeaders = {
  'User-Agent': 'AuroraWake/1.0',
  'Content-Type': 'application/json',
};

/**
 * Service responsable de la communication avec l'API Radio Browser
 */
export class RadioApi {
  private baseUrl: string;
  private serverFailures: Record<string, number> = {};

  constructor() {
    this.baseUrl = this.getRandomServer();
  }

  /**
   * Sélectionne aléatoirement un serveur API
   */
  private getRandomServer(): string {
    const availableServers = API_SERVERS.filter(
      server => !this.serverFailures[server] || this.serverFailures[server] < 3
    );
    
    if (availableServers.length === 0) {
      // Réinitialiser les compteurs d'échec si tous les serveurs ont échoué
      this.serverFailures = {};
      return API_SERVERS[0];
    }
    
    const randomIndex = Math.floor(Math.random() * availableServers.length);
    return availableServers[randomIndex];
  }

  /**
   * Change de serveur API en cas d'échec
   */
  private changeServer(): string {
    // Incrémenter le compteur d'échec pour le serveur actuel
    this.serverFailures[this.baseUrl] = (this.serverFailures[this.baseUrl] || 0) + 1;
    
    // Sélectionner un nouveau serveur
    this.baseUrl = this.getRandomServer();
    console.log(`Changement de serveur API: ${this.baseUrl}`);
    
    return this.baseUrl;
  }

  /**
   * Effectue une requête à l'API
   * @param endpoint Point de terminaison de l'API
   * @param params Paramètres de la requête
   * @returns Résultat de la requête
   */
  private async fetchFromApi<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      // Construire l'URL avec les paramètres
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      
      const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
      console.log('============================= URL START=============================');
      console.log(url);
      console.log('============================= URL END=============================');
      // Effectuer la requête
      const response = await fetch(url, {
        method: 'GET',
        headers: baseHeaders,
      });
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      // En cas d'erreur, changer de serveur et réessayer une fois
      console.error('Erreur lors de la requête API:', error);
      
      // Changer de serveur
      this.changeServer();
      
      // Attendre un court délai avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Réessayer avec le nouveau serveur
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      
      const retryUrl = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
      console.log(`Nouvelle tentative avec: ${retryUrl}`);
      
      try {
        const retryResponse = await fetch(retryUrl, {
          method: 'GET',
          headers: baseHeaders,
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Erreur API (retry): ${retryResponse.status} ${retryResponse.statusText}`);
        }
        
        return await retryResponse.json() as T;
      } catch (retryError) {
        ErrorService.handleError(retryError as Error, 'RadioApi.fetchFromApi');
        throw retryError;
      }
    }
  }

  /**
   * Recherche des stations de radio
   * @param params Paramètres de recherche
   * @returns Liste des stations trouvées
   */
  async searchStations(params: RadioSearchParams): Promise<RadioStation[]> {
    try {
      const endpoint = '/json/stations/search';
      
      // Paramètres de recherche de base
      const searchParams: Record<string, any> = {
        limit: params.limit || 20,
        offset: params.offset || 0,
        order: params.order || 'votes',
        reverse: params.reverse !== undefined ? params.reverse : true,
        hidebroken: params.hidebroken !== undefined ? params.hidebroken : true,
      };
      
      // Ajouter tous les paramètres spécifiés
      if (params.name) {
        searchParams.name = params.name;
        if (params.nameExact) searchParams.nameExact = params.nameExact;
      }
      
      if (params.country) {
        searchParams.country = params.country;
      }
      
      if (params.countrycode) {
        searchParams.countrycode = params.countrycode;
      }
      
      if (params.tag) {
        searchParams.tag = params.tag;
      }
      
      if (params.tagList && params.tagList.length > 0) {
        searchParams.tagList = params.tagList.join(',');
      }
      
      if (params.is_https !== undefined) {
        searchParams.is_https = params.is_https;
      }
      
      if (params.bitrateMin !== undefined) {
        searchParams.bitrateMin = params.bitrateMin;
      }
      
      if (params.bitrateMax !== undefined) {
        searchParams.bitrateMax = params.bitrateMax;
      }
      
      return await this.fetchFromApi<RadioStation[]>(endpoint, searchParams);
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioApi.searchStations');
      return [];
    }
  }

  /**
   * Récupère la liste des pays
   * @returns Liste des pays
   */
  async getCountries(): Promise<Country[]> {
    try {
      const countries = await this.fetchFromApi<Country[]>('/json/countries');
      return countries
        .filter(country => country.stationcount > 0)
        .sort((a, b) => b.stationcount - a.stationcount);
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioApi.getCountries');
      return [];
    }
  }

  /**
   * Récupère la liste des tags
   * @returns Liste des tags
   */
  async getTags(): Promise<Tag[]> {
    try {
      const tags = await this.fetchFromApi<Tag[]>('/json/tags');
      return tags
        .filter(tag => tag.stationcount > 10)
        .sort((a, b) => b.stationcount - a.stationcount)
        .slice(0, 100); // Limiter aux 100 tags les plus populaires
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioApi.getTags');
      return [];
    }
  }
}

// Exporter une instance singleton
export const radioApi = new RadioApi(); 