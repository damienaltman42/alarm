import { useContext } from 'react';
import { AlarmContext } from '../contexts/AlarmContext';
import { Alarm } from '../types';

/**
 * Hook personnalisé pour utiliser le contexte d'alarme
 * @returns Fonctions et données pour interagir avec les alarmes
 */
export function useAlarm() {
  const context = useContext(AlarmContext);
  
  if (context === undefined) {
    throw new Error('useAlarm doit être utilisé à l\'intérieur d\'un AlarmProvider');
  }
  
  const { 
    alarms, 
    activeAlarmId, 
    loading,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
    previewRadio,
    stopPreview
  } = context;

  return {
    // Données
    alarms,
    activeAlarmId,
    loading,
    
    // Méthodes
    /**
     * Ajoute une nouvelle alarme
     * @param alarm Alarme à ajouter
     * @returns Succès de l'opération
     */
    addAlarm,
    
    /**
     * Met à jour une alarme existante
     * @param alarm Alarme à mettre à jour
     * @returns Succès de l'opération
     */
    updateAlarm,
    
    /**
     * Supprime une alarme
     * @param id Identifiant de l'alarme
     * @returns Succès de l'opération
     */
    deleteAlarm,
    
    /**
     * Active ou désactive une alarme
     * @param id Identifiant de l'alarme
     * @param enabled État d'activation
     * @returns Succès de l'opération
     */
    toggleAlarm,
    
    
    /**
     * Prévisualise une station de radio
     * @param radioUrl URL de la station
     * @returns Succès de l'opération
     */
    previewRadio,
    
    /**
     * Arrête la prévisualisation
     * @returns Succès de l'opération
     */
    stopPreview
  };
} 