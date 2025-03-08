/**
 * Point d'entrée pour initialiser tous les services nécessaires au démarrage de l'application
 */
import { setupTrackPlayer } from './audio/TrackPlayerService';
import { AlarmScheduler } from './alarm/alarmScheduler';
import { startPeriodicAlarmCheck, initNotificationService } from './notification/BackgroundNotificationService';

/**
 * Initialise tous les services de l'application
 */
export async function initializeServices() {
  try {
    console.log('Initialisation des services...');
    
    // Initialisation du service de notification
    initNotificationService();
    
    // Démarrer le vérificateur d'alarmes périodique
    startPeriodicAlarmCheck(30);
    
    // Initialiser le lecteur audio
    await setupTrackPlayer();
    
    // Initialiser le planificateur d'alarmes
    const scheduler = new AlarmScheduler();
    
    // Attendre un petit délai pour s'assurer que l'enregistrement de la tâche est terminé
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Services initialisés avec succès!');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des services:', error);
    return false;
  }
} 