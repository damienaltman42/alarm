import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppState, AppStateStatus } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { alarmManager } from './src/modules/AlarmManager';
import { ThemeProvider } from './src/contexts/ThemeContext';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_ALARM_TASK = 'BACKGROUND_ALARM_TASK';

// Définir la tâche en arrière-plan
TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
  try {
    // Vérifier s'il y a des alarmes à déclencher
    const activeAlarmId = alarmManager.getActiveAlarmId();
    if (activeAlarmId) {
      // L'alarme est déjà active, ne rien faire
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Vérifier les alarmes imminentes
    const alarms = await alarmManager.getAlarms();
    
    for (const alarm of alarms) {
      if (alarm.enabled) {
        // Vérifier si l'alarme doit être mise à jour
        await alarmManager.checkAndUpdateAlarm(alarm);
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Erreur dans la tâche en arrière-plan:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export default function App() {
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

    // Enregistrer la tâche en arrière-plan
    const registerBackgroundTask = async () => {
      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
          minimumInterval: 60, // Vérifier toutes les minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la tâche en arrière-plan:', error);
      }
    };
    
    // Surveiller l'état de l'application
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // L'application est revenue au premier plan
        // Rafraîchir les alarmes si nécessaire
        initializeApp();
      }
    };
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Initialiser
    initializeApp();
    registerBackgroundTask();
    
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
      <ThemeProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
} 