import { useContext } from 'react';
import { RadioContext } from '../contexts/RadioContext';
import { RadioStation, RadioSearchParams, Country, Tag } from '../types';

/**
 * Hook personnalisé pour utiliser le contexte de radio
 * @returns Fonctions et données pour interagir avec les radios
 */
export function useRadio() {
  const context = useContext(RadioContext);
  
  if (context === undefined) {
    throw new Error('useRadio doit être utilisé à l\'intérieur d\'un RadioProvider');
  }
  
  const { 
    stations, 
    favorites, 
    countries, 
    tags, 
    loading, 
    error,
    currentPlayingStation,
    loadingAudio,
    searchStations,
    loadCountries,
    loadTags,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    clearCache,
    playPreview,
    stopPreview
  } = context;

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
    /**
     * Recherche des stations de radio
     * @param params Paramètres de recherche
     * @returns Liste des stations trouvées
     */
    searchStations,
    
    /**
     * Charge la liste des pays
     * @param forceRefresh Force le rafraîchissement depuis l'API
     * @returns Liste des pays
     */
    loadCountries,
    
    /**
     * Charge la liste des tags
     * @param forceRefresh Force le rafraîchissement depuis l'API
     * @returns Liste des tags
     */
    loadTags,
    
    /**
     * Ajoute une station aux favoris
     * @param station Station à ajouter
     * @returns Succès de l'opération
     */
    addToFavorites,
    
    /**
     * Supprime une station des favoris
     * @param stationId Identifiant de la station
     * @returns Succès de l'opération
     */
    removeFromFavorites,
    
    /**
     * Vérifie si une station est dans les favoris
     * @param stationId Identifiant de la station
     * @returns true si la station est dans les favoris
     */
    isFavorite,
    
    /**
     * Efface le cache des données radio
     * @returns Succès de l'opération
     */
    clearCache,
    
    /**
     * Joue un aperçu de la station radio
     * @param station Station à jouer
     */
    playPreview,
    
    /**
     * Arrête la lecture en cours
     */
    stopPreview
  };
} 