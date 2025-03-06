import { RadioCache } from './radioCache';
import { RadioFavorites } from './radioFavorites';

// Instances des services
export const radioCache = new RadioCache();
export const radioFavorites = new RadioFavorites();

// Export des classes pour utilisation éventuelle
export { RadioCache, RadioFavorites };

export { favoriteService } from './favoriteService';
export { radioService } from './radioService'; 