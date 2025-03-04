import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AlarmListScreen } from '../screens/AlarmListScreen';
import { AddAlarmScreen } from '../screens/AddAlarmScreen';
import { SearchRadioScreen } from '../screens/SearchRadioScreen';
import { Alarm, RadioStation } from '../types';
import { useTheme } from '../hooks';

// Définition des types pour la navigation
type RootStackParamList = {
  AlarmList: undefined;
  AddAlarm: { alarm?: Alarm };
  SearchRadio: { 
    onSelectStation: (station: RadioStation) => void; 
    selectedStation?: RadioStation | null;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <NavigationContainer>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}; 