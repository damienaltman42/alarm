import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SpotifyPlaylist } from '../types/spotify';
import { useTheme } from '../hooks';
import SpotifyAuthService from '../services/SpotifyAuthService';
import SpotifyService from '../services/SpotifyService';
import SpotifyDiagnosticModal from '../components/SpotifyDiagnosticModal';

type RootStackParamList = {
  AddAlarm: undefined;
  SearchSpotify: {
    onSelectPlaylist: (playlist: SpotifyPlaylist) => void;
    selectedPlaylist?: SpotifyPlaylist | null;
  };
};

type SearchSpotifyScreenRouteProp = RouteProp<RootStackParamList, 'SearchSpotify'>;
type SearchSpotifyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SearchSpotify'>;

interface SearchSpotifyScreenProps {
  route: SearchSpotifyScreenRouteProp;
  navigation: SearchSpotifyScreenNavigationProp;
}

export const SearchSpotifyScreen: React.FC<SearchSpotifyScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { onSelectPlaylist, selectedPlaylist } = route.params;

  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [isSpotifyAvailable, setIsSpotifyAvailable] = useState<boolean>(false);
  const [spotifyCheckCompleted, setSpotifyCheckCompleted] = useState<boolean>(false);
  const [diagnosticVisible, setDiagnosticVisible] = useState(false);
  const [isLoadingSpotify, setIsLoadingSpotify] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Charger les playlists au démarrage
  useEffect(() => {
    checkSpotifyAvailability();
  }, []);

  // Vérifier la disponibilité de Spotify
  const checkSpotifyAvailability = async (): Promise<void> => {
    console.log('Vérification de la disponibilité de Spotify...');
    setIsLoadingSpotify(true);
    
    // Incrémenter le compteur d'essais
    setRetryCount(prev => prev + 1);

    // Détection d'appareil iOS pour forcer l'initialisation
    if (Platform.OS === 'ios') {
      console.log('Appareil iOS détecté, tentative d\'initialisation forcée');
      try {
        const spotifyRemote = require('react-native-spotify-remote');
        console.log('Module Spotify chargé manuellement:', !!spotifyRemote.auth);
      } catch (error) {
        console.error('Erreur lors du chargement manuel de Spotify:', error);
      }
    }

    // Initialiser le service Spotify
    const initialized = await SpotifyAuthService.initialize();
    
    // Si on a dépassé le nombre maximal d'essais, arrêter les tentatives
    if (retryCount >= MAX_RETRIES && !initialized) {
      console.log(`Arrêt des tentatives après ${MAX_RETRIES} essais sans succès`);
      setIsSpotifyAvailable(false);
      setIsLoadingSpotify(false);
      return;
    }

    if (initialized) {
      setIsSpotifyAvailable(true);
      // Vérifier l'authentification et charger les playlists
      await checkAuthAndLoadPlaylists();
    } else {
      setIsSpotifyAvailable(false);
    }
    
    setIsLoadingSpotify(false);
  };

  // Vérifier l'authentification et charger les playlists
  const checkAuthAndLoadPlaylists = async (): Promise<void> => {
    setLoading(true);

    try {
      // Vérifier si l'utilisateur est déjà authentifié
      const hasValidToken = await SpotifyAuthService.hasValidToken();
      console.log('Token valide disponible:', hasValidToken);

      if (!hasValidToken) {
        console.log('Aucun token valide, la connexion à Spotify sera nécessaire');
        setLoading(false);
        return;
      }

      // Récupérer les playlists de l'utilisateur
      await loadPlaylists();
    } catch (error: any) {
      console.error('Erreur lors de la vérification de l\'authentification:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Charger les playlists de l'utilisateur
  const loadPlaylists = async (): Promise<void> => {
    try {
      console.log("Chargement des playlists...");
      const userPlaylists = await SpotifyService.getUserPlaylists();
      console.log(`${userPlaylists.length} playlists récupérées`);
      setPlaylists(userPlaylists);
    } catch (error: any) {
      console.error('Erreur lors du chargement des playlists:', error.message);
      Alert.alert('Erreur', 'Impossible de charger vos playlists Spotify.');
    }
  };

  // Gérer la connexion à Spotify
  const handleConnectToSpotify = async (): Promise<void> => {
    setLoading(true);
    try {
      const success = await SpotifyAuthService.authorize();
      
      if (success) {
        setAuthenticated(true);
        await loadPlaylists();
      } else {
        Alert.alert('Erreur', 'Impossible de se connecter à Spotify. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion à Spotify:', error);
      Alert.alert('Erreur', 'Une erreur s\'est produite lors de la connexion à Spotify.');
    } finally {
      setLoading(false);
    }
  };

  // Gérer le rafraîchissement des playlists
  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadPlaylists();
    setRefreshing(false);
  };

  // Sélectionner une playlist
  const handleSelectPlaylist = (playlist: SpotifyPlaylist): void => {
    onSelectPlaylist(playlist);
    navigation.goBack();
  };

  // Fonction pour réinitialiser et retenter la connexion
  const resetAndRetry = async () => {
    setRetryCount(0); // Réinitialiser le compteur d'essais
    setIsLoadingSpotify(true);
    await SpotifyAuthService.resetAndReconnect();
    checkSpotifyAvailability();
  };

  // Rendu d'un élément de la liste des playlists
  const renderPlaylistItem = ({ item }: { item: SpotifyPlaylist }): React.ReactElement => {
    const isSelected = selectedPlaylist?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.playlistItem,
          { backgroundColor: theme.card },
          isSelected && { borderColor: theme.primary, borderWidth: 2 }
        ]}
        onPress={() => handleSelectPlaylist(item)}
      >
        <View style={styles.playlistImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0].url }}
              style={styles.playlistImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.playlistImagePlaceholder, { backgroundColor: theme.secondary }]}>
              <Ionicons name="musical-notes" size={30} color={theme.text} />
            </View>
          )}
        </View>
        <View style={styles.playlistInfo}>
          <Text style={[styles.playlistName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.playlistOwner, { color: theme.secondary }]} numberOfLines={1}>
            {item.owner.display_name}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIcon}>
            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Informer l'utilisateur sur les builds natives
  const openExpoSettings = () => {
    Alert.alert(
      'Build native requise',
      'L\'intégration Spotify nécessite une build native de l\'application. Les fonctionnalités Spotify ne sont pas disponibles dans Expo Go.',
      [
        { 
          text: 'En savoir plus', 
          onPress: () => {
            Linking.openURL('https://docs.expo.dev/workflow/development-builds/');
          } 
        },
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const openDiagnosticModal = () => {
    setDiagnosticVisible(true);
  };

  const closeDiagnosticModal = () => {
    setDiagnosticVisible(false);
  };

  // Afficher un message si Spotify n'est pas disponible
  if (!isSpotifyAvailable) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Spotify</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centeredContent}>
          <Text style={[styles.messageText, { color: theme.text }]}>
            {isLoadingSpotify 
              ? "Vérification de Spotify en cours..." 
              : "Spotify n'est pas disponible sur ce périphérique.\n\nVous devez utiliser un appareil physique avec l'application Spotify installée."}
          </Text>
          
          {!isLoadingSpotify && (
            <TouchableOpacity 
              onPress={resetAndRetry} 
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.connectButtonText}>Réessayer</Text>
            </TouchableOpacity>
          )}
          
          {isLoadingSpotify && (
            <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'right', 'left']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>
            Playlists Spotify
          </Text>
          <TouchableOpacity onPress={openDiagnosticModal} style={styles.rightHeader}>
            <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Vérification de Spotify...
            </Text>
          </View>
        ) : playlists.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="musical-notes" size={60} color={theme.secondary} />
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
              Aucune playlist trouvée
            </Text>
            <Text style={[styles.emptyStateSubtitle, { color: theme.secondary }]}>
              Vous n'avez pas encore de playlists dans votre bibliothèque Spotify.
            </Text>
          </View>
        ) : (
          <FlatList
            data={playlists}
            renderItem={renderPlaylistItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
          />
        )}
      </View>
      <SpotifyDiagnosticModal 
        visible={diagnosticVisible} 
        onClose={closeDiagnosticModal} 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  rightHeader: {
    width: 40,
  },
  listContent: {
    padding: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  playlistImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  playlistImage: {
    width: '100%',
    height: '100%',
  },
  playlistImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  playlistOwner: {
    fontSize: 14,
    color: '#666',
  },
  selectedIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  connectButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 50,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  messageText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 50,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 24,
  },
}); 