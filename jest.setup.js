// Import des extensions de testing-library nécessaires
import '@testing-library/react-native/extend-expect';

// Définition de __DEV__ pour les tests
global.__DEV__ = true;

// Mock pour les modules natifs manquants
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Suppress console warnings during tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Ignore certains avertissements spécifiques qui peuvent apparaître pendant les tests
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('deprecated') || 
     args[0].includes('jest-haste-map'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
}; 