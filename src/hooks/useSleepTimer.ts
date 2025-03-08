import { useState, useEffect, useCallback } from 'react';
import { sleepTimerService } from '../services/audio/SleepTimerService';

/**
 * Interface représentant l'état du sleep timer
 */
interface SleepTimerState {
  active: boolean;
  remainingMs: number;
  formattedTime: string;
}

/**
 * Hook personnalisé pour utiliser le sleep timer
 * @returns Fonctions et données pour interagir avec le sleep timer
 */
export function useSleepTimer() {
  // État initial du timer
  const [timerState, setTimerState] = useState<SleepTimerState>({
    active: sleepTimerService.isTimerActive(),
    remainingMs: sleepTimerService.getRemainingTime(),
    formattedTime: sleepTimerService.getFormattedRemainingTime()
  });

  // Mettre à jour l'état quand le timer change
  useEffect(() => {
    // S'abonner aux événements du service
    const stateChangedUnsubscribe = sleepTimerService.addEventListener(
      'sleepTimer:stateChanged',
      (state: SleepTimerState) => {
        setTimerState(state);
      }
    );

    const timerTickUnsubscribe = sleepTimerService.addEventListener(
      'sleepTimer:timerTick',
      (data: { remainingMs: number; formattedTime: string }) => {
        setTimerState(prevState => ({
          ...prevState,
          remainingMs: data.remainingMs,
          formattedTime: data.formattedTime
        }));
      }
    );

    // Nettoyer les abonnements à la destruction du composant
    return () => {
      stateChangedUnsubscribe();
      timerTickUnsubscribe();
    };
  }, []);

  // Démarre un timer pour la durée spécifiée
  const startTimer = useCallback((minutes: number) => {
    sleepTimerService.startTimer(minutes);
  }, []);

  // Arrête le timer en cours
  const stopTimer = useCallback(() => {
    sleepTimerService.stopTimer();
  }, []);

  return {
    // États
    isActive: timerState.active,
    remainingMs: timerState.remainingMs,
    formattedTime: timerState.formattedTime,
    
    // Actions
    startTimer,
    stopTimer
  };
} 