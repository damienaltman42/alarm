type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

interface ErrorLog {
  message: string;
  timestamp: number;
  severity: ErrorSeverity;
  context?: Record<string, any>;
}

class ErrorManager {
  private logs: ErrorLog[] = [];
  private readonly MAX_LOGS = 100;

  logError(message: string, severity: ErrorSeverity = 'error', context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      message,
      timestamp: Date.now(),
      severity,
      context,
    };

    this.logs.unshift(errorLog);
    
    // Limiter le nombre de logs stockés
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    // Afficher dans la console pour le débogage
    if (severity === 'critical' || severity === 'error') {
      console.error(`[${severity.toUpperCase()}] ${message}`, context);
    } else if (severity === 'warning') {
      console.warn(`[${severity.toUpperCase()}] ${message}`, context);
    } else {
      console.info(`[${severity.toUpperCase()}] ${message}`, context);
    }
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const errorManager = new ErrorManager(); 