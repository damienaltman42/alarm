import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { RadioStation } from '../types';
import { useRadio, useTheme } from '../hooks';
import { RadioStationCard } from './RadioStationCard';

interface FavoriteRadioListProps {
  onSelectStation: (station: RadioStation) => void;
  selectedStation?: RadioStation | null;
  isPlayerMode?: boolean;
}

export const FavoriteRadioList: React.FC<FavoriteRadioListProps> = ({
  onSelectStation,
  selectedStation,
  isPlayerMode = false,
}) => {
  const { theme } = useTheme();
  const { favorites, loading } = useRadio();
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Chargement des favoris...
        </Text>
      </View>
    );
  }
  
  if (favorites.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.emptyText, { color: theme.text }]}>
          Vous n'avez pas encore de stations favorites.
        </Text>
        <Text style={[styles.emptySubText, { color: theme.secondary }]}>
          Ajoutez des stations à vos favoris en cliquant sur l'icône de cœur.
        </Text>
      </View>
    );
  }
  
  return (
    <FlatList
      data={favorites}
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
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
}); 