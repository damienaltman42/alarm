import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alarm } from '../../types';

interface AlarmItemProps {
  alarm: Alarm;
  onPress: (alarm: Alarm) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (alarm: Alarm) => void;
}

const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export const AlarmItem: React.FC<AlarmItemProps> = ({ alarm, onPress, onToggle, onDelete }) => {
  // Formater l'heure pour l'affichage
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  // Formater les jours pour l'affichage
  const formatDays = (days: number[]): string => {
    if (days.length === 7) {
      return 'Tous les jours';
    } else if (days.length === 0) {
      return 'Une fois';
    } else if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
      return 'Jours de semaine';
    } else if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return 'Week-ends';
    } else {
      return days.map(day => daysOfWeek[day]).join(', ');
    }
  };

  // Gérer le changement d'état du switch
  const handleToggle = () => {
    onToggle(alarm.id, !alarm.enabled);
  };

  // Gérer la suppression
  const handleDelete = (e: any) => {
    e.stopPropagation(); // Empêcher la propagation pour éviter d'activer onPress
    onDelete(alarm);
  };

  return (
    <TouchableOpacity
      style={[styles.container, !alarm.enabled && styles.disabled]}
      onPress={() => onPress(alarm)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={[styles.time, !alarm.enabled && styles.disabledText]}>
          {formatTime(alarm.time)}
        </Text>
        
        <View style={styles.detailsContainer}>
          {alarm.label && (
            <Text style={[styles.label, !alarm.enabled && styles.disabledText]}>
              {alarm.label}
            </Text>
          )}
          
          <Text style={[styles.days, !alarm.enabled && styles.disabledText]}>
            {formatDays(alarm.days)}
          </Text>
          
          {alarm.radioStation && (
            <Text style={[styles.radio, !alarm.enabled && styles.disabledText]}>
              📻 {alarm.radioStation.name}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
        
        <Switch
          value={alarm.enabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={alarm.enabled ? '#f5dd4b' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 16,
  },
  detailsContainer: {
    flex: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  days: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  radio: {
    fontSize: 14,
    color: '#0066cc',
  },
  disabledText: {
    color: '#999',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 8,
  },
}); 