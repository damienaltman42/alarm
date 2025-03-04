export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  themeMode: ThemeMode;
  defaultSnoozeInterval: number;
  defaultRadioCountry: string;
} 