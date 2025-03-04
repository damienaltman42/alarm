import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RadioStation } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { alarmManager } from '../modules/AlarmManager';
import { favoritesService } from '../modules/FavoritesService';

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
  const { theme, isDarkMode } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Charger l'état des favoris au montage du composant
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const favoriteStatus = await favoritesService.isFavorite(station.stationuuid);
      setIsFavorite(favoriteStatus);
    };
    
    checkFavoriteStatus();
  }, [station.stationuuid]);
  
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
        await alarmManager.stopPreview();
        setIsPlaying(false);
      } else {
        // Démarrer la lecture
        await alarmManager.previewRadio(station.url_resolved, station.name);
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
        await favoritesService.removeFavorite(station.stationuuid);
      } else {
        await favoritesService.addFavorite(station);
      }
      
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Erreur lors de la gestion des favoris:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { 
          backgroundColor: theme.colors.radio.item,
          shadowColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
        },
        isSelected && [
          styles.selectedContainer,
          { 
            backgroundColor: theme.colors.radio.selected,
            borderColor: theme.colors.primary,
          }
        ]
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
            { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }
          ]}>
            <Text style={styles.placeholderText}>📻</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text 
          style={[styles.name, { color: theme.colors.text }]} 
          numberOfLines={1} 
          ellipsizeMode="tail"
        >
          {station.name}
        </Text>
        
        {station.country && (
          <Text 
            style={[styles.country, { color: theme.colors.secondaryText }]} 
            numberOfLines={1}
          >
            {station.country}
          </Text>
        )}
        
        {hasTags && (
          <Text 
            style={[styles.tags, { color: theme.colors.primary }]} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {formatTags(station.tags)}
          </Text>
        )}
      </View>

      {showControls && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: theme.colors.primary }]} 
            onPress={handleToggleFavorite}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={18} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: theme.colors.primary }]} 
            onPress={handlePlayPreview}
            disabled={isLoading}
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

      {isSelected && (
        <View style={[
          styles.selectedIndicator,
          { backgroundColor: theme.colors.primary }
        ]}>
          <Text style={styles.selectedText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedContainer: {
    borderWidth: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  placeholderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  country: {
    fontSize: 14,
    marginBottom: 2,
  },
  tags: {
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

// Utiliser memo pour éviter les rendus inutiles
export default memo(RadioStationItem, (prevProps, nextProps) => {
  return (
    prevProps.station.stationuuid === nextProps.station.stationuuid && 
    prevProps.isSelected === nextProps.isSelected
  );
}); 