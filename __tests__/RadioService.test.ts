import { radioService } from '../src/modules/RadioService';

// Mock de fetch
global.fetch = jest.fn();

// Mock d'AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock d'ErrorManager
jest.mock('../src/modules/ErrorManager', () => ({
  errorManager: {
    logError: jest.fn(),
  },
}));

describe('RadioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getStations devrait récupérer les stations avec les paramètres corrects', async () => {
    // Configurer le mock
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ stationuuid: '1', name: 'Test Radio' }]),
    });

    // Appeler la méthode
    const result = await radioService.getStations({ name: 'test' });

    // Vérifier les résultats
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Radio');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Vérifier que l'URL contient les bons paramètres
    const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchUrl).toContain('name=test');
    expect(fetchUrl).toContain('hidebroken=true');
  });

  test('getStations devrait réessayer en cas d\'erreur', async () => {
    // Configurer le mock pour échouer puis réussir
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Erreur réseau'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ stationuuid: '1', name: 'Test Radio' }]),
      });

    // Appeler la méthode
    const result = await radioService.getStations({ name: 'test' });

    // Vérifier les résultats
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Radio');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('getCountries devrait utiliser le cache si disponible', async () => {
    // Forcer la mise en cache directement dans l'instance de radioService
    const mockCountries = [{ name: 'France', code: 'FR', stationcount: 100 }];
    
    // Accéder aux propriétés privées pour le test
    const radioServiceAny = radioService as any;
    radioServiceAny.cachedCountries = mockCountries;
    radioServiceAny.cacheTimestamp.countries = Date.now();

    // Appeler la méthode
    const result = await radioService.getCountries();

    // Vérifier les résultats
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('France');
    expect(global.fetch).not.toHaveBeenCalled();
  });
}); 