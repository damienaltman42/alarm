import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { useTheme } from '../../hooks';

interface TimerDurationPickerProps {
  onSelectDuration: (minutes: number) => void;
  selectedDuration: number | null;
}

/**
 * Options de durée prédéfinies en minutes
 */
const DURATION_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 heure', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2 heures', value: 120 },
];

export const TimerDurationPicker: React.FC<TimerDurationPickerProps> = ({
  onSelectDuration,
  selectedDuration
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        Programmer l'arrêt
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsContainer}
      >
        {DURATION_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              { 
                backgroundColor: selectedDuration === option.value 
                  ? theme.primary 
                  : theme.card,
                borderColor: theme.border,
              }
            ]}
            onPress={() => onSelectDuration(option.value)}
          >
            <Text 
              style={[
                styles.optionText, 
                { 
                  color: selectedDuration === option.value 
                    ? '#FFFFFF' 
                    : theme.text 
                }
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
        
        {selectedDuration !== null && (
          <TouchableOpacity
            style={[
              styles.optionButton,
              { 
                backgroundColor: theme.card,
                borderColor: theme.error,
              }
            ]}
            onPress={() => onSelectDuration(0)}
          >
            <Text style={[styles.optionText, { color: theme.error }]}>
              Annuler
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  optionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 