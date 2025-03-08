import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import RNLanguageDetector from 'i18next-react-native-language-detector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Importation des fichiers de traduction
import enCommon from '../locales/en/common/common.json';
import enAlarm from '../locales/en/alarm/alarm.json';
import enAlarmDays from '../locales/en/alarm/days.json';
import enAlarmScreens from '../locales/en/alarm/screens.json';
import enAlarmComponents from '../locales/en/alarm/components.json';
import enNotification from '../locales/en/notification/notification.json';
import enSettings from '../locales/en/settings/settings.json';
import enRadio from '../locales/en/radio/radio.json';
import enSleep from '../locales/en/sleep/sleep.json';

import frCommon from '../locales/fr/common/common.json';
import frAlarm from '../locales/fr/alarm/alarm.json';
import frAlarmDays from '../locales/fr/alarm/days.json';
import frAlarmScreens from '../locales/fr/alarm/screens.json';
import frAlarmComponents from '../locales/fr/alarm/components.json';
import frNotification from '../locales/fr/notification/notification.json';
import frSettings from '../locales/fr/settings/settings.json';
import frRadio from '../locales/fr/radio/radio.json';
import frSleep from '../locales/fr/sleep/sleep.json';

// Constante pour la clé de stockage
const LANGUAGE_STORAGE_KEY = 'aurora_wake_language';

// Fonction pour obtenir la langue du système
const getDeviceLanguage = (): string => {
  // Sur iOS, la langue est stockée dans la propriété AppleLocale ou AppleLanguages
  // Sur Android, c'est dans la propriété locale
  let deviceLanguage = 'en';
  
  if (Platform.OS === 'ios') {
    deviceLanguage = NativeModules.SettingsManager.settings.AppleLocale || 
                    NativeModules.SettingsManager.settings.AppleLanguages[0] || 
                    'en';
  } else {
    deviceLanguage = NativeModules.I18nManager.localeIdentifier || 'en';
  }
  
  // Retourner seulement le préfixe de langue (fr, en, etc.) sans le code région
  return deviceLanguage.substring(0, 2);
};

// Ressources de traduction
const resources = {
  en: {
    common: enCommon,
    alarm: enAlarm,
    'alarm.days': enAlarmDays,
    'alarm.screens': enAlarmScreens,
    'alarm.components': enAlarmComponents,
    notification: enNotification,
    settings: enSettings,
    radio: enRadio,
    sleep: enSleep
  },
  fr: {
    common: frCommon,
    alarm: frAlarm,
    'alarm.days': frAlarmDays,
    'alarm.screens': frAlarmScreens,
    'alarm.components': frAlarmComponents,
    notification: frNotification,
    settings: frSettings,
    radio: frRadio,
    sleep: frSleep
  }
};

// Fonction pour stocker la langue sélectionnée
export const storeLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Erreur lors du stockage de la langue:', error);
  }
};

// Fonction pour récupérer la langue stockée
export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.error('Erreur lors de la récupération de la langue:', error);
    return null;
  }
};

// Fonction pour changer la langue de l'application
export const changeLanguage = async (language: string) => {
  await storeLanguage(language);
  return i18n.changeLanguage(language);
};

// Utiliser une langue par défaut basée sur le système si disponible
const systemLanguage = getDeviceLanguage();
const defaultLanguage = (resources as any)[systemLanguage] ? systemLanguage : 'en';

// Initialisation de i18next
i18n
  .use(RNLanguageDetector) // Détection de la langue du système
  .use(initReactI18next)    // Intégration avec React
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',      // Langue par défaut si la traduction est manquante
    ns: ['common', 'alarm', 'alarm.days', 'alarm.screens', 'alarm.components', 'notification', 'settings'],
    defaultNS: 'common',    // Espace de noms par défaut
    debug: __DEV__,         // Activer le mode debug uniquement en développement
    interpolation: {
      escapeValue: false    // Pas besoin d'échapper les valeurs avec React
    },
    react: {
      useSuspense: false    // Désactiver Suspense pour éviter les problèmes avec React Native
    },
    detection: {
      // Options pour le détecteur de langue
      caches: ['AsyncStorage'],
      lookupAsyncStorage: LANGUAGE_STORAGE_KEY,
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag']
    }
  });

// Afficher la langue utilisée en mode debug
if (__DEV__) {
  console.log('Langue initiale :', i18n.language);
  console.log('Ressources chargées :', Object.keys(resources));
}

export default i18n; 