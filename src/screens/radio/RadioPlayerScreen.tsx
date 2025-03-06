import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RadioStation } from '../../types';
import { useRadio, useTheme } from '../../hooks';
import { RadioSearchContainer } from '../../components/radio/RadioSearchContainer';

export const RadioPlayerScreen: React.FC = () => {
  const { theme } = useTheme();
  const { playPreview } = useRadio();
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null);
  
  // Gérer la lecture d'une station
  const handlePlayStation = async (station: RadioStation) => {
    setSelectedStation(station);
    await playPreview(station);
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'right', 'left']}>
      <RadioSearchContainer
        isPlayerMode={true}
        selectedStation={selectedStation}
        onSelectStation={handlePlayStation}
        title="Radio"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 