import { alarmManager } from '../src/services/alarm/alarmManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Mock d'AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock des notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelScheduledNotificationAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
}));

// Mock d'expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn(),
          stopAsync: jest.fn(),
          unloadAsync: jest.fn(),
        },
      }),
    },
    setAudioModeAsync: jest.fn(),
  },
}));

describe('AlarmManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() => Promise.resolve(null));
  });

  test('getAlarms devrait retourner un tableau vide si aucune alarme n\'est stockée', async () => {
    // Configurer le mock pour retourner null (aucune alarme stockée)
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => Promise.resolve(null));

    // Appeler la méthode
    const alarms = await alarmManager.getAlarms();

    // Vérifier les résultats
    expect(alarms).toEqual([]);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@aurora_wake_alarms');
  });

  test('addAlarm devrait ajouter une alarme et la sauvegarder', async () => {
    // Configurer le mock pour retourner un tableau vide
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => Promise.resolve(JSON.stringify([])));
    
    // Créer une alarme de test
    const testAlarm = {
      id: "test-alarm-1",
      time: "08:00",
      repeatDays: [1, 2, 3, 4, 5],
      enabled: true,
      radioStation: {
        stationuuid: "test-station-1",
        name: "Test Station",
        url: "https://test.com/stream",
        url_resolved: "https://test.com/stream",
        homepage: "https://test.com",
        favicon: "https://test.com/favicon.png",
        tags: ["test", "rock"],
        country: "France"
      },
      label: "Test Alarm",
      snoozeEnabled: true,
      snoozeInterval: 5,
      alarmSound: 'radio' as 'radio'
    };

    // Appeler la méthode
    await alarmManager.addAlarm(testAlarm);

    // Vérifier que l'alarme a été sauvegardée
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    
    // Vérifier que l'alarme a été programmée
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
}); 