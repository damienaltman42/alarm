import { RadioStation } from './radio';
import { Alarm } from './index';

// Exporter l'interface Alarm depuis index.ts
export { Alarm };

export interface AlarmSchedulerOptions {
  minimumInterval?: number;
  stopOnTerminate?: boolean;
  startOnBoot?: boolean;
  checkIntervalSeconds?: number; // Intervalle de vérification en secondes
}