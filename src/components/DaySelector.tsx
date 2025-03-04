import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface DaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

const daysOfWeek = [
  { id: 0, short: 'D', long: 'Dimanche' },
  { id: 1, short: 'L', long: 'Lundi' },
  { id: 2, short: 'M', long: 'Mardi' },
  { id: 3, short: 'M', long: 'Mercredi' },
  { id: 4, short: 'J', long: 'Jeudi' },
  { id: 5, short: 'V', long: 'Vendredi' },
  { id: 6, short: 'S', long: 'Samedi' },
];

export const DaySelector: React.FC<DaySelectorProps> = ({ selectedDays, onChange }) => {
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
          <Text style={styles.presetText}>Tous les jours</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.presetButton} onPress={selectWeekdays}>
          <Text style={styles.presetText}>Jours de semaine</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.presetButton} onPress={selectWeekends}>
          <Text style={styles.presetText}>Week-ends</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.presetButton} onPress={clearSelection}>
          <Text style={styles.presetText}>Effacer</Text>
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