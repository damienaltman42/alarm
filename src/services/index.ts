/**
 * Point d'entrée pour initialiser tous les services nécessaires au démarrage de l'application
 */
import { initNotificationService } from './notification/BackgroundNotificationService';
import { setupTrackPlayer } from './audio/TrackPlayerService';
import { AlarmScheduler } from './alarm/alarmScheduler';

/**
 * Initialise tous les services nécessaires au démarrage de l'application
 */
export async function initializeServices() {
  console.log('Initialisation des services...');
  
  try {
    // Initialiser le service de notification
    initNotificationService();
    console.log('Service de notification initialisé');
    
    // Initialiser le lecteur audio
    await setupTrackPlayer();
    console.log('Service de lecture audio initialisé');
    
    // Initialiser le planificateur d'alarmes
    const scheduler = new AlarmScheduler();
    
    // Attendre un petit délai pour s'assurer que l'enregistrement de la tâche est terminé
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Vérifier les alarmes existantes
    await scheduler.checkAllAlarms();
    
    console.log('Service d\'alarme initialisé');
    console.log('Tous les services ont été initialisés avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des services:', error);
    return false;
  }
} 