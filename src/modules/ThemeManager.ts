import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../types';

const THEME_STORAGE_KEY = '@aurora_wake_theme';

class ThemeManager {
  private currentTheme: ThemeMode = 'system';

  async initialize(): Promise<ThemeMode> {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        this.currentTheme = savedTheme as ThemeMode;
      }
      return this.currentTheme;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du thème:', error);
      return 'system';
    }
  }

  async setTheme(theme: ThemeMode): Promise<void> {
    try {
      this.currentTheme = theme;
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  }

  getActiveTheme(systemTheme: 'light' | 'dark'): 'light' | 'dark' {
    if (this.currentTheme === 'system') {
      return systemTheme;
    }
    return this.currentTheme;
  }
}

export const themeManager = new ThemeManager(); 