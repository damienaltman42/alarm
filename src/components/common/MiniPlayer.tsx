import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RadioStation } from '../../types';
import { useTheme } from '../../hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MiniPlayerProps {
  station: RadioStation;
  isLoading: boolean;
  onStop: () => Promise<void>;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ station, isLoading, onStop }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Calculer la hauteur du mini-player en tenant compte de la barre de navigation
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10;
  
  // Fonction pour gérer l'arrêt de la lecture
  const handleStop = async () => {
    try {
      await onStop();
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la lecture:', error);
    }
  };
  
  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.card,
          paddingBottom: bottomPadding,
          bottom: 60, // Hauteur de la barre d'onglets
        }
      ]}
    >
      <View style={styles.stationInfo}>
        {station.favicon ? (
          <View style={styles.favicon}>
            <Text style={styles.faviconText}>📻</Text>
          </View>
        ) : (
          <View style={styles.favicon}>
            <Text style={styles.faviconText}>📻</Text>
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.stationName, { color: theme.text }]} numberOfLines={1}>
            {station.name}
          </Text>
          <Text style={[styles.stationDetails, { color: theme.secondary }]} numberOfLines={1}>
            {station.country} • {typeof station.bitrate === 'number' ? `${station.bitrate}kbps` : ''}
          </Text>
        </View>
      </View>
      
      <View style={styles.controls}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.secondary }]}>Chargement...</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.stopButton} 
            onPress={handleStop}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons name="stop-circle" size={32} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  stationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favicon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  faviconText: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stationDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  stopButton: {
    padding: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  loadingText: {
    fontSize: 12,
    marginLeft: 6,
  },
}); 