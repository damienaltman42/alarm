import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RadioContext } from '../contexts/RadioContext';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, lightTheme } from '../contexts/ThemeContext';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const GlobalMiniPlayer: React.FC = () => {
  const radioContext = useContext(RadioContext);
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || lightTheme;

  // Logging pour le debug
  useEffect(() => {
    console.log("GlobalMiniPlayer - Rendu");
    console.log("RadioContext disponible:", !!radioContext);
    if (radioContext) {
      console.log("CurrentStation:", radioContext.currentStation ? radioContext.currentStation.name : null);
      console.log("LoadingAudio:", radioContext.loadingAudio);
      console.log("CurrentPlayingStation:", radioContext.currentPlayingStation);
    }
  }, [radioContext?.currentStation, radioContext?.loadingAudio, radioContext?.currentPlayingStation]);

  // Si aucun contexte radio n'est disponible, ne rien afficher
  if (!radioContext) {
    console.log("GlobalMiniPlayer - Pas de contexte radio");
    return null;
  }

  const { currentStation, loadingAudio, stopPreview, currentStationRef } = radioContext;
  
  // Utiliser currentStation ou currentStationRef si currentStation est null
  const displayStation = currentStation || currentStationRef.current;

  // Si aucune station n'est en cours de lecture, ne rien afficher
  if (!displayStation) {
    console.log("GlobalMiniPlayer - Pas de station en cours");
    return null;
  }

  console.log(`GlobalMiniPlayer - Affichage du mini-player pour: ${displayStation.name}`);

  return (
    <Animated.View 
      style={[styles.container, { backgroundColor: theme.card }]}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
    >
      <View style={styles.infoContainer}>
        <Text style={[styles.stationName, { color: theme.text }]} numberOfLines={1}>
          {displayStation.name}
        </Text>
        <Text style={[styles.stationCountry, { color: theme.secondary }]} numberOfLines={1}>
          {displayStation.country}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.stopButton} 
        onPress={stopPreview}
        disabled={loadingAudio}
      >
        {loadingAudio ? (
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