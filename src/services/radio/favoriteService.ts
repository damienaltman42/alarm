import { RadioStation } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clé de stockage des favoris
const FAVORITES_STORAGE_KEY = 'radio_favorites';

/**
 * Service de gestion des stations favorites
 */
class FavoriteService {
  /**
   * Récupère la liste des stations favorites
   * @returns Liste des stations favorites
   */
  public async getFavorites(): Promise<RadioStation[]> {
    try {
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      
      if (!favoritesJson) {
        return [];
      }
      
      return JSON.parse(favoritesJson);
    } catch (error) {
      console.error('Erreur lors de la récupération des favoris:', error);
      return [];
    }
  }

  /**
   * Ajoute une station aux favoris
   * @param station Station à ajouter
   */
  public async addFavorite(station: RadioStation): Promise<void> {
    try {
      // Récupérer les favoris actuels
      const favorites = await this.getFavorites();
      
      // Vérifier si la station est déjà dans les favoris
      const exists = favorites.some(fav => fav.stationuuid === station.stationuuid);
      
      if (!exists) {
        // Ajouter la station aux favoris
        favorites.push(station);
        
        // Enregistrer les favoris
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      throw error;
    }
  }

  /**
   * Supprime une station des favoris
   * @param stationId Identifiant de la station
   */
  public async removeFavorite(stationId: string): Promise<void> {
    try {
      // Récupérer les favoris actuels
      const favorites = await this.getFavorites();
      
      // Filtrer la station à supprimer
      const updatedFavorites = favorites.filter(station => station.stationuuid !== stationId);
      
      // Enregistrer les favoris mis à jour
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Erreur lors de la suppression des favoris:', error);
      throw error;
    }
  }

  /**
   * Vérifie si une station est dans les favoris
   * @param stationId Identifiant de la station
   * @returns true si la station est dans les favoris
   */
  public async isFavorite(stationId: string): Promise<boolean> {
    try {
      // Récupérer les favoris
      const favorites = await this.getFavorites();
      
      // Vérifier si la station est dans les favoris
      return favorites.some(station => station.stationuuid === stationId);
    } catch (error) {
      console.error('Erreur lors de la vérification des favoris:', error);
      return false;
    }
  }
}

// Exporter une instance unique du service de favoris
export const favoriteService = new FavoriteService(); 