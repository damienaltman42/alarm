import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Alarm, RadioStation, SpotifyPlaylist } from '../../types';
import { TimeSelector } from '../../components/alarm/TimeSelector';
import { DaySelector } from '../../components/alarm/DaySelector';
import { useTheme, useAlarm } from '../../hooks';
import SpotifyDiagnosticModal from '../../components/common/SpotifyDiagnosticModal';
import SpotifyAuthService from '../../services/SpotifyAuthService';

type RootStackParamList = {
  AlarmList: undefined;
  AddAlarm: { alarm?: Alarm };
  SearchRadio: { 
    onSelectStation: (station: RadioStation) => void; 
    selectedStation?: RadioStation | null;
  };
  SearchSpotify: { 
    onSelectPlaylist: (playlist: SpotifyPlaylist) => void; 
    selectedPlaylist?: SpotifyPlaylist | null;
  };
};

type AddAlarmScreenRouteProp = RouteProp<RootStackParamList, 'AddAlarm'>;
type AddAlarmScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddAlarm'>;

interface AddAlarmScreenProps {
  route: AddAlarmScreenRouteProp;
  navigation: AddAlarmScreenNavigationProp;
}

export const AddAlarmScreen: React.FC<AddAlarmScreenProps> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { addAlarm, updateAlarm } = useAlarm();
  const { t } = useTranslation(['alarm.screens', 'common']);
  
  // Récupérer l'alarme à modifier si elle existe
  const editingAlarm = route.params?.alarm;
  const isEditing = !!editingAlarm;

  // États pour les champs du formulaire
  const [time, setTime] = useState<string>(editingAlarm?.time || '08:00');
  const [repeatDays, setRepeatDays] = useState<number[]>(editingAlarm?.repeatDays || [1, 2, 3, 4, 5]); // Lun-Ven par défaut
  const [label, setLabel] = useState<string>(editingAlarm?.label || '');
  const [enabled, setEnabled] = useState<boolean>(editingAlarm?.enabled ?? true);
  const [snoozeEnabled, setSnoozeEnabled] = useState<boolean>(editingAlarm?.snoozeEnabled ?? true);
  const [snoozeInterval, setSnoozeInterval] = useState<number>(editingAlarm?.snoozeInterval || 5);
  const [radioStation, setRadioStation] = useState<RadioStation | null>(editingAlarm?.radioStation || null);
  const [spotifyPlaylist, setSpotifyPlaylist] = useState<SpotifyPlaylist | null>(editingAlarm?.spotifyPlaylist || null);
  const [alarmSound, setAlarmSound] = useState<'radio' | 'spotify'>(editingAlarm?.alarmSound || 'radio');
  const [diagnosticVisible, setDiagnosticVisible] = useState(false);
  // Ajouter un état pour suivre si une tentative d'authentification est en cours
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  // Ajouter un état pour stocker le résultat de la dernière vérification d'authentification
  const [spotifyAuthenticated, setSpotifyAuthenticated] = useState<boolean | null>(null);

  // Effet pour vérifier le statut d'authentification Spotify au chargement
  useEffect(() => {
    const checkSpotifyAuth = async () => {
      try {
        const hasToken = await SpotifyAuthService.hasValidToken();
        setSpotifyAuthenticated(hasToken);
      } catch (error) {
        console.error('Erreur lors de la vérification du token Spotify:', error);
        setSpotifyAuthenticated(false);
      }
    };
    
    checkSpotifyAuth();
  }, []);

  // Naviguer vers l'écran de recherche de radio
  const navigateToRadioSearch = (): void => {
    navigation.navigate('SearchRadio', {
      onSelectStation: handleSelectRadioStation,
      selectedStation: radioStation
    });
  };

  // Naviguer vers l'écran de recherche de playlist Spotify
  const navigateToSpotifySearch = async (): Promise<void> => {
    try {
      // Éviter les tentatives multiples d'authentification
      if (isAuthenticating) {
        console.log('🔒 Authentification déjà en cours, ignorée');
        return;
      }

      setIsAuthenticating(true);
      
      // Vérifier si l'utilisateur est déjà connecté à Spotify
      const hasToken = await SpotifyAuthService.hasValidToken();
      
      if (hasToken) {
        // L'utilisateur est authentifié, mettre à jour l'état et naviguer
        setSpotifyAuthenticated(true);
        console.log('✅ Token valide détecté, navigation vers la recherche Spotify');
        navigation.navigate('SearchSpotify', {
          onSelectPlaylist: handleSelectSpotifyPlaylist,
          selectedPlaylist: spotifyPlaylist
        });
        setIsAuthenticating(false);
        return;
      }
      
      console.log('🔍 Utilisateur non connecté à Spotify, lancement du processus d\'authentification...');
      
      // Afficher une alerte simple pour informer l'utilisateur
      Alert.alert(
        'Connexion Spotify requise',
        'Vous devez vous connecter à Spotify pour accéder à vos playlists. La fenêtre d\'authentification va s\'ouvrir.',
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => {
              setIsAuthenticating(false);
            }
          },
          {
            text: 'Se connecter',
            onPress: async () => {
              try {
                // Utiliser directement authorizeAlternative qui est plus fiable
                const success = await SpotifyAuthService.authorizeAlternative();
                
                if (success) {
                  // Mise à jour de l'état d'authentification
                  setSpotifyAuthenticated(true);
                  
                  // Notification de succès simple
                  Alert.alert('Connexion réussie', 'Vous êtes maintenant connecté à Spotify');
                  
                  // Naviguer vers l'écran de recherche
                  navigation.navigate('SearchSpotify', {
                    onSelectPlaylist: handleSelectSpotifyPlaylist,
                    selectedPlaylist: spotifyPlaylist
                  });
                } else {
                  // En cas d'échec, afficher une alerte simple
                  Alert.alert(
                    'Échec de connexion',
                    'Impossible de se connecter à Spotify. Veuillez réessayer ultérieurement.'
                  );
                }
              } catch (error) {
                console.error('Erreur lors de l\'authentification Spotify:', error);
                Alert.alert(
                  'Erreur',
                  'Une erreur s\'est produite lors de la connexion à Spotify.'
                );
              } finally {
                setIsAuthenticating(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la vérification de la connexion Spotify:', error);
      setIsAuthenticating(false);
    }
  };

  // Gérer la sélection d'une station de radio
  const handleSelectRadioStation = (station: RadioStation): void => {
    console.log('Station sélectionnée:', station.name);
    setRadioStation(station);
    setAlarmSound('radio');
    setSpotifyPlaylist(null);
  };

  // Gérer la sélection d'une playlist Spotify
  const handleSelectSpotifyPlaylist = (playlist: SpotifyPlaylist): void => {
    console.log('Playlist sélectionnée:', playlist.name);
    setSpotifyPlaylist(playlist);
    setAlarmSound('spotify');
    setRadioStation(null);
  };

  // Gérer la suppression de la station de radio sélectionnée
  const handleClearRadioStation = (): void => {
    setRadioStation(null);
    if (!spotifyPlaylist) {
      // Si aucune playlist Spotify n'est sélectionnée, on ne fait rien
      // Sinon on laisserait l'utilisateur sans aucune source de son
    }
  };

  // Gérer la suppression de la playlist Spotify sélectionnée
  const handleClearSpotifyPlaylist = (): void => {
    setSpotifyPlaylist(null);
    if (!radioStation) {
      // Si aucune station de radio n'est sélectionnée, on ne fait rien
      // Sinon on laisserait l'utilisateur sans aucune source de son
    }
  };

  // Fonction pour générer un ID unique sans utiliser uuid
  const generateUniqueId = (): string => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`;
  };

  // Gérer la sauvegarde de l'alarme
  const handleSaveAlarm = async (): Promise<void> => {
    if (!radioStation && !spotifyPlaylist) {
      Alert.alert('Source sonore manquante', 'Veuillez sélectionner une station de radio ou une playlist Spotify pour cette alarme.');
      return;
    }

    try {
      const alarm: Alarm = {
        id: editingAlarm?.id || generateUniqueId(),
        time,
        repeatDays,
        label,
        enabled,
        snoozeEnabled,
        snoozeInterval,
        radioStation,
        spotifyPlaylist,
        alarmSound,
      };

      console.log('@@@@@@@@@@@@@@@ Sauvegarde de l\'alarme avec ID:', alarm.id);

      let success: boolean;
      if (isEditing) {
        console.log("+++++++++++++++here updateAlarm  AddAlarmScreen +++++++++++++++++++++++");
        success = await updateAlarm(alarm);
      } else {
        success = await addAlarm(alarm);
      }

      if (success) {
        navigation.goBack();
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder l\'alarme.');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'alarme:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'alarme.');
    }
  };

  const openDiagnosticModal = () => {
    setDiagnosticVisible(true);
  };

  const closeDiagnosticModal = () => {
    setDiagnosticVisible(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {isEditing ? t('alarm.screens:addAlarm.editTitle') : t('alarm.screens:addAlarm.title')}
            </Text>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.primary }]} 
              onPress={handleSaveAlarm}
            >
              <Text style={styles.saveButtonText}>
                {t('alarm.screens:addAlarm.save')}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <TimeSelector time={time} onChange={setTime} useScreenLabel={true} />
            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('alarm.screens:addAlarm.days')}
            </Text>
            <DaySelector selectedDays={repeatDays} onChange={setRepeatDays} />
          </View>
          
          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('alarm.screens:addAlarm.alarmName')}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder={t('alarm.screens:addAlarm.alarmNamePlaceholder')}
              placeholderTextColor={theme.secondary}
              value={label}
              onChangeText={setLabel}
              maxLength={30}
            />
          </View>

          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('alarm.screens:addAlarm.sound')}
            </Text>
            <View style={styles.soundSourceContainer}>
              <TouchableOpacity
                style={[
                  styles.soundSourceTab,
                  { borderColor: theme.border },
                  alarmSound === 'radio' && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setAlarmSound('radio')}
              >
                <Ionicons 
                  name="radio"
                  size={20} 
                  color={alarmSound === 'radio' ? '#fff' : theme.secondary} 
                />
                <Text 
                  style={[
                    styles.soundSourceText, 
                    { color: alarmSound === 'radio' ? '#fff' : theme.secondary }
                  ]}
                >
                  {t('alarm.screens:addAlarm.radioStation')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.soundSourceTab,
                  { borderColor: theme.border },
                  alarmSound === 'spotify' && { backgroundColor: '#1DB954', borderColor: '#1DB954' }
                ]}
                onPress={() => setAlarmSound('spotify')}
              >
                <Ionicons 
                  name="musical-notes" 
                  size={20} 
                  color={alarmSound === 'spotify' ? '#fff' : theme.secondary} 
                />
                <Text 
                  style={[
                    styles.soundSourceText, 
                    { color: alarmSound === 'spotify' ? '#fff' : theme.secondary }
                  ]}
                >
                  {t('alarm.screens:addAlarm.spotifyPlaylist')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {alarmSound === 'radio' && (
              <>
                {radioStation ? (
                  <View style={styles.selectedRadioContainer}>
                    <View style={styles.selectedRadioInfo}>
                      <Text style={[styles.radioName, { color: theme.text }]}>{radioStation.name}</Text>
                      {radioStation.country && (
                        <Text style={[styles.radioDetail, { color: theme.secondary }]}>
                          {radioStation.country}
                        </Text>
                      )}
                    </View>
                    <View style={styles.radioActions}>
                      <TouchableOpacity
                        style={[styles.radioButton, { backgroundColor: theme.primary }]}
                        onPress={navigateToRadioSearch}
                      >
                        <Ionicons name="swap-horizontal" size={18} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.radioButton, { backgroundColor: theme.error }]}
                        onPress={handleClearRadioStation}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.selectSoundButton, { borderColor: theme.primary }]}
                    onPress={navigateToRadioSearch}
                  >
                    <Ionicons name="radio-outline" size={24} color={theme.primary} />
                    <Text style={[styles.selectSoundText, { color: theme.primary }]}>
                      {t('alarm.screens:addAlarm.selectRadio')}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {alarmSound === 'spotify' && (
              <>
                {spotifyPlaylist ? (
                  <View style={styles.selectedRadioContainer}>
                    <View style={styles.selectedRadioInfo}>
                      <Text style={[styles.radioName, { color: theme.text }]}>{spotifyPlaylist.name}</Text>
                      {spotifyPlaylist.owner && typeof spotifyPlaylist.owner === 'string' ? (
                        <Text style={[styles.radioDetail, { color: theme.secondary }]}>
                          {spotifyPlaylist.owner}
                        </Text>
                      ) : spotifyPlaylist.owner && typeof spotifyPlaylist.owner === 'object' && 'display_name' in spotifyPlaylist.owner ? (
                        <Text style={[styles.radioDetail, { color: theme.secondary }]}>
                          {spotifyPlaylist.owner.display_name}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.radioActions}>
                      <TouchableOpacity
                        style={[styles.radioButton, { backgroundColor: theme.primary }]}
                        onPress={navigateToSpotifySearch}
                      >
                        <Ionicons name="search" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.radioButton, { backgroundColor: theme.error }]}
                        onPress={handleClearSpotifyPlaylist}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noRadioContainer}>
                    <TouchableOpacity
                      style={[styles.selectRadioButton, { backgroundColor: '#1DB954' }]}
                      onPress={navigateToSpotifySearch}
                    >
                      <Text style={styles.selectRadioButtonText}>
                        {t('alarm.screens:addAlarm.selectSpotifyPlaylist')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>
                {t('alarm.screens:addAlarm.enabled')}
              </Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: theme.border, true: theme.primary + '80' }}
                thumbColor={enabled ? theme.primary : theme.secondary}
              />
            </View>
          </View>

          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>
                {t('alarm.screens:addAlarm.enableSnooze')}
              </Text>
              <Switch
                value={snoozeEnabled}
                onValueChange={setSnoozeEnabled}
                trackColor={{ false: theme.border, true: theme.primary + '80' }}
                thumbColor={snoozeEnabled ? theme.primary : theme.secondary}
              />
            </View>
            {snoozeEnabled && (
              <View style={styles.snoozeIntervalContainer}>
                <Text style={[styles.snoozeIntervalLabel, { color: theme.text }]}>
                  {t('alarm.screens:addAlarm.snoozeInterval')}
                </Text>
                
                <View style={styles.snoozeOptionsContainer}>
                  {[5, 10, 30].map((interval) => (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.snoozeOption,
                        snoozeInterval === interval && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => setSnoozeInterval(interval)}
                    >
                      <Text 
                        style={[
                          styles.snoozeOptionText, 
                          snoozeInterval === interval && { color: 'white' }
                        ]}
                      >
                        {interval}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TextInput
                  style={[styles.snoozeIntervalInput, { color: theme.text, borderColor: theme.border }]}
                  value={snoozeInterval.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text);
                    if (!isNaN(value) && value > 0) {
                      setSnoozeInterval(value);
                    } else if (text === '') {
                      setSnoozeInterval(0);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholderTextColor={theme.secondary}
                  placeholder={t('alarm.screens:addAlarm.snoozeCustom')}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Modale de diagnostic Spotify */}
      <SpotifyDiagnosticModal
        visible={diagnosticVisible}
        onClose={closeDiagnosticModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    // Supprimer cette propriété car elle n'est plus nécessaire
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  snoozeIntervalContainer: {
    marginTop: 16,
  },
  snoozeIntervalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  snoozeIntervalInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    width: '100%',
    marginTop: 4,
  },
  selectSoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderStyle: 'dashed',
  },
  selectSoundText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  selectedRadioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
  },
  selectedRadioInfo: {
    flex: 1,
  },
  radioName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  radioDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  radioActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  soundSourceContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 8,
  },
  soundSourceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  soundSourceText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 6,
  },
  snoozeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  snoozeOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoozeOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  noRadioContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  selectRadioButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  selectRadioButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 