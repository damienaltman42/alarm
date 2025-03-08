import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import RNLanguageDetector from 'i18next-react-native-language-detector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Import des traductions via les fichiers index pour chaque langue
import enTranslations from '../locales/en';
import frTranslations from '../locales/fr';
import deTranslations from '../locales/de';
import esTranslations from '../locales/es';
import ptTranslations from '../locales/pt';
import itTranslations from '../locales/it';
import jpTranslations from '../locales/jp';
import ruTranslations from '../locales/ru';
import zhTranslations from '../locales/zh';

// Constante pour la clé de stockage
const LANGUAGE_STORAGE_KEY = 'aurora_wake_language';

// Liste des langues supportées
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'es', 'pt', 'it', 'jp', 'ru', 'zh'];

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
  
  // Log en mode développement pour déboguer la détection de langue
  if (__DEV__) {
    console.log('Langue complète détectée:', deviceLanguage);
  }
  
  // Retourner seulement le préfixe de langue (fr, en, etc.) sans le code région
  const baseLanguageCode = deviceLanguage.substring(0, 2);
  
  // Traitement spécial pour le japonais (ja → jp)
  const finalLanguageCode = baseLanguageCode === 'ja' ? 'jp' : baseLanguageCode;
  
  // Log en mode développement
  if (__DEV__) {
    console.log('Code de langue de base extrait:', baseLanguageCode);
    if (baseLanguageCode === 'ja') {
      console.log('Conversion ja → jp pour le japonais');
    }
    console.log('Code de langue final utilisé:', finalLanguageCode);
  }
  
  return finalLanguageCode;
};

// Ressources de traduction
const resources = {
  en: enTranslations,
  fr: frTranslations,
  de: deTranslations,
  es: esTranslations,
  pt: ptTranslations,
  it: itTranslations,
  jp: jpTranslations,
  ru: ruTranslations,
  zh: zhTranslations
};

/**
 * Comment ajouter une nouvelle langue :
 * 1. Créer un nouveau dossier dans src/locales/ (ex: src/locales/es/)
 * 2. Copier la structure de dossiers et fichiers JSON d'une langue existante
 * 3. Traduire les fichiers JSON
 * 4. Créer un fichier index.ts dans le nouveau dossier pour exporter toutes les traductions
 * 5. Importer ce fichier ici
 * 6. Ajouter la langue à SUPPORTED_LANGUAGES
 * 7. Ajouter l'entrée correspondante dans resources
 */

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
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    console.warn(`Langue ${language} non supportée, utilisation de l'anglais par défaut`);
    language = 'en';
  }
  
  await storeLanguage(language);
  return i18n.changeLanguage(language);
};

// Utiliser une langue par défaut basée sur le système si disponible
const systemLanguage = getDeviceLanguage();
const defaultLanguage = SUPPORTED_LANGUAGES.includes(systemLanguage) ? systemLanguage : 'en';

// Initialisation de i18next
i18n
  .use(RNLanguageDetector) // Détection de la langue du système
  .use(initReactI18next)    // Intégration avec React
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',      // Langue par défaut si la traduction est manquante
    ns: Object.keys(resources.en),
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
  console.log('Langues supportées :', SUPPORTED_LANGUAGES);
  console.log('Namespaces chargés :', Object.keys(resources.en));
}

export default i18n; 