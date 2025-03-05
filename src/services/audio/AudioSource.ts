/**
 * Interface pour les sources audio
 * Définit les méthodes communes à toutes les sources audio (radio, Spotify, etc.)
 */
export interface AudioSource {
  /**
   * Démarre la lecture audio
   * @returns Succès de l'opération
   */
  play(): Promise<boolean>;
  
  /**
   * Arrête la lecture audio
   * @returns Succès de l'opération
   */
  stop(): Promise<boolean>;
  
  /**
   * Obtient le nom de la source audio
   * @returns Nom de la source
   */
  getName(): string;
  
  /**
   * Nettoie les ressources
   */
  cleanup(): void;
}

/**
 * Fournit des méthodes utilitaires pour les sources audio
 */
export class AudioSourceUtils {
  /**
   * Arrête une source audio avec gestion des erreurs "Seeking interrupted"
   * @param source La source audio à arrêter
   * @param sound L'objet son à arrêter et décharger
   * @param sourceType Type de la source pour les logs d'erreur
   * @returns true si l'opération a réussi
   */
  static async safeStop<T>(
    sound: T | null,
    stopFn: (sound: T) => Promise<void>,
    unloadFn: (sound: T) => Promise<void>,
    sourceType: string
  ): Promise<boolean> {
    if (!sound) return true;
    
    try {
      await stopFn(sound);
      await unloadFn(sound);
      return true;
    } catch (error) {
      // Gérer spécifiquement l'erreur "Seeking interrupted"
      if (error instanceof Error && error.message.includes('Seeking interrupted')) {
        console.log(`Info: Seeking interrupted lors de l'arrêt de ${sourceType} - cette erreur est normale et peut être ignorée`);
        return true; // Malgré l'erreur, considérer l'opération comme réussie
      }
      
      // Log d'autres erreurs
      console.error(`Erreur lors de l'arrêt de ${sourceType}:`, error);
      return false;
    }
  }
} 