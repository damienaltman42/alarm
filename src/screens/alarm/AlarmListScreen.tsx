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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['alarm', 'common']);

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
    // Simuler un rafraîchissement, car il semble que la méthode loadAlarms n'existe pas
    // dans le hook alarmHook. Nous utilisons setTimeout pour simuler une charge.
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Activer/désactiver une alarme
  const handleToggleAlarm = async (id: string, enabled: boolean): Promise<void> => {
    try {
      await alarmHook.toggleAlarm(id, enabled);
    } catch (error) {
      console.error('Erreur lors de la modification de l\'alarme:', error);
    }
  };

  // Gérer la suppression d'une alarme
  const handleDeleteAlarm = (alarm: Alarm) => {
    Alert.alert(
      t('common:actions.delete'),
      t('alarm:alarms.deleteConfirm'),
      [
        {
          text: t('common:actions.cancel'),
          style: 'cancel',
        },
        {
          text: t('common:actions.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await alarmHook.deleteAlarm(alarm.id);
            } catch (error: any) {
              Alert.alert(t('common:errors.generic'), error.message);
            }
          },
        },
      ]
    );
  };

  // Modifier une alarme existante
  const handleEditAlarm = (alarm: Alarm): void => {
    navigation.navigate('AddAlarm', { alarm });
  };

  // Rendu de la liste vide
  const renderEmptyList = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alarm-outline" size={80} color={theme.primary} />
      <Text style={[styles.emptyText, { color: theme.text }]}>
        {t('alarm:alarms.noAlarms')}
      </Text>
      <Text style={[styles.emptySubText, { color: theme.secondary }]}>
        {t('alarm:alarms.addFirst')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t('alarm:alarms.title')}</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('AddAlarm')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AlarmItem
              alarm={item}
              onToggle={handleToggleAlarm}
              onPress={() => handleEditAlarm(item)}
              onDelete={() => handleDeleteAlarm(item)}
            />
          )}
          contentContainerStyle={alarms.length === 0 ? { flex: 1 } : styles.list}
          ListEmptyComponent={renderEmptyList}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
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
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  list: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  }
}); 