import { useState, useEffect, useCallback } from 'react';
import { RadioStation, RadioSearchParams, Country, Tag } from '../types';
import { alarmManager } from '../services/alarm/alarmManager';
import { radioService } from '../services/radio/radioService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RadioSource } from '../services/audio/RadioSource';

// Service de gestion des favoris simplifié
const FAVORITES_STORAGE_KEY = 'radio_favorites';
const favoriteService = {
  async getFavorites(): Promise<RadioStation[]> {
    try {
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      return favoritesJson ? JSON.parse(favoritesJson) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des favoris:', error);
      return [];
    }
  },
  
  async addFavorite(station: RadioStation): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      if (!favorites.some(fav => fav.stationuuid === station.stationuuid)) {
        favorites.push(station);
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      throw error;
    }
  },
  
  async removeFavorite(stationId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.filter(station => station.stationuuid !== stationId);
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Erreur lors de la suppression des favoris:', error);
      throw error;
    }
  }
};

/**
 * Hook personnalisé pour interagir avec les radios
 * @returns Fonctions et données pour interagir avec les radios
 */
export function useRadio() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayingStation, setCurrentPlayingStation] = useState<RadioStation | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);

  // Charger les favoris au démarrage
  useEffect(() => {
    loadFavorites();
  }, []);

  // Vérifier périodiquement si une station est en cours de lecture
  useEffect(() => {
    const checkPlayingStatus = () => {
      const previewSource = alarmManager.getPreviewAudioSource();
      
      if (previewSource) {
        const sourceName = previewSource.getName();
        
        // Si le nom contient un tiret, c'est probablement une station radio
        if (sourceName.includes(' - ')) {
          // Essayer de trouver la station correspondante dans les favoris ou les stations
          const matchingStation = [...favorites, ...stations].find(s => 
            `${s.name} - ${s.country}` === sourceName
          );
          
          if (matchingStation) {
            setCurrentPlayingStation(matchingStation);
          } else {
            // Créer une station temporaire basée sur le nom
            const parts = sourceName.split(' - ');
            const tempStation: RadioStation = {
              name: parts[0],
              country: parts[1] || '',
              url_resolved: '',
              stationuuid: 'temp-' + Date.now(),
              favicon: '',
              tags: '',
              language: '',
              votes: 0,
              codec: '',
              bitrate: 0,
              url: '',
              homepage: '',
            };
            setCurrentPlayingStation(tempStation);
          }
          setLoadingAudio(false);
        } else if (previewSource instanceof RadioSource) {
          // C'est une source radio mais sans le format "nom - pays"
          const tempStation: RadioStation = {
            name: sourceName,
            country: '',
            url_resolved: '',
            stationuuid: 'temp-' + Date.now(),
            favicon: '',
            tags: '',
            language: '',
            votes: 0,
            codec: '',
            bitrate: 0,
            url: '',
            homepage: '',
          };
          setCurrentPlayingStation(tempStation);
          setLoadingAudio(false);
        } else {
          // Probablement une playlist Spotify, pas une station radio
          setCurrentPlayingStation(null);
          setLoadingAudio(false);
        }
      } else {
        setCurrentPlayingStation(null);
        setLoadingAudio(false);
      }
    };
    
    const interval = setInterval(checkPlayingStatus, 1000);
    return () => clearInterval(interval);
  }, [favorites, stations]);

  /**
   * Charge les stations favorites
   */
  const loadFavorites = useCallback(async () => {
    try {
      const favs = await favoriteService.getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
      setError('Impossible de charger les favoris');
    }
  }, []);

  /**
   * Recherche des stations de radio
   * @param params Paramètres de recherche
   * @returns Liste des stations trouvées
   */
  const searchStations = useCallback(async (params: RadioSearchParams): Promise<RadioStation[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await radioService.searchStations(params);
      setStations(results);
      setLoading(false);
      return results;
    } catch (error) {
      console.error('Erreur lors de la recherche de stations:', error);
      setError('Impossible de rechercher des stations');
      setLoading(false);
      return [];
    }
  }, []);

  /**
   * Charge la liste des pays
   * @param forceRefresh Force le rafraîchissement depuis l'API
   * @returns Liste des pays
   */
  const loadCountries = useCallback(async (forceRefresh: boolean = false): Promise<Country[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await radioService.getCountries(forceRefresh);
      setCountries(results);
      setLoading(false);
      return results;
    } catch (error) {
      console.error('Erreur lors du chargement des pays:', error);
      setError('Impossible de charger les pays');
      setLoading(false);
      return [];
    }
  }, []);

  /**
   * Charge la liste des tags
   * @param forceRefresh Force le rafraîchissement depuis l'API
   * @returns Liste des tags
   */
  const loadTags = useCallback(async (forceRefresh: boolean = false): Promise<Tag[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await radioService.getTags(forceRefresh);
      setTags(results);
      setLoading(false);
      return results;
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
      setError('Impossible de charger les tags');
      setLoading(false);
      return [];
    }
  }, []);

  /**
   * Ajoute une station aux favoris
   * @param station Station à ajouter
   * @returns Succès de l'opération
   */
  const addToFavorites = useCallback(async (station: RadioStation): Promise<boolean> => {
    try {
      await favoriteService.addFavorite(station);
      await loadFavorites();
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      setError('Impossible d\'ajouter aux favoris');
      return false;
    }
  }, [loadFavorites]);

  /**
   * Supprime une station des favoris
   * @param stationId Identifiant de la station
   * @returns Succès de l'opération
   */
  const removeFromFavorites = useCallback(async (stationId: string): Promise<boolean> => {
    try {
      await favoriteService.removeFavorite(stationId);
      await loadFavorites();
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression des favoris:', error);
      setError('Impossible de supprimer des favoris');
      return false;
    }
  }, [loadFavorites]);

  /**
   * Vérifie si une station est dans les favoris
   * @param stationId Identifiant de la station
   * @returns true si la station est dans les favoris
   */
  const isFavorite = useCallback((stationId: string): boolean => {
    return favorites.some(station => station.stationuuid === stationId);
  }, [favorites]);

  /**
   * Efface le cache des données radio
   * @returns Succès de l'opération
   */
  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      await radioService.clearCache();
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'effacement du cache:', error);
      setError('Impossible d\'effacer le cache');
      return false;
    }
  }, []);

  /**
   * Joue un aperçu de la station radio
   * @param station Station à jouer
   */
  const playPreview = useCallback(async (station: RadioStation) => {
    setLoadingAudio(true);
    setCurrentPlayingStation(station);
    
    try {
      await alarmManager.previewRadio(station.url_resolved, `${station.name} - ${station.country}`);
    } catch (error) {
      console.error('Erreur lors de la lecture de la station:', error);
      setError('Impossible de lire la station');
      setLoadingAudio(false);
    }
  }, []);

  /**
   * Arrête la lecture en cours
   */
  const stopPreview = useCallback(async () => {
    try {
      await alarmManager.stopPreview();
      setCurrentPlayingStation(null);
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la lecture:', error);
    }
  }, []);

  return {
    // Données
    stations,
    favorites,
    countries,
    tags,
    loading,
    error,
    currentPlayingStation,
    loadingAudio,
    
    // Méthodes
    searchStations,
    loadCountries,
    loadTags,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    clearCache,
    playPreview,
    stopPreview
  };
} 