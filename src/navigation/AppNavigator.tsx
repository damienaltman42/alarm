import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AlarmListScreen } from '../screens/AlarmListScreen';
import { AddAlarmScreen } from '../screens/AddAlarmScreen';
import { SearchRadioScreen } from '../screens/SearchRadioScreen';
import { AlarmRingingScreen } from '../screens/AlarmRingingScreen';
import { Alarm, RadioStation } from '../types';
import { useTheme } from '../hooks';
import { setNavigateToAlarmScreen } from '../modules/AlarmManager';
import { navigationRef } from './navigationRef';

// Définition des types pour la navigation
type RootStackParamList = {
  AlarmList: undefined;
  AddAlarm: { alarm?: Alarm };
  SearchRadio: { 
    onSelectStation: (station: RadioStation) => void; 
    selectedStation?: RadioStation | null;
  };
  AlarmRinging: { alarm: Alarm };
};

const Stack = createStackNavigator<RootStackParamList>();

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
      <Stack.Navigator
        initialRouteName="AlarmList"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="AlarmList" component={AlarmListScreen} />
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
    </NavigationContainer>
  );
}; 