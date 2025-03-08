import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks';

interface TimePickerWheelProps {
  hours: number;
  minutes: number;
  seconds: number;
  onChangeHours: (hours: number) => void;
  onChangeMinutes: (minutes: number) => void;
  onChangeSeconds: (seconds: number) => void;
  onStart: () => void;
  disabled?: boolean;
}

export const TimePickerWheel: React.FC<TimePickerWheelProps> = ({
  hours,
  minutes,
  seconds,
  onChangeHours,
  onChangeMinutes,
  onChangeSeconds,
  onStart,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation(['sleep', 'common']);
  
  // Fonctions pour incrémenter/décrémenter
  const incrementHours = () => onChangeHours(hours < 12 ? hours + 1 : 0);
  const decrementHours = () => onChangeHours(hours > 0 ? hours - 1 : 12);
  
  const incrementMinutes = () => onChangeMinutes(minutes < 59 ? minutes + 1 : 0);
  const decrementMinutes = () => onChangeMinutes(minutes > 0 ? minutes - 1 : 59);
  
  const incrementSeconds = () => onChangeSeconds(seconds < 59 ? seconds + 1 : 0);
  const decrementSeconds = () => onChangeSeconds(seconds > 0 ? seconds - 1 : 59);
  
  const formatValue = (value: number) => value.toString().padStart(2, '0');
  
  // Calculer la durée totale pour vérifier si le timer peut être démarré
  const isTimeSet = useMemo(() => {
    return hours > 0 || minutes > 0 || seconds > 0;
  }, [hours, minutes, seconds]);
  
  // Fonction pour gérer le clic sur le bouton de démarrage
  const handleStartPress = () => {
    console.log('[TimePickerWheel] Bouton de démarrage pressé', { hours, minutes, seconds, isTimeSet, disabled });
    if (isTimeSet && !disabled) {
      console.log('[TimePickerWheel] Appel de onStart()');
      onStart();
    }
  };
  
  // Déterminer les couleurs du bouton principal
  const buttonBackgroundColor = useMemo(() => {
    if (disabled) return theme.card;
    if (!isTimeSet) return theme.card;
    return theme.primary;
  }, [disabled, isTimeSet, theme]);
  
  const buttonTextColor = useMemo(() => {
    if (disabled) return theme.secondary;
    if (!isTimeSet) return theme.secondary;
    return "#FFFFFF";
  }, [disabled, isTimeSet, theme]);
  
  return (
    <View style={styles.container}>
      <View style={styles.timeSelectors}>
        {/* Sélecteur d'heures */}
        <View style={styles.selectorContainer}>
          <TouchableOpacity 
            style={[
              styles.arrowButton, 
              { 
                backgroundColor: theme.card,
                shadowColor: disabled ? 'transparent' : theme.primary, 
              }
            ]} 
            onPress={incrementHours}
            disabled={disabled}
          >
            <Ionicons 
              name="chevron-up" 
              size={22} 
              color={disabled ? theme.secondary : theme.primary} 
            />
          </TouchableOpacity>
          
          <View 
            style={[
              styles.valueContainer, 
              { 
                backgroundColor: theme.card,
                borderColor: hours > 0 ? theme.primary + '40' : 'transparent',
              }
            ]}
          >
            <Text style={[styles.valueText, { color: theme.text }]}>
              {formatValue(hours)}
            </Text>
            <Text style={[styles.unitText, { color: theme.secondary }]}>{t('sleep:picker.hours')}</Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.arrowButton, 
              { 
                backgroundColor: theme.card,
                shadowColor: disabled ? 'transparent' : theme.primary,
              }
            ]} 
            onPress={decrementHours}
            disabled={disabled}
          >
            <Ionicons 
              name="chevron-down" 
              size={22} 
              color={disabled ? theme.secondary : theme.primary} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Sélecteur de minutes */}
        <View style={styles.selectorContainer}>
          <TouchableOpacity 
            style={[
              styles.arrowButton, 
              { 
                backgroundColor: theme.card, 
                shadowColor: disabled ? 'transparent' : theme.primary,
              }
            ]} 
            onPress={incrementMinutes}
            disabled={disabled}
          >
            <Ionicons 
              name="chevron-up" 
              size={22} 
              color={disabled ? theme.secondary : theme.primary} 
            />
          </TouchableOpacity>
          
          <View 
            style={[
              styles.valueContainer, 
              { 
                backgroundColor: theme.card,
                borderColor: minutes > 0 ? theme.primary + '40' : 'transparent',
              }
            ]}
          >
            <Text style={[styles.valueText, { color: theme.text }]}>
              {formatValue(minutes)}
            </Text>
            <Text style={[styles.unitText, { color: theme.secondary }]}>{t('sleep:picker.minutes')}</Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.arrowButton, 
              { 
                backgroundColor: theme.card,
                shadowColor: disabled ? 'transparent' : theme.primary,
              }
            ]} 
            onPress={decrementMinutes}
            disabled={disabled}
          >
            <Ionicons 
              name="chevron-down" 
              size={22} 
              color={disabled ? theme.secondary : theme.primary} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Sélecteur de secondes */}
        <View style={styles.selectorContainer}>
          <TouchableOpacity 
            style={[
              styles.arrowButton, 
              { 
                backgroundColor: theme.card,
                shadowColor: disabled ? 'transparent' : theme.primary,
              }
            ]} 
            onPress={incrementSeconds}
            disabled={disabled}
          >
            <Ionicons 
              name="chevron-up" 
              size={22} 
              color={disabled ? theme.secondary : theme.primary} 
            />
          </TouchableOpacity>
          
          <View 
            style={[
              styles.valueContainer, 
              { 
                backgroundColor: theme.card,
                borderColor: seconds > 0 ? theme.primary + '40' : 'transparent',
              }
            ]}
          >
            <Text style={[styles.valueText, { color: theme.text }]}>
              {formatValue(seconds)}
            </Text>
            <Text style={[styles.unitText, { color: theme.secondary }]}>{t('sleep:picker.seconds')}</Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.arrowButton, 
              { 
                backgroundColor: theme.card,
                shadowColor: disabled ? 'transparent' : theme.primary,
              }
            ]} 
            onPress={decrementSeconds}
            disabled={disabled}
          >
            <Ionicons 
              name="chevron-down" 
              size={22} 
              color={disabled ? theme.secondary : theme.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.startButton, 
          { 
            backgroundColor: buttonBackgroundColor,
            opacity: isTimeSet && !disabled ? 1 : 0.6,
            shadowColor: isTimeSet && !disabled ? theme.primary : 'transparent',
          }
        ]}
        onPress={handleStartPress}
        disabled={!isTimeSet || disabled}
        activeOpacity={0.8}
      >
        <Ionicons 
          name="play-circle" 
          size={24} 
          color={buttonTextColor} 
        />
        <Text style={[styles.startButtonText, { color: buttonTextColor }]}>
          {t('sleep:picker.start')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  timeSelectors: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  selectorContainer: {
    alignItems: 'center',
    marginHorizontal: 10,
    width: 70,
  },
  arrowButton: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 23,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  valueContainer: {
    width: 70,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  valueText: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 3,
  },
  startButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
}); 