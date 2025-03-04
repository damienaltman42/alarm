import AsyncStorage from '@react-native-async-storage/async-storage';
import { RadioStation } from '../types';

// Clé pour le stockage des favoris dans AsyncStorage
const FAVORITES_STORAGE_KEY = '@aurora_wake_favorites';

class FavoritesService {
  private favorites: RadioStation[] = [];
  private initialized = false;

  // Initialiser le service en chargeant les favoris depuis AsyncStorage
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (storedFavorites) {
        this.favorites = JSON.parse(storedFavorites);
      }
      this.initialized = true;
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
      this.favorites = [];
      this.initialized = true;
    }
  }

  // Sauvegarder les favoris dans AsyncStorage
  private async saveFavorites(): Promise<void> {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(this.favorites));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des favoris:', error);
    }
  }

  // Obtenir la liste des favoris
  public async getFavorites(): Promise<RadioStation[]> {
    await this.initialize();
    return [...this.favorites];
  }

  // Ajouter une station aux favoris
  public async addFavorite(station: RadioStation): Promise<void> {
    await this.initialize();
    
    // Vérifier si la station est déjà dans les favoris
    if (!this.favorites.some(fav => fav.stationuuid === station.stationuuid)) {
      this.favorites.push(station);
      await this.saveFavorites();
    }
  }

  // Supprimer une station des favoris
  public async removeFavorite(stationId: string): Promise<void> {
    await this.initialize();
    
    this.favorites = this.favorites.filter(station => station.stationuuid !== stationId);
    await this.saveFavorites();
  }

  // Vérifier si une station est dans les favoris
  public async isFavorite(stationId: string): Promise<boolean> {
    await this.initialize();
    
    return this.favorites.some(station => station.stationuuid === stationId);
  }
}

// Exporter une instance unique du service
export const favoritesService = new FavoritesService(); 