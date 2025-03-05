import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { RadioStation, Country, Tag } from '../../types';
import { useRadio, useTheme } from '../../hooks';
import RadioStationItem from './RadioStationItem';
import { FavoriteRadioList } from './FavoriteRadioList';

interface RadioSearchProps {
  onSelectStation: (station: RadioStation) => void; // Fonction pour sélectionner une station
  selectedStation?: RadioStation | null;
}

// Types de recherche disponibles
type SearchMode = 'name' | 'country' | 'tag' | 'favorites';

export const RadioSearch: React.FC<RadioSearchProps> = ({
  onSelectStation,
  selectedStation,
}) => {
  const { theme } = useTheme();
  const { 
    stations: radioStations, 
    favorites,
    countries: radioCountries,
    tags: radioTags,
    loading: radioLoading,
    error: radioError,
    searchStations,
    loadCountries,
    loadTags
  } = useRadio();
  
  const [searchMode, setSearchMode] = useState<SearchMode>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Variable pour stocker la référence au champ de recherche
  const searchInputRef = React.useRef<TextInput>(null);

  // Charger les pays et tags au démarrage
  useEffect(() => {
    loadCountriesData();
    loadTagsData();
  }, []);

  // Réinitialiser les recherches lors du changement d'onglet
  useEffect(() => {
    // Réinitialiser les résultats de recherche et l'erreur
    setStations([]);
    setError(null);
    setSearchQuery('');
  }, [searchMode]);

  // Réinitialiser l'erreur lorsque des stations sont trouvées
  useEffect(() => {
    if (stations.length > 0 && error) {
      console.log('Stations trouvées, réinitialisation du message d\'erreur');
      setError(null);
    }
  }, [stations, error]);

  // Charger la liste des pays
  const loadCountriesData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const countriesData = await loadCountries();
      // Trier par nombre de stations (décroissant)
      setCountries(countriesData.sort((a, b) => b.stationcount - a.stationcount));
    } catch (error) {
      console.error('Erreur lors du chargement des pays:', error);
      setError('Impossible de charger la liste des pays.');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger la liste des tags
  const loadTagsData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const tagsData = await loadTags();
      // Trier par nombre de stations (décroissant)
      setTags(tagsData.sort((a, b) => b.stationcount - a.stationcount).slice(0, 100));
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error);
      setError('Impossible de charger la liste des tags.');
    } finally {
      setIsLoading(false);
    }
  };

  // Recherche directe par nom
  const searchByName = () => {
    if (!searchQuery.trim()) {
      Alert.alert('Recherche vide', 'Veuillez entrer un terme de recherche.');
      return;
    }
    
    console.log(`Lancement de recherche par nom: "${searchQuery}"`);
    setIsLoading(true);
    setError(null);
    setStations([]);
    
    const searchParams = {
      name: searchQuery,
      hidebroken: true,
      is_https: true,
      order: 'votes' as 'votes',
      reverse: true,
      limit: 20
    };
    
    console.log('Paramètres de recherche:', searchParams);
    
    searchStations(searchParams)
      .then((results) => {
        console.log(`Recherche par nom "${searchQuery}": ${results.length} résultats`);
        setStations(results);
        
        if (results.length === 0) {
          setError(`Aucune station trouvée pour le nom "${searchQuery}".`);
        } else {
          setError(null);
        }
      })
      .catch((err) => {
        console.error('Erreur lors de la recherche par nom:', err);
        setError('Une erreur est survenue lors de la recherche.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Effectuer une recherche générale
  const performSearch = async () => {
    if (searchMode === 'favorites') {
      // Pas besoin de recherche pour les favoris
      return;
    }
    
    // Vérifier que la recherche n'est pas vide (sauf pour les pays)
    if (searchMode !== 'country' && !searchQuery.trim()) {
      Alert.alert('Recherche vide', 'Veuillez entrer un terme de recherche.');
      return;
    }

    console.log(`Exécution de la recherche par ${searchMode}: "${searchQuery}"`);
    setIsLoading(true);
    setError(null);
    setStations([]);

    try {
      // Préparer les paramètres de recherche selon le mode
      const searchParams = {
        [searchMode === 'name' ? 'name' : searchMode === 'country' ? 'country' : 'tag']: searchQuery,
        limit: 20,
        order: 'votes' as 'votes',
        reverse: true,
        hidebroken: true,
        is_https: true
      };
      
      console.log('Paramètres de recherche:', searchParams);
      
      // Effectuer la recherche
      const results = await searchStations(searchParams);
      
      console.log(`Recherche par ${searchMode} "${searchQuery}": ${results.length} résultats`);
      
      // Mettre à jour l'état des stations
      setStations(results);
      
      // Définir un message d'erreur personnalisé si aucun résultat n'est trouvé
      if (results.length === 0) {
        if (searchMode === 'name') {
          setError(`Aucune station trouvée pour le nom "${searchQuery}".`);
        } else if (searchMode === 'country') {
          setError(`Aucune station trouvée pour le pays "${searchQuery}".`);
        } else {
          setError(`Aucune station trouvée pour le genre "${searchQuery}".`);
        }
      } else {
        // S'assurer que l'erreur est réinitialisée si des résultats sont trouvés
        setError(null);
      }
    } catch (err) {
      console.error(`Erreur lors de la recherche par ${searchMode}:`, err);
      setError('Une erreur est survenue lors de la recherche. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sélectionner un pays pour la recherche
  const selectCountry = (country: Country) => {
    console.log('============================= selectedCountry START=============================');
    console.log(country);
    console.log('============================= selectedCountry END=============================');
    
    setSearchQuery(country.name);
    setIsLoading(true);
    setError(null);
    setStations([]);
    
    // Utiliser le code ISO du pays pour la recherche
    console.log(`Code pays ajouté à la recherche: ${country.iso_3166_1}`);
    
    // Recherche directe par code pays
    const searchParams = {
      countrycode: country.iso_3166_1,
      hidebroken: true,
      is_https: true,
      order: 'votes' as 'votes',
      reverse: true,
      limit: 20
    };
    
    console.log('Paramètres de recherche:', searchParams);
    
    searchStations(searchParams)
      .then((results) => {
        console.log(`Recherche par pays "${country.name}" (${country.iso_3166_1}): ${results.length} résultats`);
        setStations(results);
        
        if (results.length === 0) {
          setError(`Aucune station trouvée pour le pays "${country.name}".`);
        } else {
          setError(null);
        }
      })
      .catch((err) => {
        console.error('Erreur lors de la recherche par pays:', err);
        setError('Une erreur est survenue lors de la recherche par pays.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Sélectionner un tag pour la recherche
  const selectTag = (tag: Tag) => {
    console.log('============================= selectedTag START=============================');
    console.log(tag);
    console.log('============================= selectedTag END=============================');
    
    setSearchQuery(tag.name);
    setIsLoading(true);
    setError(null);
    setStations([]);
    
    // Recherche directe par tag
    searchStations({
      tag: tag.name,
      hidebroken: true,
      is_https: true,
      order: 'votes',
      reverse: true,
      limit: 20
    })
    .then((results) => {
      console.log(`Recherche par tag "${tag.name}": ${results.length} résultats`);
      setStations(results);
      
      if (results.length === 0) {
        setError(`Aucune station trouvée pour le genre "${tag.name}".`);
      } else {
        setError(null);
      }
    })
    .catch((err) => {
      console.error('Erreur lors de la recherche par tag:', err);
      setError('Une erreur est survenue lors de la recherche par genre.');
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  // Afficher les onglets de mode de recherche
  const renderSearchModeTabs = () => {
    return (
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            searchMode === 'name' && [
              styles.activeTab,
              { borderBottomColor: theme.primary }
            ]
          ]}
          onPress={() => setSearchMode('name')}
        >
          <Text
            style={[
              styles.tabText,
              searchMode === 'name' && [
                styles.activeTabText,
                { color: theme.primary }
              ]
            ]}
          >
            Nom
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            searchMode === 'country' && [
              styles.activeTab,
              { borderBottomColor: theme.primary }
            ]
          ]}
          onPress={() => setSearchMode('country')}
        >
          <Text
            style={[
              styles.tabText,
              searchMode === 'country' && [
                styles.activeTabText,
                { color: theme.primary }
              ]
            ]}
          >
            Pays
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            searchMode === 'tag' && [
              styles.activeTab,
              { borderBottomColor: theme.primary }
            ]
          ]}
          onPress={() => setSearchMode('tag')}
        >
          <Text
            style={[
              styles.tabText,
              searchMode === 'tag' && [
                styles.activeTabText,
                { color: theme.primary }
              ]
            ]}
          >
            Genre
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            searchMode === 'favorites' && [
              styles.activeTab,
              { borderBottomColor: theme.primary }
            ]
          ]}
          onPress={() => setSearchMode('favorites')}
        >
          <Text
            style={[
              styles.tabText,
              searchMode === 'favorites' && [
                styles.activeTabText,
                { color: theme.primary }
              ]
            ]}
          >
            Favoris
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Afficher le champ de recherche
  const renderSearchInput = () => {
    if (searchMode === 'favorites') return null;
    
    return (
      <View style={styles.searchInputContainer}>
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { backgroundColor: theme.card, color: theme.text }]}
          placeholder={
            searchMode === 'name' ? 'Rechercher une station par nom...' :
            searchMode === 'country' ? 'Rechercher un pays...' :
            'Rechercher un genre musical...'
          }
          placeholderTextColor={theme.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (searchMode === 'name') {
              searchByName();
            } else {
              performSearch();
            }
          }}
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            if (searchMode === 'name') {
              searchByName();
            } else {
              performSearch();
            }
          }}
        >
          <Text style={styles.searchButtonText}>Rechercher</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Rendu du contenu en fonction du mode de recherche
  const renderContent = (): JSX.Element => {
    // Si on est en mode favoris, afficher le composant FavoriteRadioList
    if (searchMode === 'favorites') {
      return (
        <FavoriteRadioList
          onSelectStation={onSelectStation}
          selectedStation={selectedStation}
        />
      );
    }
    
    // Afficher le chargement
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondary }]}>
            Recherche en cours...
          </Text>
        </View>
      );
    }

    // Afficher les résultats de recherche s'il y en a
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
    
    // Afficher le message d'erreur s'il y en a un et qu'aucune station n'a été trouvée
    if (error && stations.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        </View>
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
                style={[styles.suggestionItem, { backgroundColor: theme.card }]}
                onPress={() => selectCountry(item)}
              >
                <Text style={[styles.suggestionText, { color: theme.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.suggestionCount, { color: theme.secondary }]}>
                  {item.stationcount} stations
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Pays populaires
              </Text>
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
                style={[styles.suggestionItem, { backgroundColor: theme.card }]}
                onPress={() => selectTag(item)}
              >
                <Text style={[styles.suggestionText, { color: theme.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.suggestionCount, { color: theme.secondary }]}>
                  {item.stationcount} stations
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Genres populaires
              </Text>
            }
          />
        );
      
      default:
        return (
          <View style={styles.centerContainer}>
            <Text style={[styles.infoText, { color: theme.secondary }]}>
              {searchMode === 'name'
                ? 'Recherchez des stations par nom'
                : searchMode === 'country'
                ? 'Sélectionnez un pays'
                : 'Sélectionnez un genre musical'}
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderSearchModeTabs()}
      
      {renderSearchInput()}
      
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
  searchInputContainer: {
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