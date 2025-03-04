import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alarm } from '../types';
import { AlarmItem } from '../components/AlarmItem';
import { alarmManager } from '../modules/AlarmManager';

interface AlarmListScreenProps {
  navigation: any;
}

export const AlarmListScreen: React.FC<AlarmListScreenProps> = ({ navigation }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Charger les alarmes à chaque fois que l'écran est affiché
  useFocusEffect(
    useCallback(() => {
      loadAlarms();
    }, [])
  );

  // Charger les alarmes depuis le gestionnaire d'alarmes
  const loadAlarms = async (): Promise<void> => {
    try {
      setLoading(true);
      const loadedAlarms = await alarmManager.getAlarms();
      setAlarms(loadedAlarms);
    } catch (error) {
      console.error('Erreur lors du chargement des alarmes:', error);
      Alert.alert('Erreur', 'Impossible de charger les alarmes.');
    } finally {
      setLoading(false);
    }
  };

  // Gérer l'activation/désactivation d'une alarme
  const handleToggleAlarm = async (id: string, enabled: boolean): Promise<void> => {
    try {
      await alarmManager.toggleAlarm(id, enabled);
      // Mettre à jour la liste des alarmes
      loadAlarms();
    } catch (error) {
      console.error('Erreur lors de la modification de l\'alarme:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'alarme.');
    }
  };

  // Gérer la suppression d'une alarme
  const handleDeleteAlarm = (alarm: Alarm): void => {
    Alert.alert(
      'Supprimer l\'alarme',
      'Êtes-vous sûr de vouloir supprimer cette alarme ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await alarmManager.deleteAlarm(alarm.id);
              // Mettre à jour la liste des alarmes
              loadAlarms();
            } catch (error) {
              console.error('Erreur lors de la suppression de l\'alarme:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'alarme.');
            }
          },
        },
      ]
    );
  };

  // Gérer l'édition d'une alarme
  const handleEditAlarm = (alarm: Alarm): void => {
    navigation.navigate('AddAlarm', { alarm });
  };

  // Gérer l'appui long sur une alarme (pour la supprimer)
  const handleLongPressAlarm = (alarm: Alarm): void => {
    handleDeleteAlarm(alarm);
  };

  // Rendu d'un élément vide si aucune alarme n'est configurée
  const renderEmptyList = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alarm-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>Aucune alarme configurée</Text>
      <Text style={styles.emptySubtext}>
        Appuyez sur le bouton + pour ajouter votre première alarme
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Mes Alarmes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddAlarm')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlarmItem
            alarm={item}
            onPress={handleEditAlarm}
            onToggle={handleToggleAlarm}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          alarms.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmptyList}
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  listContent: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
}); 