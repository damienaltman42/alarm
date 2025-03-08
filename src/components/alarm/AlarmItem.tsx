import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alarm } from '../../types';
import { useColorScheme } from 'react-native';

interface AlarmItemProps {
  alarm: Alarm;
  onPress: (alarm: Alarm) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (alarm: Alarm) => void;
}

export const AlarmItem: React.FC<AlarmItemProps> = ({ alarm, onPress, onToggle, onDelete }) => {
  const { t, i18n } = useTranslation('alarm');
  const colorScheme = useColorScheme();
  
  // Obtenir les jours courts de la semaine depuis les traductions
  const getShortWeekDays = () => [
    t('alarms.shortWeekdays.sunday'),
    t('alarms.shortWeekdays.monday'),
    t('alarms.shortWeekdays.tuesday'),
    t('alarms.shortWeekdays.wednesday'),
    t('alarms.shortWeekdays.thursday'),
    t('alarms.shortWeekdays.friday'),
    t('alarms.shortWeekdays.saturday')
  ];
  
  // Formater l'heure pour l'affichage selon la locale (12h pour anglais, 24h pour français)
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hoursNum = parseInt(hours, 10);
    const minutesNum = parseInt(minutes, 10);
    
    // Créer un objet Date avec les heures et minutes
    const date = new Date();
    date.setHours(hoursNum);
    date.setMinutes(minutesNum);
    
    // Vérifier la langue actuelle
    const currentLanguage = i18n.language;
    
    if (currentLanguage.startsWith('en')) {
      // Format 12h pour l'anglais (1:30 PM)
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
      });
    } else {
      // Format 24h pour les autres langues (13:30)
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  };

  // Formater les jours pour l'affichage
  const formatDays = (days: number[]): string => {
    if (days.length === 7) {
      return t('alarms.repeatFormat.everyday');
    } else if (days.length === 0) {
      return t('alarms.repeatFormat.once');
    } else if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
      return t('alarms.repeatFormat.weekdays');
    } else if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return t('alarms.repeatFormat.weekends');
    } else {
      const shortWeekDays = getShortWeekDays();
      return days.map(day => shortWeekDays[day]).join(', ');
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
      style={[
        styles.container, 
        !alarm.enabled && styles.disabled,
        { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff' }
      ]}
      onPress={() => onPress(alarm)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={[
          styles.time, 
          !alarm.enabled && styles.disabledText,
          { color: colorScheme === 'dark' ? '#fff' : '#000' }
        ]}>
          {formatTime(alarm.time)}
        </Text>
        
        <View style={styles.detailsContainer}>
          {alarm.label && (
            <Text style={[
              styles.label, 
              !alarm.enabled && styles.disabledText,
              { color: colorScheme === 'dark' ? '#fff' : '#000' }
            ]}>
              {alarm.label}
            </Text>
          )}
          
          <Text style={[
            styles.days, 
            !alarm.enabled && styles.disabledText,
            { color: colorScheme === 'dark' ? '#aaa' : '#666' }
          ]}>
            {formatDays(alarm.repeatDays)}
          </Text>
          
          {alarm.radioStation && (
            <Text style={[
              styles.radio, 
              !alarm.enabled && styles.disabledText
            ]}>
              📻 {alarm.radioStation.name}
            </Text>
          )}
          
          {alarm.spotifyPlaylist && (
            <Text style={[
              styles.spotify, 
              !alarm.enabled && styles.disabledText
            ]}>
              🎵 {alarm.spotifyPlaylist.name}
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
  spotify: {
    fontSize: 14,
    color: '#1DB954',
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