import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RadioStation, RadioSearchParams } from '../types';
import { useRadio, useTheme } from '../hooks';
import { AdvancedRadioSearch } from '../components/AdvancedRadioSearch';
import { InfiniteRadioList } from '../components/InfiniteRadioList';
import { FavoriteRadioList } from '../components/FavoriteRadioList';

type RootStackParamList = {
  AlarmList: undefined;
  AddAlarm: { alarm?: any };
  SearchRadio: { 
    onSelectStation: (station: RadioStation) => void; 
    selectedStation?: RadioStation | null;
  };
};

type SearchRadioScreenRouteProp = RouteProp<RootStackParamList, 'SearchRadio'>;
type SearchRadioScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SearchRadio'>;

interface SearchRadioScreenProps {
  route: SearchRadioScreenRouteProp;
  navigation: SearchRadioScreenNavigationProp;
}

export const SearchRadioScreen: React.FC<SearchRadioScreenProps> = ({ route, navigation }) => {
  const { onSelectStation, selectedStation } = route.params;
  const { theme } = useTheme();
  const { 
    searchStations, 
    loadCountries, 
    loadTags, 
    stations, 
    countries, 
    tags, 
    loading,
    error 
  } = useRadio();
  
  const [searchParams, setSearchParams] = useState<RadioSearchParams>({
    hidebroken: true,
    order: 'votes',
    reverse: true,
    limit: 20,
  });
  
  const [showFavorites, setShowFavorites] = useState(false);
  
  useEffect(() => {
    // Charger les données initiales
    loadInitialData();
  }, []);
  
  useEffect(() => {
    // Afficher une alerte en cas d'erreur
    if (error) {
      Alert.alert(
        'Erreur',
        error,
        [{ text: 'OK' }]
      );
    }
  }, [error]);
  
  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadCountries(),
        loadTags()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert(
        'Erreur de chargement',
        'Impossible de charger les données. Veuillez vérifier votre connexion et réessayer.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Gérer la recherche
  const handleSearch = async (params: RadioSearchParams): Promise<void> => {
    setShowFavorites(false);
    setSearchParams(params);
  };
  
  // Sélectionner une station
  const handleSelectStation = (station: RadioStation) => {
    // Appliquer la sélection de la station
    onSelectStation(station);
    
    // Revenir à l'écran précédent
    navigation.goBack();
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'right', 'left']}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Rechercher une radio</Text>
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
            onSelectStation={handleSelectStation}
            selectedStation={selectedStation}
          />
        ) : (
          <InfiniteRadioList
            searchParams={searchParams}
            onSelectStation={handleSelectStation}
            selectedStation={selectedStation}
          />
        )}
      </View>
      
      {/* Afficher un indicateur de chargement si nécessaire */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      )}
      
      {/* Afficher un message si aucune station n'est trouvée */}
      {!loading && stations.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
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
  backButton: {
    padding: 8,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 