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

// Nombre maximum de tentatives par serveur
const MAX_RETRIES_PER_SERVER = 2;
// Délai entre les tentatives (en ms)
const RETRY_DELAY = 1000;

/**
 * Service responsable de la communication avec l'API Radio Browser
 */
export class RadioApi {
  private baseUrl: string;
  private serverFailures: Record<string, number> = {};
  private serversToTry: string[] = [];

  constructor() {
    this.baseUrl = this.getRandomServer();
    this.serversToTry = [...API_SERVERS]; // Copie de tous les serveurs disponibles
  }

  /**
   * Sélectionne aléatoirement un serveur API
   */
  private getRandomServer(): string {
    const availableServers = API_SERVERS.filter(
      server => !this.serverFailures[server] || this.serverFailures[server] < MAX_RETRIES_PER_SERVER
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
   * Réinitialise la liste des serveurs à essayer
   */
  private resetServersToTry(): void {
    this.serversToTry = [...API_SERVERS];
    // Mélanger le tableau pour essayer les serveurs dans un ordre aléatoire
    this.serversToTry.sort(() => Math.random() - 0.5);
  }

  /**
   * Obtient le prochain serveur à essayer
   */
  private getNextServer(): string | null {
    if (this.serversToTry.length === 0) {
      this.resetServersToTry();
    }
    return this.serversToTry.shift() || null;
  }

  /**
   * Effectue une requête à l'API avec plusieurs tentatives sur différents serveurs
   * @param endpoint Point de terminaison de l'API
   * @param params Paramètres de la requête
   * @returns Résultat de la requête
   */
  private async fetchFromApi<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    // Réinitialiser la liste des serveurs à essayer
    this.resetServersToTry();
    
    // Construire les paramètres de requête
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    
    const queryString = queryParams.toString();
    let lastError: Error | null = null;
    
    // Essayer tous les serveurs jusqu'à ce qu'un fonctionne
    while (this.serversToTry.length > 0) {
      const server = this.getNextServer();
      if (!server) break;
      
      this.baseUrl = server;
      const url = `${this.baseUrl}${endpoint}?${queryString}`;
      
      console.log('============================= URL START=============================');
      console.log(url);
      console.log('============================= URL END=============================');
      
      try {
        // Effectuer la requête
        const response = await fetch(url, {
          method: 'GET',
          headers: baseHeaders,
        });
        
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
        }
        
        // Si la requête réussit, mettre à jour le serveur de base et retourner les données
        return await response.json() as T;
      } catch (error) {
        console.error('Erreur lors de la requête API:', error);
        lastError = error as Error;
        
        // Attendre un court délai avant d'essayer le prochain serveur
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
    
    // Si tous les serveurs ont échoué, enregistrer l'erreur et retourner un tableau vide
    if (lastError) {
      ErrorService.handleError(lastError, 'RadioApi.fetchFromApi');
    }
    
    throw new Error('Tous les serveurs API ont échoué');
  }

  /**
   * Recherche des stations de radio
   * @param params Paramètres de recherche
   * @returns Liste des stations trouvées
   */
  async searchStations(params: RadioSearchParams): Promise<RadioStation[]> {
    try {
      console.log('Paramètres de recherche:', params);
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