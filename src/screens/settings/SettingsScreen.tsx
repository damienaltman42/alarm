import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';

// Type pour la navigation
type SettingsNavigationProp = {
  navigate: (screen: string) => void;
};

const SettingsScreen = () => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const navigation = useNavigation<SettingsNavigationProp>();
  const { currentLanguage } = useLanguage();

  // Fonction pour obtenir le nom complet de la langue
  const getLanguageName = (code: string) => {
    switch (code) {
      case 'fr':
        return t('settings:settings.language.french');
      case 'en':
        return t('settings:settings.language.english');
      default:
        return code;
    }
  };

  // Rendu d'une section de paramètres
  const renderSettingsSection = (title: string, items: SettingsItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.settingsItem}
            onPress={item.onPress}
          >
            <View style={styles.itemLeft}>
              <Ionicons name={item.icon} size={24} color="#666" style={styles.itemIcon} />
              <Text style={styles.itemTitle}>{item.title}</Text>
            </View>
            <View style={styles.itemRight}>
              {item.value && <Text style={styles.itemValue}>{item.value}</Text>}
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Types pour les éléments de paramètres
  type SettingsItem = {
    title: string;
    icon: any;
    onPress: () => void;
    value?: string;
  };

  // Sections de paramètres
  const sections = [
    {
      title: t('settings:settings.appearance.title'),
      items: [
        {
          title: t('settings:settings.appearance.theme'),
          icon: 'color-palette-outline',
          onPress: () => {},
          value: t('settings:settings.appearance.systemDefault')
        }
      ]
    },
    {
      title: t('settings:settings.language.title'),
      items: [
        {
          title: t('settings:settings.language.selected'),
          icon: 'language-outline',
          onPress: () => navigation.navigate('LanguageSettings'),
          value: getLanguageName(currentLanguage)
        }
      ]
    },
    {
      title: t('settings:settings.notifications.title'),
      items: [
        {
          title: t('settings:settings.notifications.sound'),
          icon: 'volume-high-outline',
          onPress: () => {}
        },
        {
          title: t('settings:settings.notifications.vibration'),
          icon: 'vibrate-outline',
          onPress: () => {}
        }
      ]
    },
    {
      title: t('settings:settings.about.title'),
      items: [
        {
          title: t('settings:settings.about.version'),
          icon: 'information-circle-outline',
          onPress: () => {},
          value: '1.0.0'
        }
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>{t('settings:settings.title')}</Text>
        
        {sections.map((section, index) => (
          <React.Fragment key={index}>
            {renderSettingsSection(section.title, section.items)}
          </React.Fragment>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 20,
    marginHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 15,
  },
  itemTitle: {
    fontSize: 16,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemValue: {
    fontSize: 16,
    color: '#999',
    marginRight: 10,
  },
});

export default SettingsScreen; 