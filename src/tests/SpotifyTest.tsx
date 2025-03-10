import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Platform,
  Alert,
  Image,
  FlatList,
  ActivityIndicator,
  Button,
  AppState
} from 'react-native';
import SpotifyAuthService from '../services/SpotifyAuthService';
import SpotifyService from '../services/SpotifyService';

type Playlist = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  tracks: number;
  uri: string;
};

const SpotifyTest = () => {
  const [logs] = useState<string[]>([
    "La fonctionnalité Spotify a été désactivée",
    "spotify-web-api-js a été supprimé du projet"
  ]);

  // Afficher un message d'alerte
  const showDisabledMessage = () => {
    Alert.alert(
      'Fonctionnalité désactivée',
      'La fonctionnalité Spotify a été désactivée dans cette version de l\'application.',
      [{ text: 'OK', style: 'cancel' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Test Spotify (Désactivé)</Text>
      </View>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          La fonctionnalité Spotify a été désactivée dans cette version de l'application.
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={showDisabledMessage}
        >
          <Text style={styles.buttonText}>Plus d'informations</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logs de désactivation:</Text>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              • {log}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1DB954',
    padding: 15,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#ffebee',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#b71c1c',
  },
  button: {
    backgroundColor: '#1DB954',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
});

export default SpotifyTest; 