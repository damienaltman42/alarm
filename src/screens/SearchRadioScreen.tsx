import React from 'react';
import { StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RadioStation } from '../types';
import { useTheme } from '../hooks';
import { RadioSearchContainer } from '../components/radio/RadioSearchContainer';

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
  
  // Sélectionner une station et retourner à l'écran précédent
  const handleSelectStation = (station: RadioStation) => {
    onSelectStation(station);
    navigation.goBack();
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'right', 'left']}>
      <RadioSearchContainer
        isPlayerMode={false}
        selectedStation={selectedStation}
        onSelectStation={handleSelectStation}
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
        title="Rechercher une radio"
        showErrorAlerts={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 