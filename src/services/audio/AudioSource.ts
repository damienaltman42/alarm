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