import { useState, useEffect } from 'react';
import { Alert } from 'react-native';

interface ErrorHandlingOptions {
  showAlerts?: boolean;
  context?: string;
}

export const useErrorHandling = (options: ErrorHandlingOptions = {}) => {
  const { showAlerts = false, context = 'Application' } = options;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error && showAlerts) {
      Alert.alert(
        'Erreur',
        error,
        [{ text: 'OK', onPress: () => setError(null) }]
      );
    }
  }, [error, showAlerts]);

  const handleError = (err: Error | string, operation?: string) => {
    const errorMessage = typeof err === 'string' 
      ? err 
      : err.message || 'Une erreur inconnue est survenue';
    
    const contextualError = operation 
      ? `[${context}] Erreur pendant ${operation}: ${errorMessage}`
      : `[${context}] ${errorMessage}`;
    
    console.error(contextualError);
    setError(errorMessage);
    
    return errorMessage;
  };

  const clearError = () => {
    setError(null);
  };

  return {
    error,
    setError,
    handleError,
    clearError
  };
}; 