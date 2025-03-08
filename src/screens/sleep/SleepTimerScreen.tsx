import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, useRadio, useSleepTimer } from '../../hooks';
import { CircularTimerDisplay } from '../../components/sleep/CircularTimerDisplay';
import { TimePickerWheel } from '../../components/sleep/TimePickerWheel';
import { sleepTimerService } from '../../services/audio/SleepTimerService';

export const SleepTimerScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { t } = useTranslation(['sleep', 'common']);
  
  const { 
    currentPlayingStation,
  } = useRadio();
  
  const { 
    isActive, 
    formattedTime, 
    remainingMs,
    startTimer, 
    stopTimer 
  } = useSleepTimer();
  
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(10);
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [maxSeconds, setMaxSeconds] = useState(600); // 10 minutes par défaut
  // Pour forcer l'animation à s'afficher même si isActive est false
  const [timerRunning, setTimerRunning] = useState(false);
  
  // Animation pour les transitions
  const fadeAnim = useState(new Animated.Value(1))[0];
  
  // Mettre à jour totalSeconds quand remainingMs change
  useEffect(() => {
    if (remainingMs > 0) {
      console.log('[SleepTimerScreen] Temps restant mis à jour:', remainingMs);
      setTotalSeconds(Math.floor(remainingMs / 1000));
      setTimerRunning(true);
      
      // Animation de transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      setTimerRunning(false);
    }
  }, [remainingMs, fadeAnim]);

  // Formater le temps pour l'affichage
  const formatDisplayTime = () => {
    if (remainingMs > 0) {
      return formattedTime;
    } else {
      const h = hours.toString().padStart(2, '0');
      const m = minutes.toString().padStart(2, '0');
      const s = seconds.toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
  };

  // Gérer le démarrage du timer avec vérification
  const handleStartTimer = useCallback(() => {
    // Calculer la durée totale en minutes
    const totalMinutes = hours * 60 + minutes + seconds / 60;
    console.log(`[SleepTimerScreen] Démarrage du timer : ${hours}h ${minutes}m ${seconds}s = ${totalMinutes} minutes`);
    
    if (totalMinutes <= 0) {
      Alert.alert(
        t('sleep:timer.errors.title'), 
        t('sleep:timer.errors.zeroTime')
      );
      return;
    }
    
    try {
      // Animation de transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
      
      // Sauvegarder le max pour l'affichage du cercle
      const totalSecs = hours * 3600 + minutes * 60 + seconds;
      setMaxSeconds(totalSecs);
      setTotalSeconds(totalSecs);
      setTimerRunning(true);
      
      // Démarrer directement le timer via le service pour éviter des problèmes potentiels
      console.log('[SleepTimerScreen] Démarrage du timer avec:', totalMinutes);
      sleepTimerService.startTimer(totalMinutes);
      
      // Vérification après démarrage
      setTimeout(() => {
        const isTimerActive = sleepTimerService.isTimerActive();
        console.log('[SleepTimerScreen] Timer démarré ?', isTimerActive);
        
        if (!isTimerActive) {
          console.warn('[SleepTimerScreen] Le timer ne semble pas s\'être démarré correctement');
        }
      }, 500);
    } catch (error) {
      console.error('[SleepTimerScreen] Erreur lors du démarrage du timer:', error);
      Alert.alert(
        t('sleep:timer.errors.title'), 
        t('sleep:timer.errors.startFailed')
      );
    }
  }, [hours, minutes, seconds, fadeAnim, t]);
  
  // Gérer l'arrêt du timer
  const handleStopTimer = useCallback(() => {
    console.log('[SleepTimerScreen] Arrêt du timer');
    try {
      // Animation de transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
      
      stopTimer();
      // Réinitialiser les compteurs
      setTotalSeconds(0);
      setTimerRunning(false);
    } catch (error) {
      console.error('[SleepTimerScreen] Erreur lors de l\'arrêt du timer:', error);
    }
  }, [stopTimer, fadeAnim]);

  // Vérifier si une radio est en lecture
  const isRadioPlaying = !!currentPlayingStation?.name;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t('sleep:timer.title')}</Text>
        {remainingMs > 0 && (
          <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]}>
            <Text style={styles.activeIndicatorText}>{t('sleep:timer.active')}</Text>
          </View>
        )}
      </View>
      
      <Animated.View 
        style={[
          styles.timerSection,
          { opacity: fadeAnim }
        ]}
      >
        <CircularTimerDisplay
          time={formatDisplayTime()}
          totalSeconds={totalSeconds}
          maxSeconds={maxSeconds}
          isActive={timerRunning}
          radioName={isRadioPlaying ? currentPlayingStation?.name : undefined}
        />
      </Animated.View>
      
      <View style={styles.controlsContainer}>
        {remainingMs > 0 ? (
          <TouchableOpacity 
            style={[styles.cancelButton, { backgroundColor: theme.error }]}
            onPress={handleStopTimer}
          >
            <Ionicons name="stop-circle" size={24} color="#FFFFFF" />
            <Text style={styles.cancelButtonText}>{t('sleep:timer.stop')}</Text>
          </TouchableOpacity>
        ) : (
          <TimePickerWheel
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            onChangeHours={setHours}
            onChangeMinutes={setMinutes}
            onChangeSeconds={setSeconds}
            onStart={handleStartTimer}
            disabled={remainingMs > 0}
          />
        )}
      </View>
      
      {/* Espace supplémentaire pour éviter que le mini-player cache le bouton */}
      <View style={styles.bottomSpacer} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  activeIndicator: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activeIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  timerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
    marginBottom: Platform.OS === 'ios' ? 60 : 40, // Espace pour éviter le mini-player
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  bottomSpacer: {
    height: 40, // Espace supplémentaire en bas
  },
}); 