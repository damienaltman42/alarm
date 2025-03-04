import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RadioStation } from '../types';
import { RadioSearch } from '../components/RadioSearch';

type RootStackParamList = {
  AlarmList: undefined;
  AddAlarm: { alarm?: any };
  SearchRadio: { onSelectStation: (station: RadioStation) => void; selectedStation?: RadioStation | null };
};

type SearchRadioScreenRouteProp = RouteProp<RootStackParamList, 'SearchRadio'>;
type SearchRadioScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SearchRadio'>;

interface SearchRadioScreenProps {
  route: SearchRadioScreenRouteProp;
  navigation: SearchRadioScreenNavigationProp;
}

export const SearchRadioScreen: React.FC<SearchRadioScreenProps> = ({ route, navigation }) => {
  const { onSelectStation, selectedStation } = route.params;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Rechercher une radio</Text>
        <View style={styles.placeholder} />
      </View>
      
      <RadioSearch
        onSelectStation={onSelectStation}
        selectedStation={selectedStation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
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
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
}); 