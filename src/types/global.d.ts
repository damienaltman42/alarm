import { Alarm } from './index';

declare global {
  var silentAudioPlayer: any;
  var navigateToAlarmScreen: ((alarm: Alarm) => void) | null;
  var lastTriggeredAlarms: Record<string, boolean>;
}

export {}; 