import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeMode } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clé pour le stockage du thème
const THEME_STORAGE_KEY = '@rhythmee_theme';

// Définition des thèmes
export const lightTheme = {
  background: '#f8f8f8',
  card: '#ffffff',
  text: '#333333',
  border: '#dddddd',
  primary: '#6200ee',
  secondary: '#666666',
  accent: '#ff4081',
  error: '#b00020',
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3',
};

export const darkTheme = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#e0e0e0',
  border: '#333333',
  primary: '#bb86fc',
  secondary: '#a0a0a0',
  accent: '#cf6679',
  error: '#cf6679',
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3',
};

// Type pour le contexte de thème
interface ThemeContextType {
  theme: typeof lightTheme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

// Création du contexte
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Props pour le provider
interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Provider pour le contexte de thème
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState(colorScheme === 'dark' ? darkTheme : lightTheme);

  // Charger le thème depuis le stockage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          setThemeMode(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du thème:', error);
      }
    };

    loadTheme();
  }, []);

  // Mettre à jour le thème lorsque le mode change
  useEffect(() => {
    const newTheme = 
      themeMode === 'system' 
        ? colorScheme === 'dark' ? darkTheme : lightTheme
        : themeMode === 'dark' ? darkTheme : lightTheme;
    
    setTheme(newTheme);
  }, [themeMode, colorScheme]);

  // Sauvegarder le thème lorsqu'il change
  const handleThemeChange = async (mode: ThemeMode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  };

  const isDark = 
    themeMode === 'system' 
      ? colorScheme === 'dark'
      : themeMode === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        isDark,
        setThemeMode: handleThemeChange,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}; 