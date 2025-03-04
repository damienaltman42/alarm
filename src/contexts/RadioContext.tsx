import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { RadioStation, Country, Tag, RadioSearchParams } from '../types';
import { radioService } from '../services/radio';
import { ErrorService } from '../utils/errorHandling';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Délai avant de réessayer une opération audio en cas d'erreur (en ms)
const AUDIO_RETRY_DELAY = 300;
// Délai entre l'arrêt et le démarrage d'une nouvelle radio (en ms)
const AUDIO_TRANSITION_DELAY = 200;

// Type pour le contexte de radio
interface RadioContextType {
  stations: RadioStation[];
  favorites: RadioStation[];
  countries: Country[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
  currentPlayingStation: string | null;
  loadingAudio: boolean;
  searchStations: (params: RadioSearchParams) => Promise<RadioStation[]>;
  loadCountries: (forceRefresh?: boolean) => Promise<Country[]>;
  loadTags: (forceRefresh?: boolean) => Promise<Tag[]>;
  addToFavorites: (station: RadioStation) => Promise<boolean>;
  removeFromFavorites: (stationId: string) => Promise<boolean>;
  isFavorite: (stationId: string) => Promise<boolean>;
  clearCache: () => Promise<boolean>;
  playPreview: (station: RadioStation) => Promise<void>;
  stopPreview: () => Promise<void>;
}

// Création du contexte
export const RadioContext = createContext<RadioContextType | undefined>(undefined);

// Props pour le provider
interface RadioProviderProps {
  children: ReactNode;
}

/**
 * Provider pour le contexte de radio
 */
export const RadioProvider: React.FC<RadioProviderProps> = ({ children }) => {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentPlayingStation, setCurrentPlayingStation] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);

  // Charger les favoris au montage du composant
  useEffect(() => {
    loadFavorites();
  }, []);

  // Charger les stations favorites
  const loadFavorites = async () => {
    try {
      const favStations = await radioService.getFavorites();
      setFavorites(favStations);
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioProvider.loadFavorites');
    }
  };

  // Rechercher des stations
  const searchStations = async (params: RadioSearchParams): Promise<RadioStation[]> => {
    setLoading(true);
    setError(null);
    try {
      const results = await radioService.searchStations(params);
      setStations(results);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors de la recherche: ${errorMessage}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Charger les pays
  const loadCountries = async (forceRefresh: boolean = false): Promise<Country[]> => {
    setLoading(true);
    setError(null);
    try {
      const results = await radioService.getCountries(forceRefresh);
      setCountries(results);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors du chargement des pays: ${errorMessage}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Charger les tags
  const loadTags = async (forceRefresh: boolean = false): Promise<Tag[]> => {
    setLoading(true);
    setError(null);
    try {
      const results = await radioService.getTags(forceRefresh);
      setTags(results);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors du chargement des tags: ${errorMessage}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Ajouter une station aux favoris
  const addToFavorites = async (station: RadioStation): Promise<boolean> => {
    try {
      await radioService.addToFavorites(station);
      await loadFavorites();
      return true;
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioProvider.addToFavorites');
      return false;
    }
  };

  // Supprimer une station des favoris
  const removeFromFavorites = async (stationId: string): Promise<boolean> => {
    try {
      await radioService.removeFromFavorites(stationId);
      await loadFavorites();
      return true;
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioProvider.removeFromFavorites');
      return false;
    }
  };

  // Vérifier si une station est dans les favoris
  const isFavorite = async (stationId: string): Promise<boolean> => {
    try {
      return await radioService.isFavorite(stationId);
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioProvider.isFavorite');
      return false;
    }
  };

  // Effacer le cache
  const clearCache = async (): Promise<boolean> => {
    try {
      await radioService.clearCache();
      return true;
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioProvider.clearCache');
      return false;
    }
  };

  // Lecture d'un aperçu de la radio
  const playPreview = async (station: RadioStation) => {
    try {
      // Si c'est la même station qui est déjà en cours de lecture, on l'arrête simplement
      if (currentPlayingStation === station.stationuuid) {
        await stopPreview();
        return;
      }
      
      // Indiquer que l'audio est en cours de chargement
      setLoadingAudio(true);
      setCurrentPlayingStation(station.stationuuid);
      
      // Arrêter la lecture en cours si elle existe
      await safeStopAudio();
      
      // Attendre un court instant pour éviter les conflits entre l'arrêt et le démarrage
      await new Promise(resolve => setTimeout(resolve, AUDIO_TRANSITION_DELAY));
      
      // Créer et charger un nouvel objet Sound
      console.log(`Démarrage de la lecture pour ${station.name}`);
      
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: station.url_resolved },
          { shouldPlay: true }
        );
        
        // Configurer un gestionnaire d'événements pour détecter la fin de la lecture
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            // Si le son est chargé et en cours de lecture, désactiver l'indicateur de chargement
            if (status.isPlaying) {
              setLoadingAudio(false);
              // S'assurer que currentPlayingStation est toujours défini
              if (currentPlayingStation !== station.stationuuid) {
                setCurrentPlayingStation(station.stationuuid);
              }
            }
            
            if (status.didJustFinish) {
              stopPreview();
            }
          }
        });
        
        setSound(newSound);
      } catch (audioError) {
        console.error('Erreur lors de la création du son:', audioError);
        setCurrentPlayingStation(null);
        setLoadingAudio(false);
        
        // Attendre un court instant et réessayer une fois
        setTimeout(async () => {
          try {
            setLoadingAudio(true);
            setCurrentPlayingStation(station.stationuuid);
            const { sound: retrySound } = await Audio.Sound.createAsync(
              { uri: station.url_resolved },
              { shouldPlay: true }
            );
            
            retrySound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.isPlaying) {
                setLoadingAudio(false);
                // S'assurer que currentPlayingStation est toujours défini
                if (currentPlayingStation !== station.stationuuid) {
                  setCurrentPlayingStation(station.stationuuid);
                }
              }
            });
            
            setSound(retrySound);
          } catch (retryError) {
            console.error('Échec de la seconde tentative de lecture:', retryError);
            setCurrentPlayingStation(null);
            setLoadingAudio(false);
          }
        }, AUDIO_RETRY_DELAY);
      }
    } catch (error) {
      console.error('Erreur lors de la lecture de la radio:', error);
      setCurrentPlayingStation(null);
      setLoadingAudio(false);
    }
  };

  // Fonction sécurisée pour arrêter l'audio
  const safeStopAudio = async () => {
    if (sound) {
      try {
        // Essayer d'abord de mettre en pause
        try {
          await sound.pauseAsync();
          // Petit délai pour laisser la pause s'effectuer
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          // Ignorer silencieusement cette erreur spécifique
          const pauseError = error as Error;
          if (pauseError.message !== 'Seeking interrupted.') {
            console.error('Erreur lors de la mise en pause:', pauseError);
          }
          // Continuer malgré l'erreur
        }
        
        // Ensuite, décharger le son
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.error('Erreur lors du déchargement du son:', error);
          // Continuer malgré l'erreur
        }
      } catch (error) {
        // Gérer les erreurs globales
        const err = error as Error;
        if (err.message !== 'Seeking interrupted.') {
          console.error('Erreur globale lors de l\'arrêt de l\'audio:', err);
        }
      } finally {
        setSound(null);
        // Ne pas réinitialiser currentPlayingStation ici, cela sera géré par playPreview
      }
    }
  };

  // Arrêter la lecture
  const stopPreview = async () => {
    await safeStopAudio();
    // Ne pas réinitialiser loadingAudio ici, cela sera fait par playPreview
    // lorsque le nouvel audio sera chargé
  };

  // Nettoyer le son lors du démontage du composant
  useEffect(() => {
    return () => {
      if (sound) {
        try {
          sound.unloadAsync();
        } catch (error) {
          console.error('Erreur lors du nettoyage du son:', error);
        }
        setSound(null);
        setCurrentPlayingStation(null);
      }
    };
  }, [sound]);

  return (
    <RadioContext.Provider
      value={{
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
      }}
    >
      {children}
    </RadioContext.Provider>
  );
}; 