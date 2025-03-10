import { Alarm } from './index';

declare global {
  var silentAudioPlayer: any;
  var navigateToAlarmScreen: ((alarm: Alarm) => void) | null;
  var lastTriggeredAlarms: Record<string, boolean>;
}

// Déclaration globale pour __DEV__ utilisé dans React Native
declare const __DEV__: boolean;

export {}; 