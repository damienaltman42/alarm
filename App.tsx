import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { alarmManager } from './src/services/alarm/alarmManager';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AlarmProvider } from './src/contexts/AlarmContext';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { initializeServices } from './src/services';
import TrackPlayer from 'react-native-track-player';
import { stopSilentAudioMode } from './src/services/notification/BackgroundNotificationService';
import { LanguageProvider } from './src/contexts/LanguageContext';
import './src/i18n'; // Importer la configuration i18n

/**
 * Component principal de l'application
 */
export default function App() {
  // Référence pour suivre si les services ont été initialisés
  const servicesInitialized = useRef(false);

  // Initialiser les services au démarrage de l'application
  useEffect(() => {
    const initServices = async () => {
      try {
        // Vérifier si les services ont déjà été initialisés
        if (servicesInitialized.current) {
          console.log('Services déjà initialisés, ignoré');
          return;
        }

        await initializeServices();
        servicesInitialized.current = true;
        console.log('Services initialisés avec succès');
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des services:', error);
      }
    };

    initServices();
  }, []);

  // Initialiser le gestionnaire d'alarmes au démarrage de l'application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Charger les alarmes existantes et les reprogrammer
        const alarms = await alarmManager.getAlarms();
        for (const alarm of alarms) {
          if (alarm.enabled) {
            await alarmManager.updateAlarm(alarm);
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application:', error);
      }
    };
    
    // Surveiller l'état de l'application
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = AppState.currentState;
      console.log(`État de l'application: ${previousState} -> ${nextAppState}`);
      
      if (nextAppState === 'active') {
        // L'application est revenue au premier plan
        console.log('Application revenue au premier plan');
        initializeApp();
      } 
      else if (
        previousState === 'active' && 
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        // L'application passe en arrière-plan
        console.log('Application passée en arrière-plan');
        
        // Vérifier si nous avons une lecture audio active
        try {
          // Utiliser une méthode plus sûre pour vérifier la présence de lecture audio
          let hasActiveAudio = false;
          try {
            // Tenter d'obtenir la position actuelle
            const position = await TrackPlayer.getPosition();
            hasActiveAudio = position >= 0;
            console.log('Position de lecture actuelle:', position);
          } catch (error) {
            console.log('Erreur lors de la vérification de la position de lecture:', error);
          }
          
          if (hasActiveAudio) {
            console.log('Lecture audio active détectée, maintien de la lecture en arrière-plan');
            
            // Sur iOS, nous pouvons avoir besoin d'actions supplémentaires pour assurer la lecture continue
            if (Platform.OS === 'ios') {
              // Pinger le service audio pour le maintenir actif
              setTimeout(() => {
                TrackPlayer.play().catch(e => {
                  // Ignorer les erreurs, c'est juste un ping
                });
              }, 500);
            }
          }
        } catch (error) {
          console.log('Pas de lecteur audio actif ou erreur:', error);
        }
      }
    };
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Initialiser
    initializeApp();
    
    return () => {
      appStateSubscription.remove();
    };
  }, []);

  // Nettoyer les ressources lorsque l'application se ferme
  useEffect(() => {
    return () => {
      // Nettoyer les ressources de l'AlarmManager
      alarmManager.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <LanguageProvider>
        <ThemeProvider>
          <AlarmProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </AlarmProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
} 