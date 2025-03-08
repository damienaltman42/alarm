import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const LanguageSettingsScreen = () => {
  // Récupérer la fonction de traduction et la langue actuelle
  const { t } = useTranslation(['settings', 'common']);
  const { currentLanguage, setLanguage, isLanguageLoading } = useLanguage();
  const navigation = useNavigation();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  // Liste des langues disponibles
  const languages = [
    { code: 'fr', name: t('settings.language.french') },
    { code: 'en', name: t('settings.language.english') },
    { code: 'de', name: t('settings.language.german') },
    { code: 'es', name: t('settings.language.spanish') },
    { code: 'pt', name: t('settings.language.portuguese') },
    { code: 'it', name: t('settings.language.italian') }
  ];

  // Gestionnaire de sélection de langue
  const handleSelectLanguage = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  // Gestionnaire d'enregistrement de la langue
  const handleSaveLanguage = async () => {
    if (selectedLanguage !== currentLanguage) {
      await setLanguage(selectedLanguage);
    }
    navigation.goBack();
  };

  // Rendu d'une option de langue
  const renderLanguageOption = (languageCode: string, languageName: string) => {
    const isSelected = selectedLanguage === languageCode;
    
    return (
      <TouchableOpacity
        key={languageCode}
        style={[
          styles.languageOption,
          isSelected && styles.selectedLanguage
        ]}
        onPress={() => handleSelectLanguage(languageCode)}
        disabled={isLanguageLoading}
      >
        <Text style={[
          styles.languageName,
          isSelected && styles.selectedLanguageText
        ]}>
          {languageName}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        )}
      </TouchableOpacity>
    );
  };

  if (isLanguageLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.language.title')}</Text>
        <View style={styles.headerRight} />
      </View>
      
      <View style={styles.container}>
        <Text style={styles.subtitle}>{t('settings.language.selected')}</Text>
        
        <View style={styles.languageList}>
          {languages.map(lang => renderLanguageOption(lang.code, lang.name))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSaveLanguage}
          disabled={isLanguageLoading}
        >
          <Text style={styles.saveButtonText}>{t('common:actions.save')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 10,
  },
  headerRight: {
    width: 44, // Pour équilibrer la mise en page
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  languageList: {
    marginTop: 10,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  selectedLanguage: {
    backgroundColor: '#e0f2e0',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  languageName: {
    fontSize: 16,
  },
  selectedLanguageText: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  note: {
    marginTop: 20,
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LanguageSettingsScreen; 