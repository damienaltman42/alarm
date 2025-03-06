import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Alarm } from '../types';
import { alarmManager } from '../services/alarm/alarmManager';
import { ErrorService } from '../utils/errorHandling';

// Type pour le contexte d'alarme
interface AlarmContextType {
  alarms: Alarm[];
  activeAlarmId: string | null;
  loading: boolean;
  addAlarm: (alarm: Alarm) => Promise<boolean>;
  updateAlarm: (alarm: Alarm) => Promise<boolean>;
  deleteAlarm: (id: string) => Promise<boolean>;
  toggleAlarm: (id: string, enabled: boolean) => Promise<boolean>;
  previewRadio: (radioUrl: string) => Promise<boolean>;
  stopPreview: () => Promise<boolean>;
}

// Création du contexte
export const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

// Props pour le provider
interface AlarmProviderProps {
  children: ReactNode;
}

/**
 * Provider pour le contexte d'alarme
 */
export const AlarmProvider: React.FC<AlarmProviderProps> = ({ children }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [activeAlarmId, setActiveAlarmId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Charger les alarmes depuis le stockage
  const loadAlarms = async (): Promise<void> => {
    try {
      setLoading(true);
      const loadedAlarms = await alarmManager.getAlarms();
      setAlarms(loadedAlarms);
      
      // Vérifier s'il y a une alarme active
      const isActive = alarmManager.isAlarmActive();
      if (isActive) {
        setActiveAlarmId(alarmManager.getActiveAlarmId());
      }
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmProvider.loadAlarms');
    } finally {
      setLoading(false);
    }
  };

  // Initialiser le gestionnaire d'alarmes et charger les alarmes
  useEffect(() => {
    loadAlarms();

    // Vérifier périodiquement l'alarme active
    const checkActiveAlarmInterval = setInterval(() => {
      const isActive = alarmManager.isAlarmActive();
      const currentActiveId = alarmManager.getActiveAlarmId();
      
      if (isActive && currentActiveId !== activeAlarmId) {
        setActiveAlarmId(currentActiveId);
      } else if (!isActive && activeAlarmId !== null) {
        setActiveAlarmId(null);
      }
    }, 1000);

    return () => {
      clearInterval(checkActiveAlarmInterval);
    };
  }, [activeAlarmId]);

  // Ajouter une alarme
  const addAlarm = async (alarm: Alarm): Promise<boolean> => {
    try {
      await alarmManager.addAlarm(alarm);
      await loadAlarms(); // Recharger les alarmes après l'ajout
      return true;
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmProvider.addAlarm');
      return false;
    }
  };

  // Mettre à jour une alarme
  const updateAlarm = async (alarm: Alarm): Promise<boolean> => {
    console.log("+++++++++++++++here updateAlarm  AlarmContext +++++++++++++++++++++++");
    try {
      await alarmManager.updateAlarm(alarm);
      await loadAlarms(); // Recharger les alarmes après la mise à jour
      return true;
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmProvider.updateAlarm');
      return false;
    }
  };

  // Supprimer une alarme
  const deleteAlarm = async (id: string): Promise<boolean> => {
    try {
      await alarmManager.deleteAlarm(id);
      await loadAlarms(); // Recharger les alarmes après la suppression
      return true;
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmProvider.deleteAlarm');
      return false;
    }
  };

  // Activer ou désactiver une alarme
  const toggleAlarm = async (id: string, enabled: boolean): Promise<boolean> => {
    try {
      // Trouver l'alarme à mettre à jour
      const alarmToUpdate = alarms.find(a => a.id === id);
      if (!alarmToUpdate) return false;

      // Mettre à jour l'état d'activation
      const updatedAlarm = { ...alarmToUpdate, enabled };
      await alarmManager.toggleAlarm(id, enabled);
      await loadAlarms(); // Recharger les alarmes après la mise à jour
      return true;
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmProvider.toggleAlarm');
      return false;
    }
  };

  // Prévisualiser une station de radio
  const previewRadio = async (radioUrl: string): Promise<boolean> => {
    console.log("+++++++++++++++here previewRadio  AlarmContext +++++++++++++++++++++++");
    try {
      await alarmManager.previewRadio(radioUrl);
      return true;
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmProvider.previewRadio');
      return false;
    }
  };

  // Arrêter la prévisualisation
  const stopPreview = async (): Promise<boolean> => {
    try {
      await alarmManager.stopPreview();
      return true;
    } catch (error) {
      ErrorService.handleError(error as Error, 'AlarmProvider.stopPreview');
      return false;
    }
  };

  // Valeur du contexte
  const contextValue: AlarmContextType = {
    alarms,
    activeAlarmId,
    loading,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
    previewRadio,
    stopPreview,
  };

  return (
    <AlarmContext.Provider value={contextValue}>
      {children}
    </AlarmContext.Provider>
  );
}; 