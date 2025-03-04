import { RadioStation, Country, Tag, RadioSearchParams } from '../../types';
import { radioApi } from '../../api/radioApi';
import { radioCache } from './radioCache';
import { radioFavorites } from './radioFavorites';
import { ErrorService } from '../../utils/errorHandling';

/**
 * Service principal pour la gestion des radios
 * Sert de façade pour les autres services spécialisés
 */
export class RadioService {
  /**
   * Recherche des stations de radio
   * @param params Paramètres de recherche
   * @returns Liste des stations trouvées
   */
  async searchStations(params: RadioSearchParams): Promise<RadioStation[]> {
    try {
      return await radioApi.searchStations(params);
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioService.searchStations');
      return [];
    }
  }

  /**
   * Récupère la liste des pays
   * @param forceRefresh Force le rafraîchissement du cache
   * @returns Liste des pays
   */
  async getCountries(forceRefresh: boolean = false): Promise<Country[]> {
    try {
      // Essayer de récupérer depuis le cache
      if (!forceRefresh) {
        const cachedCountries = await radioCache.getCachedCountries();
        if (cachedCountries) {
          return cachedCountries;
        }
      }
      
      // Récupérer depuis l'API
      const countries = await radioApi.getCountries();
      
      // Mettre en cache
      if (countries.length > 0) {
        await radioCache.setCachedCountries(countries);
      }
      
      return countries;
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioService.getCountries');
      return [];
    }
  }

  /**
   * Récupère la liste des tags
   * @param forceRefresh Force le rafraîchissement du cache
   * @returns Liste des tags
   */
  async getTags(forceRefresh: boolean = false): Promise<Tag[]> {
    try {
      // Essayer de récupérer depuis le cache
      if (!forceRefresh) {
        const cachedTags = await radioCache.getCachedTags();
        if (cachedTags) {
          return cachedTags;
        }
      }
      
      // Récupérer depuis l'API
      const tags = await radioApi.getTags();
      
      // Mettre en cache
      if (tags.length > 0) {
        await radioCache.setCachedTags(tags);
      }
      
      return tags;
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioService.getTags');
      return [];
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
   * Efface le cache
   */
  async clearCache(): Promise<void> {
    return radioCache.clearCache();
  }
}

// Exporter une instance singleton
export const radioService = new RadioService(); 