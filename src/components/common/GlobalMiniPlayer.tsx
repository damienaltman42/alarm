import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, lightTheme } from '../../contexts/ThemeContext';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { alarmManager } from '../../services/alarm/alarmManager';

// Type simplifié pour la station
interface DisplayStation {
  name: string;
  country?: string;
}

const GlobalMiniPlayer: React.FC = () => {
  const themeContext = React.useContext(ThemeContext);
  const theme = themeContext?.theme || lightTheme;
  const [loading, setLoading] = useState(false);
  const [currentStation, setCurrentStation] = useState<DisplayStation | null>(null);

  // Écouter les changements d'état de prévisualisation
  useEffect(() => {
    console.log("GlobalMiniPlayer - Rendu");
    
    // Fonction pour mettre à jour l'état du lecteur
    const updatePlayerState = () => {
      const previewSource = alarmManager.getPreviewAudioSource();
      
      if (previewSource) {
        const sourceName = previewSource.getName();
        console.log(`GlobalMiniPlayer - Source audio active: ${sourceName}`);
        
        // Extraire le nom du pays si disponible (pour les stations radio)
        let country = '';
        if (sourceName.includes(' - ')) {
          const parts = sourceName.split(' - ');
          country = parts[1] || '';
        }
        
        setCurrentStation({
          name: sourceName,
          country: country
        });
      } else {
        console.log("GlobalMiniPlayer - Pas de source audio active");
        setCurrentStation(null);
      }
      
      setLoading(false);
    };
    
    // Mettre à jour l'état initial
    updatePlayerState();
    
    // Idéalement, nous devrions avoir un système d'événements pour mettre à jour cet état
    // Pour l'instant, nous utilisons un intervalle simple
    const interval = setInterval(updatePlayerState, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Fonction pour arrêter la prévisualisation
  const handleStopPreview = async () => {
    setLoading(true);
    await alarmManager.stopPreview();
    setCurrentStation(null);
    setLoading(false);
  };

  // Si aucune station n'est en cours de lecture, ne rien afficher
  if (!currentStation) {
    console.log("GlobalMiniPlayer - Pas de station en cours");
    return null;
  }

  console.log(`GlobalMiniPlayer - Affichage du mini-player pour: ${currentStation.name}`);

  return (
    <Animated.View 
      style={[styles.container, { backgroundColor: theme.card }]}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
    >
      <View style={styles.infoContainer}>
        <Text style={[styles.stationName, { color: theme.text }]} numberOfLines={1}>
          {currentStation.name}
        </Text>
        {currentStation.country && (
          <Text style={[styles.stationCountry, { color: theme.secondary }]} numberOfLines={1}>
            {currentStation.country}
          </Text>
        )}
      </View>

      <TouchableOpacity 
        style={styles.stopButton} 
        onPress={handleStopPreview}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Ionicons name="stop-circle" size={32} color={theme.primary} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stationCountry: {
    fontSize: 12,
    marginTop: 2,
  },
  stopButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GlobalMiniPlayer; 