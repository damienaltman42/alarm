import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Text } from 'react-native';
import { AlarmListScreen } from '../screens/alarm/AlarmListScreen';
import { AddAlarmScreen } from '../screens/alarm/AddAlarmScreen';
import { SearchRadioScreen } from '../screens/radio/SearchRadioScreen';
import { SearchSpotifyScreen } from '../screens/spotify/SearchSpotifyScreen';
import { AlarmRingingScreen } from '../screens/alarm/AlarmRingingScreen';
import { RadioPlayerScreen } from '../screens/radio/RadioPlayerScreen';
import { SleepTimerScreen } from '../screens/sleep/SleepTimerScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import LanguageSettingsScreen from '../screens/settings/LanguageSettingsScreen';
import { Alarm, RadioStation, SpotifyPlaylist } from '../types';
import { useTheme, useRadio } from '../hooks';
import { setNavigateToAlarmScreen } from '../services/alarm/alarmManager';
import { navigationRef } from './navigationRef';
import { MiniPlayer } from '../components/common/MiniPlayer';
import { useTranslation } from 'react-i18next';

// Définition des types pour la navigation
type RootStackParamList = {
  MainTabs: undefined;
  AddAlarm: { alarm?: Alarm };
  SearchRadio: { 
    onSelectStation: (station: RadioStation) => void; 
    selectedStation?: RadioStation | null;
  };
  SearchSpotify: { 
    onSelectPlaylist: (playlist: SpotifyPlaylist) => void; 
    selectedPlaylist?: SpotifyPlaylist | null;
  };
  AlarmRinging: { alarm: Alarm };
  SleepTimer: undefined;
  Settings: undefined;
  LanguageSettings: undefined;
};

type TabStackParamList = {
  AlarmList: undefined;
  RadioPlayer: undefined;
  SleepTimer: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabStackParamList>();

// Composant pour les onglets principaux
const MainTabs: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation('common');
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.secondary,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: 'rgba(0,0,0,0.1)',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginBottom: 2
        }
      }}
    >
      <Tab.Screen 
        name="AlarmList" 
        component={AlarmListScreen} 
        options={{ 
          tabBarLabel: t('navigation.alarm'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? 'alarm' : 'alarm-outline'} 
              size={24} 
              color={color} 
            />
          )
        }} 
      />
      <Tab.Screen 
        name="RadioPlayer" 
        component={RadioPlayerScreen} 
        options={{ 
          tabBarLabel: t('navigation.radio'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? 'radio' : 'radio-outline'} 
              size={24} 
              color={color} 
            />
          )
        }} 
      />
      <Tab.Screen 
        name="SleepTimer" 
        component={SleepTimerScreen} 
        options={{ 
          tabBarLabel: t('navigation.sleep'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? 'moon' : 'moon-outline'} 
              size={24} 
              color={color} 
            />
          )
        }} 
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          tabBarLabel: t('navigation.settings'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? 'settings' : 'settings-outline'} 
              size={24} 
              color={color} 
            />
          )
        }} 
      />
    </Tab.Navigator>
  );
};

// Composant pour afficher le mini-player global
const GlobalMiniPlayer: React.FC = () => {
  const { currentPlayingStation, loadingAudio, stopPreview } = useRadio();
  
  if (!currentPlayingStation) return null;
  
  return (
    <MiniPlayer
      station={currentPlayingStation}
      isLoading={loadingAudio}
      onStop={stopPreview}
    />
  );
};

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  
  // Définir la fonction de navigation pour les alarmes
  useEffect(() => {
    setNavigateToAlarmScreen((alarm) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('AlarmRinging', { alarm });
      }
    });
  }, []);
  
  return (
    <NavigationContainer ref={navigationRef}>
      <View style={styles.container}>
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: theme.background },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="AddAlarm" component={AddAlarmScreen} />
          <Stack.Screen name="SearchRadio" component={SearchRadioScreen} />
          <Stack.Screen name="SearchSpotify" component={SearchSpotifyScreen} />
          <Stack.Screen 
            name="AlarmRinging" 
            component={AlarmRingingScreen}
            options={{
              gestureEnabled: false, // Empêcher de quitter l'écran par geste
            }}
          />
          <Stack.Screen name="SleepTimer" component={SleepTimerScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
        </Stack.Navigator>
        
        {/* Mini-player global */}
        <GlobalMiniPlayer />
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 