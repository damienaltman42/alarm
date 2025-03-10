import AsyncStorage from '@react-native-async-storage/async-storage';
import { Country, Tag, RadioCacheOptions } from '../../types';
import { ErrorService } from '../../utils/errorHandling';

// Clés pour le stockage en cache
const CACHE_KEYS = {
  COUNTRIES: '@rhythmee_countries',
  TAGS: '@rhythmee_tags',
};

/**
 * Service responsable de la mise en cache des données radio
 */
export class RadioCache {
  private cacheTimestamp: Record<string, number> = {};
  private options: RadioCacheOptions;

  constructor(options: RadioCacheOptions = {}) {
    this.options = {
      duration: options.duration || 24 * 60 * 60 * 1000, // 24 heures par défaut
    };
  }

  /**
   * Vérifie si le cache est valide pour une clé donnée
   * @param key Clé de cache
   * @returns true si le cache est valide, false sinon
   */
  isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamp[key];
    if (!timestamp) return false;
    
    const now = Date.now();
    return now - timestamp < this.options.duration!;
  }

  /**
   * Récupère les pays en cache
   * @returns Liste des pays ou null si le cache est invalide
   */
  async getCachedCountries(): Promise<Country[] | null> {
    try {
      if (!this.isCacheValid(CACHE_KEYS.COUNTRIES)) {
        return null;
      }
      
      const countriesJson = await AsyncStorage.getItem(CACHE_KEYS.COUNTRIES);
      if (!countriesJson) {
        return null;
      }
      
      return JSON.parse(countriesJson) as Country[];
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioCache.getCachedCountries');
      return null;
    }
  }

  /**
   * Met en cache la liste des pays
   * @param countries Liste des pays
   */
  async setCachedCountries(countries: Country[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.COUNTRIES, JSON.stringify(countries));
      this.cacheTimestamp[CACHE_KEYS.COUNTRIES] = Date.now();
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioCache.setCachedCountries');
    }
  }

  /**
   * Récupère les tags en cache
   * @returns Liste des tags ou null si le cache est invalide
   */
  async getCachedTags(): Promise<Tag[] | null> {
    try {
      if (!this.isCacheValid(CACHE_KEYS.TAGS)) {
        return null;
      }
      
      const tagsJson = await AsyncStorage.getItem(CACHE_KEYS.TAGS);
      if (!tagsJson) {
        return null;
      }
      
      return JSON.parse(tagsJson) as Tag[];
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioCache.getCachedTags');
      return null;
    }
  }

  /**
   * Met en cache la liste des tags
   * @param tags Liste des tags
   */
  async setCachedTags(tags: Tag[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.TAGS, JSON.stringify(tags));
      this.cacheTimestamp[CACHE_KEYS.TAGS] = Date.now();
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioCache.setCachedTags');
    }
  }

  /**
   * Efface le cache
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([CACHE_KEYS.COUNTRIES, CACHE_KEYS.TAGS]);
      this.cacheTimestamp = {};
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioCache.clearCache');
    }
  }
}

// Exporter une instance singleton
export const radioCache = new RadioCache(); 