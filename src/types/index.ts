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

export interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string[] | string;
  country: string;
  language?: string;
  codec?: string;
  bitrate?: number;
  votes?: number;
}

export interface Country {
  name: string;
  code: string;
  iso_3166_1: string;
  stationcount: number;
}

export interface Tag {
  name: string;
  stationcount: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  themeMode: ThemeMode;
  defaultSnoozeInterval: number;
  defaultRadioCountry: string;
}

export * from './alarm';
export * from './radio';
export * from './settings'; 