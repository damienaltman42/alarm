import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { RadioStation } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface RadioStationItemProps {
  station: RadioStation;
  onPress: (station: RadioStation) => void;
  isSelected?: boolean;
}

const RadioStationItem: React.FC<RadioStationItemProps> = ({
  station,
  onPress,
  isSelected = false,
}) => {
  const { theme, isDarkMode } = useTheme();
  
  // Fonction pour formater les tags
  const formatTags = (tags: string[] | undefined): string => {
    console.log('Tags reçus:', tags);
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      console.log('Tags invalides ou vides');
      return '';
    }
    console.log('Tags valides, formatage:', tags.slice(0, 3));
    return tags.slice(0, 3).join(', ');
  };

  // Vérifier si l'URL du favicon est valide
  const hasValidFavicon = station.favicon && station.favicon.startsWith('http');

  // Log des données de la station pour débogage
  console.log('Station:', {
    name: station.name,
    country: station.country,
    tagsType: station.tags ? typeof station.tags : 'undefined',
    hasTags: !!station.tags
  });

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
        
        {station.tags && Array.isArray(station.tags) && station.tags.length > 0 && (
          <Text 
            style={[styles.tags, { color: theme.colors.primary }]} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {formatTags(station.tags)}
          </Text>
        )}
      </View>

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