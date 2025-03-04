import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
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
  const { countries, tags, loadCountries, loadTags } = useRadio();
  
  const [searchParams, setSearchParams] = useState<RadioSearchParams>({
    hidebroken: true,
    order: 'votes',
    reverse: true,
    limit: 20,
  });
  
  const [showFavorites, setShowFavorites] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Charger les pays et tags au démarrage
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadCountries(),
        loadTags(),
      ]);
      setIsLoading(false);
    };
    
    loadData();
  }, []);
  
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
            isLoading={isLoading}
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
}); 