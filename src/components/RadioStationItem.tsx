import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RadioStation } from '../types';
import { useTheme, useAlarm, useRadio } from '../hooks';

interface RadioStationItemProps {
  station: RadioStation;
  onPress: (station: RadioStation) => void;
  isSelected?: boolean;
  showControls?: boolean;
}

const RadioStationItem: React.FC<RadioStationItemProps> = ({
  station,
  onPress,
  isSelected = false,
  showControls = true,
}) => {
  const { theme, isDark } = useTheme();
  const { previewRadio, stopPreview } = useAlarm();
  const { addToFavorites, removeFromFavorites, isFavorite: checkIsFavorite } = useRadio();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Charger l'état des favoris au montage du composant
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favoriteStatus = await checkIsFavorite(station.stationuuid);
      setIsFavorite(favoriteStatus);
    };
    
    checkFavoriteStatus();
  }, [station.stationuuid, checkIsFavorite]);
  
  // Fonction pour formater les tags
  const formatTags = (tags: string[] | string | undefined): string => {
    if (!tags) {
      return '';
    }
    
    // Si tags est une chaîne de caractères, la diviser en tableau
    if (typeof tags === 'string') {
      return tags.split(',').slice(0, 3).join(', ');
    }
    
    // Si tags est un tableau
    if (Array.isArray(tags) && tags.length > 0) {
      return tags.slice(0, 3).join(', ');
    }
    
    return '';
  };

  // Vérifier si l'URL du favicon est valide
  const hasValidFavicon = station.favicon && station.favicon.startsWith('http');
  
  // Vérifier si la station a des tags
  const hasTags = !!station.tags && (
    (typeof station.tags === 'string' && station.tags.trim() !== '') || 
    (Array.isArray(station.tags) && station.tags.length > 0)
  );

  // Gérer la lecture de la radio
  const handlePlayPreview = async (event: GestureResponderEvent) => {
    event.stopPropagation?.();
    
    try {
      setIsLoading(true);
      
      if (isPlaying) {
        // Arrêter la lecture
        await stopPreview();
        setIsPlaying(false);
      } else {
        // Démarrer la lecture
        await previewRadio(station.url_resolved);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erreur lors de la lecture de la radio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer l'ajout/suppression des favoris
  const handleToggleFavorite = async (event: GestureResponderEvent) => {
    event.stopPropagation?.();
    
    try {
      if (isFavorite) {
        await removeFromFavorites(station.stationuuid);
      } else {
        await addToFavorites(station);
      }
      
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Erreur lors de la gestion des favoris:', error);
    }
  };

  // Formater le bitrate pour l'affichage
  const formatBitrate = (bitrate?: number): string => {
    if (!bitrate) return '';
    return `${bitrate} kbps`;
  };

  // Déterminer si la station est populaire (pour la mise en évidence)
  const isPopular = station.votes && station.votes > 50;

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { 
          backgroundColor: theme.card,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
        },
        isSelected && [
          styles.selectedContainer,
          { 
            backgroundColor: theme.primary + '20',
            borderColor: theme.primary,
          }
        ],
        isPopular ? styles.popularContainer : undefined
      ]}
      onPress={() => onPress(station)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {hasValidFavicon ? (
          <Image
            source={{ uri: station.favicon }}
            style={styles.icon}
            resizeMode="contain"
          />
        ) : (
          <View style={[
            styles.placeholderIcon,
            { backgroundColor: isDark ? '#333' : '#f0f0f0' }
          ]}>
            <Text style={styles.placeholderText}>📻</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text 
            style={[styles.name, { color: theme.text }]} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {station.name}
          </Text>
          
          {isPopular && (
            <View style={[styles.popularBadge, { backgroundColor: theme.error }]}>
              <Text style={styles.popularText}>XYZ Populaire</Text>
            </View>
          )}
        </View>
        
        <View style={styles.detailsRow}>
          {station.country && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={12} color={theme.secondary} />
              <Text 
                style={[styles.detailText, { color: theme.secondary }]} 
                numberOfLines={1}
              >
                {station.country}
              </Text>
            </View>
          )}
          
          {station.bitrate && (
            <View style={styles.detailItem}>
              <Ionicons name="wifi-outline" size={12} color={theme.secondary} />
              <Text 
                style={[styles.detailText, { color: theme.secondary }]} 
                numberOfLines={1}
              >
                {formatBitrate(station.bitrate)}
              </Text>
            </View>
          )}
          
          {station.votes && (
            <View style={styles.detailItem}>
              <Ionicons name="star-outline" size={12} color={theme.secondary} />
              <Text 
                style={[styles.detailText, { color: theme.secondary }]} 
                numberOfLines={1}
              >
                {station.votes}
              </Text>
            </View>
          )}
        </View>
        
        {hasTags && (
          <View style={styles.tagsContainer}>
            {typeof station.tags === 'string' ? 
              station.tags.split(',').slice(0, 3).map((tag, index) => (
                <View 
                  key={index} 
                  style={[styles.tagBadge, { backgroundColor: theme.primary + '20' }]}
                >
                  <Text style={[styles.tagText, { color: theme.primary }]}>
                    {tag.trim()}
                  </Text>
                </View>
              )) : 
              Array.isArray(station.tags) && station.tags.slice(0, 3).map((tag, index) => (
                <View 
                  key={index} 
                  style={[styles.tagBadge, { backgroundColor: theme.primary + '20' }]}
                >
                  <Text style={[styles.tagText, { color: theme.primary }]}>
                    {tag.trim()}
                  </Text>
                </View>
              ))
            }
          </View>
        )}
      </View>

      {showControls && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: theme.primary }]} 
            onPress={handleToggleFavorite}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={18} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: theme.primary }]} 
            onPress={handlePlayPreview}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons 
                name={isPlaying ? "stop" : "play"} 
                size={18} 
                color="#fff" 
              />
            )}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedContainer: {
    borderWidth: 1,
  },
  popularContainer: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  iconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  popularBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 2,
  },
  detailText: {
    fontSize: 12,
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

// Utiliser memo pour éviter les rendus inutiles
export default memo(RadioStationItem, (prevProps, nextProps) => {
  return (
    prevProps.station.stationuuid === nextProps.station.stationuuid && 
    prevProps.isSelected === nextProps.isSelected
  );
}); 