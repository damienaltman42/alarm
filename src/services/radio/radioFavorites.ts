import AsyncStorage from '@react-native-async-storage/async-storage';
import { RadioStation } from '../../types';
import { ErrorService } from '../../utils/errorHandling';

// Clé pour le stockage des favoris
const FAVORITES_STORAGE_KEY = '@aurora_wake_radio_favorites';

/**
 * Service responsable de la gestion des stations de radio favorites
 */
export class RadioFavorites {
  /**
   * Récupère toutes les stations favorites
   * @returns Liste des stations favorites
   */
  async getFavorites(): Promise<RadioStation[]> {
    try {
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!favoritesJson) {
        return [];
      }
      return JSON.parse(favoritesJson) as RadioStation[];
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioFavorites.getFavorites');
      return [];
    }
  }

  /**
   * Ajoute une station aux favoris
   * @param station Station à ajouter
   */
  async addToFavorites(station: RadioStation): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      
      // Vérifier si la station est déjà dans les favoris
      const existingIndex = favorites.findIndex(
        fav => fav.stationuuid === station.stationuuid
      );
      
      if (existingIndex === -1) {
        // Ajouter la station aux favoris
        favorites.push(station);
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioFavorites.addToFavorites');
    }
  }

  /**
   * Supprime une station des favoris
   * @param stationId ID de la station à supprimer
   */
  async removeFromFavorites(stationId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filteredFavorites = favorites.filter(
        station => station.stationuuid !== stationId
      );
      
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(filteredFavorites));
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioFavorites.removeFromFavorites');
    }
  }

  /**
   * Vérifie si une station est dans les favoris
   * @param stationId ID de la station
   * @returns true si la station est dans les favoris, false sinon
   */
  async isFavorite(stationId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(station => station.stationuuid === stationId);
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioFavorites.isFavorite');
      return false;
    }
  }
}

// Exporter une instance singleton
export const radioFavorites = new RadioFavorites(); 