import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { RadioStation, RadioSearchParams } from '../../types';
import { RadioStationCard } from './RadioStationCard';
import { useTheme, useRadio } from '../../hooks';

interface InfiniteRadioListProps {
  searchParams: RadioSearchParams;
  onSelectStation: (station: RadioStation) => void;
  selectedStation?: RadioStation | null;
  isPlayerMode?: boolean;
  onResultsLoaded: (stations: RadioStation[]) => void;
}

export const InfiniteRadioList: React.FC<InfiniteRadioListProps> = ({
  searchParams,
  onSelectStation,
  selectedStation,
  isPlayerMode = false,
  onResultsLoaded,
}) => {
  const { theme } = useTheme();
  const { searchStations } = useRadio();
  
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const PAGE_SIZE = 20;
  
  // On garde une référence memoized des paramètres de recherche pour comparer
  const searchParamsRef = useRef(searchParams);
  
  // Charger les stations initiales
  const loadStations = useCallback(async (refresh = false) => {
    if (loading || (loadingMore && !refresh)) return;
    
    try {
      setError(null);
      
      if (refresh) {
        setRefreshing(true);
        setCurrentOffset(0);
      } else {
        setLoadingMore(true);
      }
      
      const params: RadioSearchParams = {
        ...searchParams,
        limit: PAGE_SIZE,
        offset: refresh ? 0 : currentOffset,
      };
      
      console.log(`Chargement des stations - offset: ${params.offset}, limit: ${params.limit}`);
      
      const results = await searchStations(params);
      
      console.log(`Stations reçues: ${results.length}`);
      
      if (refresh) {
        console.log('Rafraîchissement - remplacement de toutes les stations');
        setStations(results);
        setCurrentOffset(results.length > 0 ? PAGE_SIZE : 0);
      } else {
        // Filtrer les doublons basés sur stationuuid
        const existingIds = new Set(stations.map(station => station.stationuuid));
        const newStations = results.filter(station => !existingIds.has(station.stationuuid));
        
        console.log(`Ajout de ${newStations.length} nouvelles stations (doublons filtrés: ${results.length - newStations.length})`);
        
        setStations(prev => [...prev, ...newStations]);
        setCurrentOffset(prev => prev + (newStations.length > 0 ? PAGE_SIZE : 0));
      }
      
      // Notifier le parent du résultat de la recherche
      onResultsLoaded(refresh ? results : results.length > 0 ? results : []);
      
      // Il y a plus de résultats si nous avons reçu exactement PAGE_SIZE stations
      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error('Erreur lors du chargement des stations:', error);
      setError('Une erreur est survenue lors du chargement des stations.');
      // Notifier le parent qu'aucun résultat n'a été trouvé
      onResultsLoaded([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [searchParams, currentOffset, loading, loadingMore, searchStations, onResultsLoaded, stations]);
  
  // Charger les stations au montage ou lorsque les paramètres de recherche changent
  useEffect(() => {
    // Vérifier si les paramètres ont vraiment changé (comparaison profonde)
    const paramsChanged = JSON.stringify(searchParamsRef.current) !== JSON.stringify(searchParams);
    
    if (paramsChanged) {
      console.log('Paramètres de recherche modifiés, réinitialisation de la liste');
      searchParamsRef.current = searchParams;
      setStations([]);
      setCurrentOffset(0);
      setHasMore(true);
      loadStations(true);
    }
  }, [searchParams, loadStations]);
  
  // Charger plus de stations
  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      setLoadingMore(true);
      loadStations();
    }
  };
  
  // Rafraîchir la liste
  const handleRefresh = () => {
    if (!loading) {
      loadStations(true);
    }
  };
  
  // Rendu du footer de la liste
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.footerText, { color: theme.secondary }]}>
          Chargement...
        </Text>
      </View>
    );
  };
  
  // Rendu d'un message d'erreur
  const renderError = () => {
    if (!error) return null;
    
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
      </View>
    );
  };
  
  // Rendu d'un message si aucun résultat
  const renderEmpty = () => {
    if (loading || stations.length > 0) return null;
    
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.emptyText, { color: theme.text }]}>
          Aucune station trouvée. Essayez d'autres critères de recherche.
        </Text>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {renderError()}
      
      <FlatList
        data={stations}
        keyExtractor={(item, index) => `${item.stationuuid}-${index}`}
        renderItem={({ item }) => (
          <RadioStationCard
            station={item}
            onSelect={onSelectStation}
            isSelected={selectedStation?.stationuuid === item.stationuuid}
            showSelectButton={!isPlayerMode}
          />
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      />
      
      {loading && !refreshing && (
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
          <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Recherche en cours...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    margin: 16,
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
}); 