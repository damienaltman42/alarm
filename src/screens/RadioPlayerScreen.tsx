import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RadioStation, RadioSearchParams } from '../types';
import { useRadio, useTheme } from '../hooks';
import { AdvancedRadioSearch } from '../components/AdvancedRadioSearch';
import { InfiniteRadioList } from '../components/InfiniteRadioList';
import { FavoriteRadioList } from '../components/FavoriteRadioList';

export const RadioPlayerScreen: React.FC = () => {
  const { theme } = useTheme();
  const { 
    searchStations, 
    loadCountries, 
    loadTags, 
    stations, 
    countries, 
    tags, 
    loading,
    error,
    playPreview
  } = useRadio();
  
  const [searchParams, setSearchParams] = useState<RadioSearchParams>({
    hidebroken: true,
    order: 'votes',
    reverse: true,
    limit: 20,
  });
  
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null);
  
  useEffect(() => {
    // Charger les données initiales
    loadInitialData();
  }, []);
  
  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadCountries(),
        loadTags()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };
  
  // Gérer la recherche
  const handleSearch = async (params: RadioSearchParams): Promise<void> => {
    setShowFavorites(false);
    setSearchParams(params);
  };
  
  // Gérer la lecture d'une station
  const handlePlayStation = async (station: RadioStation) => {
    setSelectedStation(station);
    await playPreview(station);
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'right', 'left']}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Text style={[styles.title, { color: theme.text }]}>Radio</Text>
        <TouchableOpacity
          style={styles.favoritesButton}
          onPress={() => setShowFavorites(!showFavorites)}
        >
          <Ionicons 
            name={showFavorites ? "heart" : "heart-outline"} 
            size={24} 
            color={showFavorites ? theme.primary : theme.text} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {!showFavorites && (
          <AdvancedRadioSearch
            onSearch={handleSearch}
            countries={countries}
            tags={tags}
            isLoading={loading}
          />
        )}
        
        {showFavorites ? (
          <FavoriteRadioList
            onSelectStation={handlePlayStation}
            selectedStation={selectedStation}
            isPlayerMode={true}
          />
        ) : (
          <InfiniteRadioList
            searchParams={searchParams}
            onSelectStation={handlePlayStation}
            selectedStation={selectedStation}
            isPlayerMode={true}
          />
        )}
      </View>
      
      {/* Afficher un indicateur de chargement si nécessaire */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Recherche en cours...</Text>
        </View>
      )}
      
      {/* Afficher un message si aucune station n'est trouvée */}
      {!loading && stations.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.secondary }]}>
            Aucune station trouvée. Veuillez modifier vos critères de recherche.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  favoritesButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 