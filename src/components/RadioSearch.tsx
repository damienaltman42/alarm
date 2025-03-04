import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RadioStation, Country, Tag } from '../types';
import { radioService } from '../modules/RadioService';
import RadioStationItem from './RadioStationItem';

interface RadioSearchProps {
  onSelectStation: (station: RadioStation) => void;
  selectedStation?: RadioStation | null;
}

type SearchMode = 'name' | 'country' | 'tag';

export const RadioSearch: React.FC<RadioSearchProps> = ({
  onSelectStation,
  selectedStation,
}) => {
  // États pour la recherche
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMode, setSearchMode] = useState<SearchMode>('name');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Charger les pays et tags au démarrage
  useEffect(() => {
    loadCountries();
    loadTags();
  }, []);

  // Charger la liste des pays
  const loadCountries = async (): Promise<void> => {
    try {
      const countriesData = await radioService.getCountries();
      // Trier par nombre de stations (décroissant)
      setCountries(countriesData.sort((a, b) => b.stationcount - a.stationcount));
    } catch (error) {
      console.error('Erreur lors du chargement des pays:', error);
      setError('Impossible de charger la liste des pays.');
    }
  };

  // Charger la liste des tags
  const loadTags = async (): Promise<void> => {
    try {
      const tagsData = await radioService.getTags();
      // Trier par nombre de stations (décroissant)
      setTags(tagsData.sort((a, b) => b.stationcount - a.stationcount).slice(0, 100));
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
      setError('Impossible de charger la liste des tags.');
    }
  };

  // Effectuer la recherche
  const performSearch = async (): Promise<void> => {
    if (!searchQuery.trim() && searchMode === 'name') {
      Alert.alert('Recherche vide', 'Veuillez entrer un terme de recherche.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let results: RadioStation[] = [];

      switch (searchMode) {
        case 'name':
          results = await radioService.searchStationsByName(searchQuery);
          break;
        case 'country':
          results = await radioService.getStationsByCountry(searchQuery);
          break;
        case 'tag':
          results = await radioService.getStationsByTag(searchQuery);
          break;
      }

      setStations(results);
      
      if (results.length === 0) {
        setError('Aucune station trouvée. Essayez d\'autres termes de recherche.');
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setError('Une erreur est survenue lors de la recherche. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sélectionner un pays dans la liste
  const selectCountry = (country: Country): void => {
    setSearchQuery(country.name);
    setSearchMode('country');
    performSearch();
  };

  // Sélectionner un tag dans la liste
  const selectTag = (tag: Tag): void => {
    setSearchQuery(tag.name);
    setSearchMode('tag');
    performSearch();
  };

  // Rendu des onglets de mode de recherche
  const renderSearchModeTabs = (): JSX.Element => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, searchMode === 'name' && styles.activeTab]}
        onPress={() => setSearchMode('name')}
      >
        <Text style={[styles.tabText, searchMode === 'name' && styles.activeTabText]}>
          Nom
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, searchMode === 'country' && styles.activeTab]}
        onPress={() => setSearchMode('country')}
      >
        <Text style={[styles.tabText, searchMode === 'country' && styles.activeTabText]}>
          Pays
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, searchMode === 'tag' && styles.activeTab]}
        onPress={() => setSearchMode('tag')}
      >
        <Text style={[styles.tabText, searchMode === 'tag' && styles.activeTabText]}>
          Genre
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Rendu du contenu en fonction du mode de recherche
  const renderContent = (): JSX.Element => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (stations.length > 0) {
      return (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.stationuuid}
          renderItem={({ item }) => (
            <RadioStationItem
              station={item}
              onPress={onSelectStation}
              isSelected={selectedStation?.stationuuid === item.stationuuid}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    // Afficher les suggestions en fonction du mode
    switch (searchMode) {
      case 'country':
        return (
          <FlatList
            data={countries.slice(0, 20)}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => selectCountry(item)}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
                <Text style={styles.suggestionCount}>
                  {item.stationcount} stations
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>Pays populaires</Text>
            }
          />
        );
      
      case 'tag':
        return (
          <FlatList
            data={tags.slice(0, 20)}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => selectTag(item)}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
                <Text style={styles.suggestionCount}>
                  {item.stationcount} stations
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>Genres populaires</Text>
            }
          />
        );
      
      default:
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.infoText}>
              Recherchez une station de radio par son nom
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderSearchModeTabs()}
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={
            searchMode === 'name'
              ? 'Rechercher par nom de station...'
              : searchMode === 'country'
              ? 'Rechercher par pays...'
              : 'Rechercher par genre musical...'
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={performSearch}
          returnKeyType="search"
        />
        
        <TouchableOpacity style={styles.searchButton} onPress={performSearch}>
          <Text style={styles.searchButtonText}>Rechercher</Text>
        </TouchableOpacity>
      </View>
      
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066cc',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#0066cc',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: '#0066cc',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#cc0000',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  suggestionCount: {
    fontSize: 14,
    color: '#666',
  },
}); 