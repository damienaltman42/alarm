import { alarmManager } from '../alarm/alarmManager';
import { EventEmitter } from '../../utils/EventEmitter';

/**
 * Service de gestion du sleep timer
 * Permet de programmer l'arrêt de la lecture audio après un certain temps
 */
class SleepTimerService {
  private timerId: NodeJS.Timeout | null = null;
  private endTime: Date | null = null;
  private remainingMs: number = 0;
  private eventEmitter = new EventEmitter();

  // Événements émis par le service
  public static Events = {
    STATE_CHANGED: 'sleepTimer:stateChanged',
    TIMER_TICK: 'sleepTimer:timerTick',
    TIMER_COMPLETE: 'sleepTimer:timerComplete',
  };

  /**
   * Démarre le sleep timer
   * @param minutes Durée en minutes
   */
  public startTimer(minutes: number): void {
    // Arrêter tout timer existant
    this.stopTimer();

    if (minutes <= 0) {
      console.log('[SleepTimer] Durée invalide:', minutes);
      return;
    }

    console.log(`[SleepTimer] Démarrage du timer pour ${minutes} minutes`);
    
    // Calculer l'heure de fin
    const durationMs = minutes * 60 * 1000;
    this.remainingMs = durationMs;
    this.endTime = new Date(Date.now() + durationMs);
    
    // Mettre à jour l'état et notifier les écouteurs
    this.notifyStateChanged();
    
    // Démarrer le timer avec des mises à jour toutes les secondes
    this.startTickTimer();
  }

  /**
   * Arrête le sleep timer
   */
  public stopTimer(): void {
    if (this.timerId) {
      console.log('[SleepTimer] Arrêt du timer');
      clearInterval(this.timerId);
      this.timerId = null;
      this.endTime = null;
      this.remainingMs = 0;
      
      // Notifier les écouteurs
      this.notifyStateChanged();
    }
  }

  /**
   * Vérifie si un timer est actif
   */
  public isTimerActive(): boolean {
    return this.timerId !== null && this.endTime !== null;
  }

  /**
   * Retourne le temps restant en millisecondes
   */
  public getRemainingTime(): number {
    if (!this.endTime) {
      return 0;
    }
    
    const remaining = Math.max(0, this.endTime.getTime() - Date.now());
    return remaining;
  }

  /**
   * Retourne le temps restant formaté (HH:MM:SS)
   */
  public getFormattedRemainingTime(): string {
    const remainingMs = this.getRemainingTime();
    const totalSeconds = Math.floor(remainingMs / 1000);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Ajoute un écouteur d'événements
   * @param event Nom de l'événement
   * @param listener Fonction à appeler
   */
  public addEventListener(event: string, listener: Function): () => void {
    return this.eventEmitter.on(event, listener);
  }

  /**
   * Démarre le timer de tick pour mettre à jour le temps restant
   */
  private startTickTimer(): void {
    // Arrêter tout timer existant
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    
    // Intervalle de mise à jour (1 seconde)
    this.timerId = setInterval(() => {
      // Calculer le temps restant
      this.remainingMs = this.getRemainingTime();
      
      // Envoyer un événement de tick avec le temps restant
      this.eventEmitter.emit(SleepTimerService.Events.TIMER_TICK, {
        remainingMs: this.remainingMs,
        formattedTime: this.getFormattedRemainingTime()
      });
      
      // Si le timer est terminé, arrêter la lecture et notifier
      if (this.remainingMs <= 0) {
        this.completeSleepTimer();
      }
    }, 1000);
  }

  /**
   * Appelé lorsque le sleep timer est terminé
   */
  private completeSleepTimer(): void {
    console.log('[SleepTimer] Timer terminé, arrêt de la lecture');
    
    // Arrêter le timer
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    
    // Réinitialiser les valeurs
    this.endTime = null;
    this.remainingMs = 0;
    
    // Émettre l'événement de fin
    this.eventEmitter.emit(SleepTimerService.Events.TIMER_COMPLETE);
    
    // Notifier du changement d'état
    this.notifyStateChanged();
    
    // Arrêter la lecture audio en utilisant le service existant
    this.stopAudio();
  }

  /**
   * Arrête la lecture audio en utilisant les services existants
   */
  private stopAudio(): void {
    try {
      // Utiliser alarmManager pour arrêter la prévisualisation
      // (utilisé pour la lecture des radios)
      alarmManager.stopPreview();
    } catch (error) {
      console.error('[SleepTimer] Erreur lors de l\'arrêt de l\'audio:', error);
    }
  }

  /**
   * Notifie les écouteurs du changement d'état
   */
  private notifyStateChanged(): void {
    this.eventEmitter.emit(SleepTimerService.Events.STATE_CHANGED, {
      active: this.isTimerActive(),
      remainingMs: this.remainingMs,
      formattedTime: this.getFormattedRemainingTime()
    });
  }
}

// Exporter une instance unique du service
export const sleepTimerService = new SleepTimerService(); 