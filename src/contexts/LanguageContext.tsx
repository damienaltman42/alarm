import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getStoredLanguage, changeLanguage } from '../i18n';
import i18n from '../i18n';

type LanguageContextType = {
  currentLanguage: string;
  setLanguage: (language: string) => Promise<void>;
  isLanguageLoading: boolean;
};

const defaultContext: LanguageContextType = {
  currentLanguage: 'en',
  setLanguage: async () => {},
  isLanguageLoading: true,
};

// Création du contexte
export const LanguageContext = createContext<LanguageContextType>(defaultContext);

// Hook personnalisé pour utiliser le contexte
export const useLanguage = () => useContext(LanguageContext);

type LanguageProviderProps = {
  children: ReactNode;
};

// Provider du contexte
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  const [isLanguageLoading, setIsLanguageLoading] = useState(true);

  // Charger la langue précédemment sélectionnée ou utiliser la langue du système
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        setIsLanguageLoading(true);
        const storedLanguage = await getStoredLanguage();
        
        if (storedLanguage) {
          await i18n.changeLanguage(storedLanguage);
          setCurrentLanguage(storedLanguage);
        } else {
          // Utiliser la langue détectée par i18next ou défaut à 'en'
          setCurrentLanguage(i18n.language || 'en');
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la langue:', error);
      } finally {
        setIsLanguageLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // Fonction pour changer la langue
  const setLanguage = async (language: string) => {
    try {
      await changeLanguage(language);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Erreur lors du changement de langue:', error);
    }
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        currentLanguage, 
        setLanguage,
        isLanguageLoading
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}; 