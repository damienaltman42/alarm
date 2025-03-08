import React, { useState, useEffect } from 'react';
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
  const { t, i18n } = useTranslation(['alarm.components', 'alarm.screens']);

  // Déterminer si on doit utiliser le format 24h en fonction de la langue
  const use24HourFormat = !i18n.language.startsWith('en');

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
  
  // État pour stocker l'affichage formaté de l'heure
  const [displayTime, setDisplayTime] = useState<string>('');
  
  // Mettre à jour l'affichage formaté de l'heure quand la date ou la langue change
  useEffect(() => {
    formatDisplayTime();
  }, [date, i18n.language]);
  
  // Formater l'heure pour l'affichage
  const formatDisplayTime = () => {
    if (i18n.language.startsWith('en')) {
      // Format 12h pour l'anglais
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 devient 12
      setDisplayTime(`${hours}:${minutes} ${period}`);
    } else {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setDisplayTime(`${hours}:${minutes}`);
    }
  };

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
      
      // Mettre à jour l'affichage formaté
      formatDisplayTime();
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
            {displayTime}
          </Text>
        </TouchableOpacity>
      )}
      
      {(showPicker || Platform.OS === 'ios') && (
        <View>
          <DateTimePicker
            value={date}
            mode="time"
            is24Hour={use24HourFormat}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            style={styles.picker}
          />
          
          {Platform.OS === 'ios' && (
            <Text style={[styles.iOSTimeDisplay, { color: theme.text }]}>
              {displayTime}
            </Text>
          )}
        </View>
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
  iOSTimeDisplay: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  picker: {
    width: '100%',
  },
}); 