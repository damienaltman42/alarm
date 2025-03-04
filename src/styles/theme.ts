import { DefaultTheme, DarkTheme } from '@react-navigation/native';

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',
    background: '#f8f8f8',
    card: '#ffffff',
    text: '#000000',
    border: '#e0e0e0',
    notification: '#f50057',
    secondaryText: '#757575',
    accent: '#03dac6',
    switch: '#6200ee',
    switchTrack: '#e0e0e0',
    icon: '#424242',
    alarm: {
      active: '#6200ee',
      inactive: '#9e9e9e',
      background: '#ffffff',
    },
    radio: {
      item: '#ffffff',
      selected: '#e3f2fd',
      border: '#e0e0e0',
    },
  },
};

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#bb86fc',
    background: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    border: '#2c2c2c',
    notification: '#cf6679',
    secondaryText: '#b0b0b0',
    accent: '#03dac6',
    switch: '#bb86fc',
    switchTrack: '#3a3a3a',
    icon: '#e0e0e0',
    alarm: {
      active: '#bb86fc',
      inactive: '#757575',
      background: '#1e1e1e',
    },
    radio: {
      item: '#1e1e1e',
      selected: '#311b92',
      border: '#2c2c2c',
    },
  },
}; 