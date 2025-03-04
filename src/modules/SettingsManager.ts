import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, ThemeMode } from '../types';
import { errorManager } from './ErrorManager';

const SETTINGS_STORAGE_KEY = '@aurora_wake_settings';

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  defaultSnoozeInterval: 5,
  defaultRadioCountry: 'FR',
};

class SettingsManager {
  private settings: AppSettings = DEFAULT_SETTINGS;

  async loadSettings(): Promise<AppSettings> {
    try {
      const storedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      }
      return this.settings;
    } catch (error) {
      errorManager.logError('Erreur lors du chargement des paramètres', 'error', { error });
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(newSettings: Partial<AppSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      errorManager.logError('Erreur lors de la sauvegarde des paramètres', 'error', { error });
    }
  }

  getSettings(): AppSettings {
    return this.settings;
  }

  async setThemeMode(themeMode: ThemeMode): Promise<void> {
    await this.saveSettings({ themeMode });
  }

  async setDefaultSnoozeInterval(minutes: number): Promise<void> {
    if (minutes < 1) minutes = 1;
    if (minutes > 30) minutes = 30;
    await this.saveSettings({ defaultSnoozeInterval: minutes });
  }

  async setDefaultRadioCountry(countryCode: string): Promise<void> {
    await this.saveSettings({ defaultRadioCountry: countryCode });
  }
}

export const settingsManager = new SettingsManager(); 