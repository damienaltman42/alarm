// global.d.ts
import { Audio } from 'expo-av';

declare global {
  var silentAudioPlayer: Audio.Sound | null;
}

export {};