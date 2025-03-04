import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { AlarmListScreen } from '../screens/AlarmListScreen';
import { AddAlarmScreen } from '../screens/AddAlarmScreen';
import { SearchRadioScreen } from '../screens/SearchRadioScreen';
import { AlarmRingingScreen } from '../screens/AlarmRingingScreen';
import { RadioPlayerScreen } from '../screens/RadioPlayerScreen';
import { Alarm, RadioStation } from '../types';
import { useTheme, useRadio } from '../hooks';
import { setNavigateToAlarmScreen } from '../modules/AlarmManager';
import { navigationRef } from './navigationRef';
import { MiniPlayer } from '../components/MiniPlayer';

// Définition des types pour la navigation
type RootStackParamList = {
  MainTabs: undefined;
  AddAlarm: { alarm?: Alarm };
  SearchRadio: { 
    onSelectStation: (station: RadioStation) => void; 
    selectedStation?: RadioStation | null;
  };
  AlarmRinging: { alarm: Alarm };
};

type TabStackParamList = {
  AlarmList: undefined;
  RadioPlayer: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabStackParamList>();

// Composant pour les onglets principaux
const MainTabs: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          
          if (route.name === 'AlarmList') {
            iconName = focused ? 'alarm' : 'alarm-outline';
          } else {
            iconName = focused ? 'radio' : 'radio-outline';
          }
          
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
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
      })}
    >
      <Tab.Screen 
        name="AlarmList" 
        component={AlarmListScreen} 
        options={{ 
          tabBarLabel: 'Alarmes',
        }} 
      />
      <Tab.Screen 
        name="RadioPlayer" 
        component={RadioPlayerScreen} 
        options={{ 
          tabBarLabel: 'Radio',
        }} 
      />
    </Tab.Navigator>
  );
};

// Composant pour afficher le mini-player global
const GlobalMiniPlayer: React.FC = () => {
  const { currentPlayingStation, loadingAudio, stopPreview } = useRadio();
  const { stations, favorites } = useRadio();
  
  // Trouver la station en cours de lecture
  const findCurrentStation = (): RadioStation | null => {
    if (!currentPlayingStation) return null;
    
    // Chercher d'abord dans les stations chargées
    let station = stations.find(s => s.stationuuid === currentPlayingStation);
    
    // Si non trouvée, chercher dans les favoris
    if (!station) {
      station = favorites.find(s => s.stationuuid === currentPlayingStation);
    }
    
    return station || null;
  };
  
  const currentStation = findCurrentStation();
  
  if (!currentPlayingStation || !currentStation) return null;
  
  return (
    <MiniPlayer
      station={currentStation}
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
          <Stack.Screen 
            name="AlarmRinging" 
            component={AlarmRingingScreen}
            options={{
              gestureEnabled: false, // Empêcher de quitter l'écran par geste
            }}
          />
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