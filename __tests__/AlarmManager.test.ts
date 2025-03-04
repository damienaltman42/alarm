import { alarmManager } from '../src/modules/AlarmManager';
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
      id: 'test-id',
      time: '08:00',
      days: [1, 2, 3, 4, 5],
      enabled: true,
      radioStation: {
        stationuuid: 'station-1',
        name: 'Test Radio',
        url: 'http://test.com',
        url_resolved: 'http://test.com/stream',
        homepage: 'http://test.com',
        favicon: 'http://test.com/favicon.ico',
        tags: ['test'],
        country: 'Test Country',
      },
      label: 'Test Alarm',
      snoozeEnabled: true,
      snoozeInterval: 5,
    };

    // Appeler la méthode
    await alarmManager.addAlarm(testAlarm);

    // Vérifier que l'alarme a été sauvegardée
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    
    // Vérifier que l'alarme a été programmée
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
}); 