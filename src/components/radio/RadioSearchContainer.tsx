import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RadioStation, RadioSearchParams } from '../../types';
import { useRadio, useTheme, useErrorHandling } from '../../hooks';
import { AdvancedRadioSearch } from './AdvancedRadioSearch';
import { InfiniteRadioList } from './InfiniteRadioList';
import { FavoriteRadioList } from './FavoriteRadioList';

interface RadioSearchContainerProps {
  isPlayerMode?: boolean;
  selectedStation?: RadioStation | null;
  onSelectStation: (station: RadioStation) => void;
  onBackPress?: () => void;
  showBackButton?: boolean;
  title?: string;
  showErrorAlerts?: boolean;
}

export const RadioSearchContainer: React.FC<RadioSearchContainerProps> = ({
  isPlayerMode = false,
  selectedStation,
  onSelectStation,
  onBackPress,
  showBackButton = false,
  title = 'Radio',
  showErrorAlerts = false,
}) => {
  const { theme } = useTheme();
  const { 
    loadCountries, 
    loadTags, 
    countries, 
    tags, 
    loading,
  } = useRadio();
  
  const { error, handleError } = useErrorHandling({ 
    showAlerts: showErrorAlerts,
    context: 'RadioSearch'
  });
  
  const [searchParams, setSearchParams] = useState<RadioSearchParams>({
    hidebroken: true,
    order: 'votes',
    reverse: true,
    limit: 20,
  });
  
  const [showFavorites, setShowFavorites] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [stationsFound, setStationsFound] = useState(false);
  
  useEffect(() => {
    // Charger les données initiales
    loadInitialData();
  }, []);
  
  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadCountries(true),  // Force le rafraîchissement depuis l'API
        loadTags(true)        // Force le rafraîchissement depuis l'API
      ]);
    } catch (error) {
      handleError(error as Error, 'chargement des données initiales');
    }
  };
  
  // Gérer la recherche
  const handleSearch = async (params: RadioSearchParams): Promise<void> => {
    setShowFavorites(false);
    setSearchParams(params);
    setHasSearched(true);
    setStationsFound(false); // Réinitialiser avant de commencer une nouvelle recherche
  };
  
  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        
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
            onSelectStation={onSelectStation}
            selectedStation={selectedStation}
            isPlayerMode={isPlayerMode}
          />
        ) : (
          <InfiniteRadioList
            searchParams={searchParams}
            onSelectStation={onSelectStation}
            selectedStation={selectedStation}
            isPlayerMode={isPlayerMode}
            onResultsLoaded={(results: RadioStation[]) => {
              setStationsFound(results.length > 0);
            }}
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
      
      {/* Afficher un message si aucune station n'est trouvée après une recherche */}
      {!loading && hasSearched && !stationsFound && !showFavorites && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.secondary }]}>
            Aucune station trouvée. Veuillez modifier vos critères de recherche.
          </Text>
        </View>
      )}
      
      {/* Afficher un message d'erreur s'il y en a un et aucun résultat n'est affiché */}
      {!loading && error && !stationsFound && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.errorText, { color: theme.error || 'red' }]}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    flex: 1,
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
}); 