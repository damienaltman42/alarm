import { createNavigationContainerRef } from '@react-navigation/native';

// Créer une référence au conteneur de navigation
export const navigationRef = createNavigationContainerRef<any>();

// Fonction pour naviguer vers un écran
export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    // Stocker la navigation pour l'exécuter une fois que le navigateur est prêt
    console.warn('Navigation non prête. Navigation vers', name, 'reportée.');
  }
} 