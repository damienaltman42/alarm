import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

interface DaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({ selectedDays, onChange }) => {
  const { t } = useTranslation('alarm.days');

  // Définir les jours de la semaine avec leurs traductions
  const daysOfWeek = [
    { 
      id: 0, 
      short: t('days.single.sunday.short'), 
      long: t('days.single.sunday.long') 
    },
    { 
      id: 1, 
      short: t('days.single.monday.short'), 
      long: t('days.single.monday.long') 
    },
    { 
      id: 2, 
      short: t('days.single.tuesday.short'), 
      long: t('days.single.tuesday.long') 
    },
    { 
      id: 3, 
      short: t('days.single.wednesday.short'), 
      long: t('days.single.wednesday.long') 
    },
    { 
      id: 4, 
      short: t('days.single.thursday.short'), 
      long: t('days.single.thursday.long') 
    },
    { 
      id: 5, 
      short: t('days.single.friday.short'), 
      long: t('days.single.friday.long') 
    },
    { 
      id: 6, 
      short: t('days.single.saturday.short'), 
      long: t('days.single.saturday.long') 
    },
  ];

  // Fonction pour vérifier si un jour est sélectionné
  const isDaySelected = (dayId: number): boolean => {
    return selectedDays.includes(dayId);
  };

  // Fonction pour basculer la sélection d'un jour
  const toggleDay = (dayId: number): void => {
    if (isDaySelected(dayId)) {
      // Si le jour est déjà sélectionné, on le retire
      onChange(selectedDays.filter(id => id !== dayId));
    } else {
      // Sinon, on l'ajoute
      onChange([...selectedDays, dayId].sort());
    }
  };

  // Fonction pour sélectionner tous les jours
  const selectAllDays = (): void => {
    onChange([0, 1, 2, 3, 4, 5, 6]);
  };

  // Fonction pour sélectionner les jours de semaine
  const selectWeekdays = (): void => {
    onChange([1, 2, 3, 4, 5]);
  };

  // Fonction pour sélectionner les jours de week-end
  const selectWeekends = (): void => {
    onChange([0, 6]);
  };

  // Fonction pour effacer la sélection
  const clearSelection = (): void => {
    onChange([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.daysContainer}>
        {daysOfWeek.map(day => (
          <TouchableOpacity
            key={day.id}
            style={[
              styles.dayButton,
              isDaySelected(day.id) && styles.selectedDay,
            ]}
            onPress={() => toggleDay(day.id)}
          >
            <Text
              style={[
                styles.dayText,
                isDaySelected(day.id) && styles.selectedDayText,
              ]}
            >
              {day.short}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.presetContainer}>
        <TouchableOpacity style={styles.presetButton} onPress={selectAllDays}>
          <Text style={styles.presetText}>{t('days.presets.allDays')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.presetButton} onPress={selectWeekdays}>
          <Text style={styles.presetText}>{t('days.presets.weekdays')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.presetButton} onPress={selectWeekends}>
          <Text style={styles.presetText}>{t('days.presets.weekends')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.presetButton} onPress={clearSelection}>
          <Text style={styles.presetText}>{t('days.presets.clear')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDay: {
    backgroundColor: '#0066cc',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedDayText: {
    color: '#fff',
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  presetText: {
    fontSize: 14,
    color: '#333',
  },
}); 