/**
 * Service de gestion des erreurs pour l'application
 */
export class ErrorService {
  /**
   * Gère une erreur de manière centralisée
   * @param error L'erreur à gérer
   * @param context Le contexte dans lequel l'erreur s'est produite
   */
  static handleError(error: Error, context: string): void {
    // Log l'erreur avec le contexte
    console.error(`[${context}] Erreur:`, error.message);
    
    // Ici, on pourrait ajouter d'autres comportements:
    // - Envoyer l'erreur à un service de monitoring
    // - Afficher une notification à l'utilisateur
    // - Enregistrer l'erreur dans un fichier de log local
  }
  
  /**
   * Exécute une fonction asynchrone avec gestion d'erreur
   * @param fn Fonction à exécuter
   * @param context Contexte pour le log d'erreur
   * @param fallback Valeur de repli en cas d'erreur
   * @returns Le résultat de la fonction ou la valeur de repli
   */
  static async tryCatch<T>(
    fn: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error as Error, context);
      return fallback;
    }
  }
} 