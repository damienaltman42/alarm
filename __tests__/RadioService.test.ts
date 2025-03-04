import { radioService } from '../src/services/radio';
import { radioApi } from '../src/api/radioApi';

// Mock de fetch
global.fetch = jest.fn();

// Mock d'AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock d'ErrorService
jest.mock('../src/utils/errorHandling', () => ({
  ErrorService: {
    handleError: jest.fn(),
  },
}));

// Mock de radioApi
jest.mock('../src/api/radioApi', () => ({
  radioApi: {
    searchStations: jest.fn(),
    getCountries: jest.fn(),
  },
}));

describe('RadioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searchStations devrait appeler radioApi.searchStations avec les paramètres corrects', async () => {
    // Configurer le mock
    const mockStations = [{ stationuuid: '1', name: 'Test Radio' }];
    (radioApi.searchStations as jest.Mock).mockResolvedValueOnce(mockStations);

    // Appeler la méthode
    const result = await radioService.searchStations({ name: 'test' });

    // Vérifier les résultats
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Radio');
    expect(radioApi.searchStations).toHaveBeenCalledTimes(1);
    expect(radioApi.searchStations).toHaveBeenCalledWith({ name: 'test' });
  });

  test('getCountries devrait appeler radioApi.getCountries', async () => {
    // Configurer le mock
    const mockCountries = [{ name: 'France', code: 'FR', stationcount: 100 }];
    (radioApi.getCountries as jest.Mock).mockResolvedValueOnce(mockCountries);

    // Appeler la méthode avec forceRefresh pour éviter le cache
    const result = await radioService.getCountries(true);

    // Vérifier les résultats
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('France');
    expect(radioApi.getCountries).toHaveBeenCalledTimes(1);
  });

  test('searchStations devrait gérer les erreurs', async () => {
    // Configurer le mock pour échouer
    (radioApi.searchStations as jest.Mock).mockRejectedValueOnce(new Error('Erreur API'));

    // Appeler la méthode
    const result = await radioService.searchStations({ name: 'test' });

    // Vérifier les résultats
    expect(result).toEqual([]);
    expect(radioApi.searchStations).toHaveBeenCalledTimes(1);
  });
}); 