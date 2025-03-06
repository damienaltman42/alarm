import { RadioStation } from './radio';

export interface Alarm {
  id: string;
  time: string; // Format "HH:MM"
  days: number[]; // 0-6, où 0 est dimanche
  enabled: boolean;
  radioStation: RadioStation | null;
  label?: string;
  snoozeEnabled: boolean;
  snoozeInterval: number; // en minutes
}

export interface AlarmSchedulerOptions {
  minimumInterval?: number;
  stopOnTerminate?: boolean;
  startOnBoot?: boolean;
}