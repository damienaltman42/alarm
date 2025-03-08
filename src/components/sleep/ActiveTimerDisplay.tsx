import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks';

interface ActiveTimerDisplayProps {
  formattedTime: string;
  onCancel: () => void;
}

export const ActiveTimerDisplay: React.FC<ActiveTimerDisplayProps> = ({
  formattedTime,
  onCancel,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.primary + '20' }]}>
      <View style={styles.timerContent}>
        <Ionicons name="time-outline" size={24} color={theme.primary} />
        <Text style={[styles.timerText, { color: theme.primary }]}>
          Arrêt programmé dans {formattedTime}
        </Text>
      </View>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Ionicons name="close-circle" size={24} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  timerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    padding: 4,
  },
}); 