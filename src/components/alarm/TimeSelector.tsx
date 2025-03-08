import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../../hooks';
import { useTranslation } from 'react-i18next';

interface TimeSelectorProps {
  time: string; // Format "HH:MM"
  onChange: (time: string) => void;
  useScreenLabel?: boolean; // Indique si on utilise le label de l'écran ou du composant
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({ 
  time, 
  onChange, 
  useScreenLabel = false 
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation(['alarm.components', 'alarm.screens']);

  // Convertir la chaîne de temps en objet Date
  const getDateFromTimeString = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // État pour stocker la date sélectionnée
  const [date, setDate] = useState<Date>(getDateFromTimeString(time));
  
  // État pour contrôler la visibilité du sélecteur sur Android
  const [showPicker, setShowPicker] = useState<boolean>(Platform.OS === 'ios');

  // Gérer le changement de temps
  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date): void => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate) {
      setDate(selectedDate);
      
      // Formater l'heure pour la passer au parent
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      onChange(`${hours}:${minutes}`);
    }
  };

  // Afficher le sélecteur sur Android
  const showTimePicker = (): void => {
    setShowPicker(true);
  };

  // Obtenir le label approprié en fonction du contexte
  const getLabel = () => {
    return useScreenLabel 
      ? t('alarm.screens:addAlarm.time') 
      : t('alarm.components:timeSelector.label');
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{getLabel()}</Text>
      
      {Platform.OS === 'android' && (
        <TouchableOpacity 
          style={[styles.timeDisplay, { backgroundColor: theme.card }]} 
          onPress={showTimePicker}
        >
          <Text style={[styles.timeText, { color: theme.text }]}>
            {date.getHours().toString().padStart(2, '0')}:
            {date.getMinutes().toString().padStart(2, '0')}
          </Text>
        </TouchableOpacity>
      )}
      
      {(showPicker || Platform.OS === 'ios') && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          style={styles.picker}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  timeDisplay: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  picker: {
    width: '100%',
  },
}); 