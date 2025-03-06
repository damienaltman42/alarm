import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alarm } from '../../types';
import { AlarmItem } from '../../components/alarm/AlarmItem';
import { useAlarm, useTheme } from '../../hooks';

interface AlarmListScreenProps {
  navigation: any;
}

export const AlarmListScreen: React.FC<AlarmListScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const alarmHook = useAlarm();
  const { alarms, loading } = alarmHook;
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Charger les alarmes lorsque l'écran est affiché
  useFocusEffect(
    useCallback(() => {
      // Les alarmes sont déjà chargées via le contexte
      return () => {
        // Nettoyage si nécessaire
      };
    }, [])
  );

  // Rafraîchir la liste
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Attendre un peu pour simuler le rafraîchissement
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Gérer l'activation/désactivation d'une alarme
  const handleToggleAlarm = async (id: string, enabled: boolean): Promise<void> => {
    try {
      await alarmHook.toggleAlarm(id, enabled);
    } catch (error) {
      console.error('Erreur lors de la modification de l\'alarme:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'alarme');
    }
  };

  // Gérer la suppression d'une alarme
  const handleDeleteAlarm = (alarm: Alarm) => {
    Alert.alert(
      'Supprimer l\'alarme',
      `Êtes-vous sûr de vouloir supprimer l'alarme de ${alarm.time} ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await alarmHook.deleteAlarm(alarm.id);
            } catch (error) {
              console.error('Erreur lors de la suppression de l\'alarme:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'alarme');
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Mes alarmes</Text>
        <TouchableOpacity
          style={[styles.headerAddButton, { backgroundColor: theme.primary }]}
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
            onToggle={handleToggleAlarm}
            onPress={() => handleEditAlarm(item)}
            onDelete={handleDeleteAlarm}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          alarms.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmptyList}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
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
  headerAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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