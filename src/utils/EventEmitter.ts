/**
 * Gestionnaire d'événements simple
 * Permet d'émettre et d'écouter des événements
 */
export class EventEmitter {
  private events: Record<string, Function[]> = {};

  /**
   * Ajoute un écouteur pour un événement
   * @param event Nom de l'événement
   * @param callback Fonction à appeler lorsque l'événement est émis
   * @returns Fonction pour supprimer l'écouteur
   */
  public on(event: string, callback: Function): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);

    // Retourner une fonction pour supprimer l'écouteur
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Supprime un écouteur pour un événement
   * @param event Nom de l'événement
   * @param callback Fonction à supprimer
   */
  public off(event: string, callback: Function): void {
    if (!this.events[event]) {
      return;
    }

    const index = this.events[event].indexOf(callback);
    if (index !== -1) {
      this.events[event].splice(index, 1);
    }
  }

  /**
   * Émet un événement
   * @param event Nom de l'événement
   * @param args Arguments à passer aux écouteurs
   */
  public emit(event: string, ...args: any[]): void {
    if (!this.events[event]) {
      return;
    }

    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Erreur lors de l'exécution d'un écouteur pour l'événement "${event}":`, error);
      }
    });
  }

  /**
   * Supprime tous les écouteurs pour un événement
   * @param event Nom de l'événement (si non spécifié, supprime tous les écouteurs)
   */
  public removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
} 