import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RadioStation } from '../types';
import { favoritesService } from '../modules/FavoritesService';
import RadioStationItem from './RadioStationItem';
import { useTheme } from '../contexts/ThemeContext';

interface FavoriteRadioListProps {
  onSelectStation: (station: RadioStation) => void;
  selectedStation?: RadioStation | null;
}

export const FavoriteRadioList: React.FC<FavoriteRadioListProps> = ({
  onSelectStation,
  selectedStation,
}) => {
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  // Charger les favoris au montage du composant
  useEffect(() => {
    loadFavorites();
  }, []);

  // Fonction pour charger les favoris
  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const favoriteStations = await favoritesService.getFavorites();
      setFavorites(favoriteStations);
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Rafraîchir la liste des favoris
  const refreshFavorites = () => {
    loadFavorites();
  };

  // Rendu du contenu
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.secondaryText }]}>
            Chargement des favoris...
          </Text>
        </View>
      );
    }

    if (favorites.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="heart-outline" size={64} color={theme.colors.secondaryText} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            Vous n'avez pas encore de stations favorites
          </Text>
          <Text style={[styles.emptySubText, { color: theme.colors.secondaryText }]}>
            Ajoutez des stations à vos favoris en cliquant sur l'icône ♥
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.stationuuid}
        renderItem={({ item }) => (
          <RadioStationItem
            station={item}
            onPress={onSelectStation}
            isSelected={selectedStation?.stationuuid === item.stationuuid}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={refreshFavorites}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Mes stations favorites
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshFavorites}>
          <Ionicons name="refresh" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      {renderContent()}
    </View>
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
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
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    padding: 16,
  },
}); 