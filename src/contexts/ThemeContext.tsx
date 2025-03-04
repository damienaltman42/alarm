import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeMode } from '../types';
import { themeManager } from '../modules/ThemeManager';
import { lightTheme, darkTheme } from '../styles/theme';

type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme() || 'light';
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<Theme>(systemColorScheme === 'dark' ? darkTheme : lightTheme);

  useEffect(() => {
    const initTheme = async () => {
      const savedThemeMode = await themeManager.initialize();
      setThemeMode(savedThemeMode);
    };

    initTheme();
  }, []);

  useEffect(() => {
    const activeTheme = themeManager.getActiveTheme(systemColorScheme);
    setTheme(activeTheme === 'dark' ? darkTheme : lightTheme);
  }, [themeMode, systemColorScheme]);

  const handleSetThemeMode = async (mode: ThemeMode) => {
    await themeManager.setTheme(mode);
    setThemeMode(mode);
  };

  const isDarkMode = theme === darkTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode: handleSetThemeMode,
        isDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé à l\'intérieur d\'un ThemeProvider');
  }
  return context;
}; 