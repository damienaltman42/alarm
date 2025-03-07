import { radioService } from '../src/services/radio';

// Mock de fetch
global.fetch = jest.fn();

// Mock d'AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock d'ErrorService
jest.mock('../src/utils/errorHandling', () => ({
  ErrorService: {
    handleError: jest.fn(),
  },
}));

// Mock de radioFavorites
jest.mock('../src/services/radio/radioFavorites', () => ({
  radioFavorites: {
    getFavorites: jest.fn(),
    addToFavorites: jest.fn(),
    removeFromFavorites: jest.fn(),
    isFavorite: jest.fn(),
  },
}));

describe('RadioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searchStations devrait appeler fetch avec les paramètres corrects', async () => {
    // Configurer le mock de fetch
    const mockStations = [{ stationuuid: '1', name: 'Test Radio' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockStations),
    });

    // Appeler la méthode
    const result = await radioService.searchStations({ name: 'test' });

    // Vérifier les résultats
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Radio');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // Vérifier que l'URL contient les paramètres corrects
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('name=test');
  });

  test('getCountries devrait appeler fetch', async () => {
    // Configurer le mock de fetch
    const mockCountries = [{ name: 'France', code: 'FR', stationcount: 100 }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockCountries),
    });

    // Appeler la méthode avec forceRefresh pour éviter le cache
    const result = await radioService.getCountries(true);

    // Vérifier les résultats
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('France');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('searchStations devrait gérer les erreurs', async () => {
    // Configurer le mock pour échouer
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Erreur API'));

    // Appeler la méthode
    const result = await radioService.searchStations({ name: 'test' });

    // Vérifier les résultats
    expect(result).toEqual([]);
  });
}); 