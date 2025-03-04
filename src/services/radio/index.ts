import { RadioCache } from './radioCache';
import { RadioFavorites } from './radioFavorites';
import { RadioService } from './radioService';

// Instances des services
export const radioCache = new RadioCache();
export const radioFavorites = new RadioFavorites();
export const radioService = new RadioService();

// Export des classes pour utilisation éventuelle
export { RadioCache, RadioFavorites, RadioService }; 