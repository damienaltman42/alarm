import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RadioStation } from '../../types';
import { useTheme, useRadio } from '../../hooks';

// Variable globale pour empêcher les opérations concurrentes
let isOperationInProgress = false;
// Temps de verrouillage en ms
const OPERATION_LOCK_TIME = 1500;

interface RadioStationCardProps {
  station: RadioStation;
  onSelect: (station: RadioStation) => void;
  isSelected?: boolean;
  showSelectButton?: boolean;
}

export const RadioStationCard: React.FC<RadioStationCardProps> = ({
  station,
  onSelect,
  isSelected = false,
  showSelectButton = true,
}) => {
  const { theme } = useTheme();
  const { isFavorite, addToFavorites, removeFromFavorites, playPreview, stopPreview, currentPlayingStation, loadingAudio } = useRadio();
  
  // États locaux
  const [favorite, setFavorite] = useState<boolean>(false);
  const [loadingFavorite, setLoadingFavorite] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isPlayingUI, setIsPlayingUI] = useState<boolean>(false);
  // État local de verrouillage pour cette instance
  const [localLocked, setLocalLocked] = useState<boolean>(false);
  // État pour gérer le message d'erreur
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Animation pour faire disparaître le message d'erreur
  const errorOpacity = useRef(new Animated.Value(0)).current;
  
  // Référence pour les timeouts
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction utilitaire pour acquérir un verrou
  const acquireLock = (operation: string): boolean => {
    if (isOperationInProgress || localLocked) {
      console.log(`[Radio] Opération ignorée car une autre est en cours: ${operation} pour "${station.name}"`);
      return false;
    }
    
    console.log(`[Radio] Verrouillage acquis pour l'opération: ${operation} pour "${station.name}"`);
    isOperationInProgress = true;
    setLocalLocked(true);
    
    // Libération automatique du verrou après un délai
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    
    lockTimeoutRef.current = setTimeout(() => {
      isOperationInProgress = false;
      setLocalLocked(false);
      console.log(`[Radio] Verrouillage libéré automatiquement après ${OPERATION_LOCK_TIME}ms pour "${station.name}"`);
    }, OPERATION_LOCK_TIME);
    
    return true;
  };

  // Fonction utilitaire pour libérer un verrou
  const releaseLock = (operation: string, force: boolean = false) => {
    if (force || !localLocked) {
      isOperationInProgress = false;
      setLocalLocked(false);
      
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
      
      console.log(`[Radio] Verrouillage libéré manuellement pour "${station.name}" - ${operation}`);
    } else {
      console.log(`[Radio] Libération programmée pour "${station.name}" - ${operation}`);
      // La libération sera faite par le timeout
    }
  };

  // Fonction pour afficher un message d'erreur temporaire
  const showTemporaryError = (message: string, duration: number = 3000) => {
    // Effacer tout message d'erreur et timeout précédents
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    
    // Définir le nouveau message
    setErrorMessage(message);
    
    // Animer l'apparition du message
    errorOpacity.setValue(1);
    
    // Programmer la disparition du message
    errorTimeoutRef.current = setTimeout(() => {
      // Animer la disparition
      Animated.timing(errorOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Effacer le message une fois l'animation terminée
        setErrorMessage(null);
      });
    }, duration);
  };

  // Nettoyage des timeouts lors du démontage
  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Vérifier si la station est dans les favoris
  useEffect(() => {
    const checkFavorite = async () => {
      const isFav = await isFavorite(station.stationuuid);
      setFavorite(isFav);
    };
    checkFavorite();
  }, [station, isFavorite]);

  // Vérifier si cette station est en cours de lecture (basé sur la comparaison de noms)
  useEffect(() => {
    if (!currentPlayingStation) {
      if (isPlayingUI) {
        setIsPlayingUI(false);
      }
      return;
    }
    
    // Comparaison basée sur le nom et le pays au lieu de l'UUID qui peut être temporaire
    const isThisPlaying = currentPlayingStation.name === station.name && 
                         currentPlayingStation.country === station.country;
    
    if (isPlayingUI !== isThisPlaying) {
      console.log(`[Radio] Mise à jour pour "${station.name}" (${station.country}): ` +
                 `lecture=${isThisPlaying ? 'active' : 'inactive'}, ` +
                 `station courante="${currentPlayingStation.name}" (${currentPlayingStation.country})`);
      setIsPlayingUI(isThisPlaying);
      
      // Si notre station vient de démarrer la lecture, on peut libérer le verrou
      if (isThisPlaying) {
        console.log(`[Radio] Lecture démarrée avec succès pour "${station.name}"`);
        releaseLock("lecture démarrée");
      }
    }
  }, [currentPlayingStation, station.name, station.country]);

  // Gérer la lecture/arrêt de la radio
  const handlePlayToggle = async (e: any) => {
    e.stopPropagation(); // Empêcher la sélection de la station
    
    // Vérifier si une opération est déjà en cours
    if (!acquireLock(`Toggle play pour "${station.name}"`)) {
      return; // Opération ignorée à cause du verrouillage
    }
    
    try {
      // Si cette carte indique actuellement que la station joue
      if (isPlayingUI) {
        console.log(`[Radio] Arrêt demandé pour "${station.name}"`);
        
        try {
          // Mise à jour UI locale immédiate
          setIsPlayingUI(false);
          // Effectuer l'action d'arrêt
          await stopPreview();
          console.log(`[Radio] Arrêt réussi pour "${station.name}"`);
        } catch (error) {
          // Gestion spécifique des erreurs connues
          if (error instanceof Error) {
            if (error.message.includes("sound is not loaded")) {
              console.log(`[Radio] Erreur ignorée lors de l'arrêt: ${error.message}`);
            } else {
              // Pour les autres erreurs, on peut aussi notifier l'utilisateur
              showTemporaryError(`Impossible d'arrêter "${station.name}"`);
              // Pas besoin de relancer l'erreur, on la gère ici
            }
          }
        }
        
        // Libérer le verrou dans tous les cas
        releaseLock("arrêt terminé");
      } else {
        console.log(`[Radio] Lecture demandée pour "${station.name}"`);
        console.log(`[Radio] Démarrage de la lecture pour "${station.name}"`);
        
        // Mise à jour UI locale immédiate
        setIsPlayingUI(true);
        
        try {
          // Démarrer la lecture (ce qui arrêtera toute autre lecture)
          await playPreview(station);
          console.log(`[Radio] Lecture démarrée avec succès pour "${station.name}", déverrouillage prévu`);
          // Le verrou sera libéré par l'effet quand isThisPlaying deviendra true
        } catch (error) {
          // En cas d'erreur, restaurer l'état précédent et libérer le verrou
          console.error(`[Radio] Erreur lors du démarrage pour "${station.name}":`, error);
          
          // Gestion spécifique des erreurs connues
          if (error instanceof Error) {
            if (error.message.includes("CoreMediaErrorDomain") && error.message.includes("-16830")) {
              // Erreur spécifique à un problème de flux audio
              console.log(`[Radio] Erreur de flux pour "${station.name}": Le flux audio n'est pas disponible ou incompatible`);
              
              // Afficher un message d'erreur temporaire à l'utilisateur
              showTemporaryError(`Flux audio non disponible pour "${station.name}"`);
            } else if (error.message.includes("sound is not loaded")) {
              console.log(`[Radio] Erreur ignorée: ${error.message}`);
            } else {
              // Pour les autres erreurs, on peut aussi notifier l'utilisateur
              showTemporaryError(`Impossible de lire "${station.name}"`);
            }
          }
          
          setIsPlayingUI(false);
          releaseLock("erreur de lecture", true);
        }
      }
    } catch (error) {
      console.error(`[Radio] Erreur pour "${station.name}":`, error);
      // En cas d'erreur, restaurer l'état précédent
      setIsPlayingUI(!isPlayingUI);
      // Libérer le verrou en cas d'erreur
      releaseLock("erreur générale", true);
    }
  };

  // Gérer l'ajout/suppression des favoris
  const handleFavoriteToggle = async () => {
    setLoadingFavorite(true);
    try {
      if (favorite) {
        await removeFromFavorites(station.stationuuid);
      } else {
        await addToFavorites(station);
      }
      setFavorite(!favorite);
    } catch (error) {
      console.error('Erreur lors de la gestion des favoris:', error);
    } finally {
      setLoadingFavorite(false);
    }
  };

  // Formater les tags pour l'affichage
  const formatTags = () => {
    if (typeof station.tags === 'string') {
      return station.tags.split(',').slice(0, 3).join(', ');
    } else if (Array.isArray(station.tags)) {
      return station.tags.slice(0, 3).join(', ');
    }
    return '';
  };

  // Formater les votes pour l'affichage
  const formatVotes = () => {
    if (!station.votes) return '0 votes';
    if (station.votes > 1000) {
      return `${(station.votes / 1000).toFixed(1)}k votes`;
    }
    return `${station.votes} votes`;
  };

  // État de chargement
  const isLoading = (loadingAudio || localLocked) && 
                  (currentPlayingStation !== null && 
                   currentPlayingStation.name === station.name &&
                   currentPlayingStation.country === station.country);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card },
        isSelected && showSelectButton && { borderColor: theme.primary, borderWidth: 2 },
      ]}
      onPress={() => onSelect(station)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.mediaSection}>
          <View style={styles.imageContainer}>
            {!imageError ? (
              <Image
                source={{ uri: station.favicon || 'https://via.placeholder.com/80' }}
                style={styles.image}
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: theme.primary + '30' }]}>
                <Ionicons name="radio-outline" size={30} color={theme.primary} />
              </View>
            )}
            
            {/* Message d'erreur qui s'affiche au-dessus du bouton play */}
            {errorMessage && (
              <Animated.View 
                style={[
                  styles.errorContainer, 
                  { 
                    backgroundColor: 'rgba(220, 38, 38, 0.9)', // Rouge semi-transparent
                    opacity: errorOpacity 
                  }
                ]}
              >
                <Text style={styles.errorText} numberOfLines={2}>
                  {errorMessage}
                </Text>
              </Animated.View>
            )}
            
            <TouchableOpacity
              style={[
                styles.playButton, 
                { 
                  backgroundColor: isPlayingUI ? theme.primary : 'rgba(0,0,0,0.5)',
                  opacity: localLocked ? 0.7 : 1 // Réduire l'opacité si verrouillé
                }
              ]}
              onPress={handlePlayToggle}
              disabled={isLoading || localLocked}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isPlayingUI ? 'pause' : 'play'}
                  size={22}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={[styles.stationName, { color: theme.text }]} numberOfLines={1}>
            {station.name}
          </Text>
          
          <View style={styles.detailsRow}>
            <Ionicons name="globe-outline" size={14} color={theme.secondary} />
            <Text style={[styles.detailText, { color: theme.secondary }]} numberOfLines={1}>
              {station.country}
            </Text>
          </View>
          
          {(typeof station.tags === 'string' && station.tags.length > 0) || 
           (Array.isArray(station.tags) && station.tags.length > 0) ? (
            <View style={styles.detailsRow}>
              <Ionicons name="pricetag-outline" size={14} color={theme.secondary} />
              <Text style={[styles.detailText, { color: theme.secondary }]} numberOfLines={1}>
                {formatTags()}
              </Text>
            </View>
          ) : null}
          
          {station.votes ? (
            <View style={styles.detailsRow}>
              <Ionicons name="star-outline" size={14} color={theme.secondary} />
              <Text style={[styles.detailText, { color: theme.secondary }]}>
                {formatVotes()}
              </Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.actionsContainer}>
          {showSelectButton && (
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: isSelected ? theme.primary : 'transparent' }]}
              onPress={() => onSelect(station)}
            >
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                size={28}
                color={isSelected ? '#fff' : theme.primary}
              />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoriteToggle}
            disabled={loadingFavorite}
          >
            {loadingFavorite ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons
                name={favorite ? 'heart' : 'heart-outline'}
                size={26}
                color={favorite ? theme.primary : theme.secondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: 12,
    position: 'relative',
  },
  mediaSection: {
    position: 'relative',
    marginRight: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    opacity: 0.9,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 40,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 4,
  },
  actionsContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    bottom: 8,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  favoriteButton: {
    padding: 4,
  },
  selectButton: {
    padding: 4,
    borderRadius: 20,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    zIndex: 10,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
}); 