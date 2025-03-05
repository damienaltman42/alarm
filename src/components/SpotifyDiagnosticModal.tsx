import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SpotifyAuthService from '../services/SpotifyAuthService';
import { useTheme } from '../hooks/useTheme';

interface SpotifyDiagnosticModalProps {
  visible: boolean;
  onClose: () => void;
}

const SpotifyDiagnosticModal: React.FC<SpotifyDiagnosticModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    platform: string;
    version: string;
    spotifySDKAvailable: boolean;
    connectionInfo: any;
    hasValidToken: boolean;
    accessToken: string | null;
  } | null>(null);
  const [configTestResult, setConfigTestResult] = useState('Non testé');
  const [isTestingConfig, setIsTestingConfig] = useState(false);

  useEffect(() => {
    if (visible) {
      runDiagnostics();
    }
  }, [visible]);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // Récupérer les informations sur la plateforme
      const platformInfo = `${Platform.OS} ${Platform.Version}`;
      
      // Vérifier si les modules Spotify sont disponibles
      let spotifySDKAvailable = false;
      try {
        const spotifyRemote = require('react-native-spotify-remote');
        spotifySDKAvailable = !!(spotifyRemote.auth && spotifyRemote.remote);
        console.log('Module Spotify chargé avec succès:', spotifySDKAvailable);
      } catch (error) {
        console.warn('Modules Spotify non disponibles:', error);
      }

      // Obtenir les informations sur la connexion Spotify
      const connectionInfo = SpotifyAuthService.getConnectionInfo();
      console.log('Infos connexion Spotify:', connectionInfo);
      
      // Vérifier la validité du token
      const hasValidToken = await SpotifyAuthService.hasValidToken();
      console.log('Token valide:', hasValidToken);
      
      // Récupérer le token d'accès pour le diagnostic
      const accessToken = await SpotifyAuthService.getAccessToken();
      // Tronquer le token pour des raisons de sécurité
      const truncatedToken = accessToken ? 
        `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 10)}` : 
        null;
      
      setDiagnosticInfo({
        platform: Platform.OS,
        version: platformInfo,
        spotifySDKAvailable,
        connectionInfo,
        hasValidToken,
        accessToken: truncatedToken
      });
    } catch (error: any) {
      console.error('Erreur lors du diagnostic Spotify:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await SpotifyAuthService.resetAndReconnect();
      await runDiagnostics();
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSpotifyConfig = async () => {
    setIsTestingConfig(true);
    try {
      const result = await SpotifyAuthService.testConfiguration();
      setConfigTestResult(result);
    } catch (error: any) {
      setConfigTestResult(`Erreur: ${error.message}`);
    } finally {
      setIsTestingConfig(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Diagnostic Spotify
          </Text>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Analyse en cours...
            </Text>
          </View>
        ) : diagnosticInfo ? (
          <ScrollView style={styles.content}>
            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Informations système
              </Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.secondary }]}>Plateforme:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {diagnosticInfo.version}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.secondary }]}>SDK Spotify:</Text>
                <Text 
                  style={[
                    styles.infoValue, 
                    { color: diagnosticInfo.spotifySDKAvailable ? '#1DB954' : theme.error }
                  ]}
                >
                  {diagnosticInfo.spotifySDKAvailable ? 'Disponible' : 'Non disponible'}
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                État de la connexion
              </Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.secondary }]}>Connecté:</Text>
                <Text 
                  style={[
                    styles.infoValue, 
                    { color: diagnosticInfo.connectionInfo.isConnected ? '#1DB954' : theme.error }
                  ]}
                >
                  {diagnosticInfo.connectionInfo.isConnected ? 'Oui' : 'Non'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.secondary }]}>Spotify installé:</Text>
                <Text 
                  style={[
                    styles.infoValue, 
                    { color: diagnosticInfo.connectionInfo.isSpotifyInstalled ? '#1DB954' : theme.error }
                  ]}
                >
                  {diagnosticInfo.connectionInfo.isSpotifyInstalled ? 'Oui' : 'Non'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.secondary }]}>Compte Premium:</Text>
                <Text 
                  style={[
                    styles.infoValue, 
                    { color: diagnosticInfo.connectionInfo.isPremium ? '#1DB954' : theme.error }
                  ]}
                >
                  {diagnosticInfo.connectionInfo.isPremium ? 'Oui' : 'Non'}
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Informations d'authentification
              </Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.secondary }]}>Token valide:</Text>
                <Text 
                  style={[
                    styles.infoValue, 
                    { color: diagnosticInfo.hasValidToken ? '#1DB954' : theme.error }
                  ]}
                >
                  {diagnosticInfo.hasValidToken ? 'Oui' : 'Non'}
                </Text>
              </View>
              
              {diagnosticInfo.accessToken && (
                <View style={styles.tokenContainer}>
                  <Text style={[styles.infoLabel, { color: theme.secondary }]}>Token:</Text>
                  <Text style={[styles.tokenValue, { color: theme.text }]}>
                    {diagnosticInfo.accessToken}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Configuration Spotify
              </Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.secondary }]}>Test Config:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.infoValue, { color: configTestResult.includes('Erreur') || configTestResult === 'Non testé' ? theme.error : theme.success }]}>
                    {configTestResult}
                  </Text>
                  <TouchableOpacity 
                    onPress={testSpotifyConfig} 
                    style={[styles.testButton, { backgroundColor: theme.accent }]}
                    disabled={isTestingConfig}
                  >
                    {isTestingConfig ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.testButtonText}>Tester</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.secondary }]}>Redirect URL:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{SpotifyAuthService.getConfig().redirectUrl}</Text>
              </View>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={runDiagnostics}
              >
                <Text style={styles.actionButtonText}>Actualiser le diagnostic</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#1DB954', marginTop: 12 }]}
                onPress={handleReset}
              >
                <Text style={styles.actionButtonText}>Réinitialiser Spotify</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.text }]}>
              Impossible de récupérer les informations de diagnostic
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={runDiagnostics}
            >
              <Text style={styles.actionButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
  },
  tokenContainer: {
    marginTop: 12,
  },
  tokenValue: {
    fontSize: 14,
    marginTop: 4,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 5,
  },
  actionsContainer: {
    marginTop: 30,
    marginBottom: 40,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default SpotifyDiagnosticModal; 