import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { RadioStation, Country, Tag, RadioSearchParams } from '../types';
import { radioService } from '../services/radio';
import { ErrorService } from '../utils/errorHandling';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Délai avant de réessayer une opération audio en cas d'erreur (en ms)
const AUDIO_RETRY_DELAY = 2000;
// Délai entre l'arrêt et le démarrage d'une nouvelle radio (en ms)
const AUDIO_TRANSITION_DELAY = 100;

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
  currentStation: RadioStation | null;
  currentStationRef: React.RefObject<RadioStation | null>;
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
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  
  // Référence pour suivre si une opération de lecture est en cours
  const playOperationInProgress = useRef<boolean>(false);
  // Référence pour suivre la station en cours pendant les transitions
  const currentStationRef = useRef<RadioStation | null>(null);
  // Référence pour suivre si nous sommes en mode transition ou arrêt complet
  const isTransitioningRef = useRef<boolean>(false);

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
    setError('');
    
    try {
      const maxRetries = 3;
      let retryCount = 0;
      let stations: RadioStation[] = [];
      
      while (retryCount < maxRetries) {
        try {
          stations = await radioService.searchStations(params);
          
          if (stations.length > 0) {
            // Si nous avons des stations, sortir de la boucle
            break;
          } else if (retryCount < maxRetries - 1) {
            // Si aucune station trouvée mais qu'il reste des essais, attendre et réessayer
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          if (retryCount < maxRetries - 1) {
            // Attendre avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // Dernière tentative échouée, propager l'erreur
            throw error;
          }
        }
        
        retryCount++;
      }
      
      setStations(stations);
      
      if (stations.length === 0) {
        setError('Aucune station trouvée. Veuillez modifier vos critères de recherche ou réessayer plus tard.');
      }
      
      return stations;
    } catch (error) {
      ErrorService.handleError(error as Error, 'RadioContext.searchStations');
      setError('Impossible de se connecter aux serveurs radio. Veuillez vérifier votre connexion internet et réessayer.');
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
          console.log("Déchargement audio réussi");
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
      }
    }
  };

  // Arrêter la lecture complètement
  const stopPreview = async () => {
    // Marquer qu'une opération est en cours
    playOperationInProgress.current = true;
    // Indiquer que nous ne sommes PAS en transition
    isTransitioningRef.current = false;
    
    try {
      // Arrêter l'audio d'abord
      await safeStopAudio();
      
      // Puis réinitialiser les états
      setCurrentPlayingStation(null);
      setCurrentStation(null);
      setLoadingAudio(false);
    } finally {
      // Marquer que l'opération est terminée
      playOperationInProgress.current = false;
    }
  };

  // Arrêter uniquement l'audio sans réinitialiser currentStation (pour les transitions)
  const stopAudioOnly = async () => {
    // Indiquer que nous sommes en transition
    isTransitioningRef.current = true;
    
    try {
      // Arrêter l'audio sans réinitialiser currentStation
      await safeStopAudio();
      setCurrentPlayingStation(null);
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'audio pour transition:', error);
    }
  };

  // Lecture d'un aperçu de la radio
  const playPreview = async (station: RadioStation) => {
    // Si une opération est déjà en cours, ne pas en démarrer une nouvelle
    if (playOperationInProgress.current) {
      return;
    }
    
    // Marquer qu'une opération est en cours
    playOperationInProgress.current = true;
    
    try {
      // Si c'est la même station qui est déjà en cours de lecture, on l'arrête simplement
      if (currentPlayingStation === station.stationuuid) {
        isTransitioningRef.current = false; // Ce n'est pas une transition
        await stopPreview();
        return;
      }
      
      // Garder une copie locale de la station pour la restaurer si nécessaire
      const stationCopy = { ...station };
      
      // Marquer que nous sommes en transition
      isTransitioningRef.current = true;
      
      // Mettre à jour les états immédiatement pour l'interface utilisateur
      setLoadingAudio(true);
      setCurrentStation(stationCopy);
      currentStationRef.current = stationCopy;
      
      // Arrêter la lecture en cours sans réinitialiser currentStation
      await stopAudioOnly();
      
      // Vérifier si currentStation a été réinitialisé par un effet secondaire
      if (!currentStation && currentStationRef.current) {
        setCurrentStation(currentStationRef.current);
      }
      
      // Mettre à jour l'ID de la station en cours de lecture
      setCurrentPlayingStation(station.stationuuid);
      
      // Attendre un court instant pour éviter les conflits entre l'arrêt et le démarrage
      await new Promise(resolve => setTimeout(resolve, AUDIO_TRANSITION_DELAY));
      
      // Vérifier que currentStation est toujours défini
      if (!currentStation) {
        // Restaurer la station depuis la référence
        if (currentStationRef.current) {
          setCurrentStation(currentStationRef.current);
        } else {
          // Si même la référence est nulle, restaurer depuis la copie locale
          setCurrentStation(stationCopy);
          currentStationRef.current = stationCopy;
        }
      }
      
      // Toujours en mode transition pendant la création du son
      isTransitioningRef.current = true;
      
      // Créer et charger un nouvel objet Sound
      
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
              // Nous ne sommes plus en transition une fois que la lecture a démarré
              isTransitioningRef.current = false;
            }
            
            if (status.didJustFinish) {
              isTransitioningRef.current = false; // Pas de transition à la fin
              stopPreview();
            }
          }
        });
        
        // Mettre à jour l'objet sound
        setSound(newSound);
        
      } catch (audioError) {
        console.error('Erreur lors de la création du son:', audioError);
        
        // Attendre un court instant et réessayer une fois
        setTimeout(async () => {
          try {
            // Vérifier si la station est toujours celle qu'on veut jouer
            if (currentPlayingStation !== station.stationuuid) {
              return;
            }
            
            // Réessayer de créer le son
            const { sound: retrySound } = await Audio.Sound.createAsync(
              { uri: station.url_resolved },
              { shouldPlay: true }
            );
            
            retrySound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.isPlaying) {
                setLoadingAudio(false);
              }
            });
            
            setSound(retrySound);
          } catch (retryError) {
            console.error('Échec de la seconde tentative de lecture:', retryError);
            
            // En cas d'échec, réinitialiser les états
            setCurrentPlayingStation(null);
            setCurrentStation(null);
            setLoadingAudio(false);
          }
        }, AUDIO_RETRY_DELAY);
      }
    } catch (error) {
      console.error('Erreur lors de la lecture de la radio:', error);
      
      // En cas d'erreur, réinitialiser les états
      setCurrentPlayingStation(null);
      setCurrentStation(null);
      setLoadingAudio(false);
    } finally {
      // Marquer que l'opération est terminée
      playOperationInProgress.current = false;
    }
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
        
        // Ne pas réinitialiser les états si nous sommes en transition
        setSound(null);
        
        if (!isTransitioningRef.current) {
          setCurrentPlayingStation(null);
          setCurrentStation(null);
        }
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
        currentStation,
        currentStationRef,
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