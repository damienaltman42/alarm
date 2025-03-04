import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RadioStation } from '../types';
import { useTheme, useRadio } from '../hooks';

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
  const { isFavorite, addToFavorites, removeFromFavorites } = useRadio();
  const [favorite, setFavorite] = React.useState<boolean>(false);
  const [loadingFavorite, setLoadingFavorite] = React.useState<boolean>(false);
  const [imageError, setImageError] = React.useState<boolean>(false);

  // Vérifier si la station est dans les favoris
  React.useEffect(() => {
    const checkFavorite = async () => {
      const isFav = await isFavorite(station.stationuuid);
      setFavorite(isFav);
    };
    checkFavorite();
  }, [station, isFavorite]);

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

  // État pour suivre si la radio est en cours de lecture
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const { playPreview, stopPreview, currentPlayingStation, loadingAudio } = useRadio();

  // Vérifier si cette station est en cours de lecture
  React.useEffect(() => {
    setIsPlaying(currentPlayingStation === station.stationuuid);
  }, [currentPlayingStation, station.stationuuid]);

  // Vérifier si cette station est en cours de chargement
  const isLoading = loadingAudio && currentPlayingStation === station.stationuuid;

  // Gérer la lecture/arrêt de la radio
  const handlePlayToggle = async (e: any) => {
    e.stopPropagation(); // Empêcher la sélection de la station
    
    try {
      if (isPlaying) {
        // Si cette station est en cours de lecture, on l'arrête
        await stopPreview();
      } else {
        // Sinon, on démarre cette station (cela arrêtera automatiquement toute autre station en cours)
        await playPreview(station);
      }
    } catch (error) {
      console.error('Erreur lors de la gestion de la lecture:', error);
    }
  };

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
            
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: isPlaying ? theme.primary : 'rgba(0,0,0,0.5)' }]}
              onPress={(e) => handlePlayToggle(e)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
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
}); 