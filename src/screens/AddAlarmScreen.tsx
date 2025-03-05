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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alarm, RadioStation, SpotifyPlaylist } from '../types';
import { TimeSelector } from '../components/TimeSelector';
import { DaySelector } from '../components/DaySelector';
import { useTheme, useAlarm } from '../hooks';

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
  
  // Récupérer l'alarme à modifier si elle existe
  const editingAlarm = route.params?.alarm;
  const isEditing = !!editingAlarm;

  // États pour les champs du formulaire
  const [time, setTime] = useState<string>(editingAlarm?.time || '08:00');
  const [days, setDays] = useState<number[]>(editingAlarm?.days || [1, 2, 3, 4, 5]); // Lun-Ven par défaut
  const [label, setLabel] = useState<string>(editingAlarm?.label || '');
  const [enabled, setEnabled] = useState<boolean>(editingAlarm?.enabled ?? true);
  const [snoozeEnabled, setSnoozeEnabled] = useState<boolean>(editingAlarm?.snoozeEnabled ?? true);
  const [snoozeInterval, setSnoozeInterval] = useState<number>(editingAlarm?.snoozeInterval || 5);
  const [radioStation, setRadioStation] = useState<RadioStation | null>(editingAlarm?.radioStation || null);
  const [spotifyPlaylist, setSpotifyPlaylist] = useState<SpotifyPlaylist | null>(editingAlarm?.spotifyPlaylist || null);
  const [alarmSound, setAlarmSound] = useState<'radio' | 'spotify'>(editingAlarm?.alarmSound || 'radio');

  // Naviguer vers l'écran de recherche de radio
  const navigateToRadioSearch = (): void => {
    navigation.navigate('SearchRadio', {
      onSelectStation: handleSelectRadioStation,
      selectedStation: radioStation
    });
  };

  // Naviguer vers l'écran de recherche de playlist Spotify
  const navigateToSpotifySearch = (): void => {
    navigation.navigate('SearchSpotify', {
      onSelectPlaylist: handleSelectSpotifyPlaylist,
      selectedPlaylist: spotifyPlaylist
    });
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
        days,
        label,
        enabled,
        snoozeEnabled,
        snoozeInterval,
        radioStation,
        spotifyPlaylist,
        alarmSound,
      };

      console.log('Sauvegarde de l\'alarme avec ID:', alarm.id);

      let success: boolean;
      if (isEditing) {
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'right', 'left']}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>
              {isEditing ? 'Modifier l\'alarme' : 'Nouvelle alarme'}
            </Text>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveAlarm}>
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <TimeSelector time={time} onChange={setTime} />
          </View>

          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Jours</Text>
            <DaySelector selectedDays={days} onChange={setDays} />
          </View>

          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Étiquette</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Étiquette (optionnel)"
              placeholderTextColor={theme.secondary}
              value={label}
              onChangeText={setLabel}
              maxLength={30}
            />
          </View>

          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Source sonore</Text>
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
                  Radio
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
                  Spotify
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
                      Sélectionner une station
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
                      <Text style={[styles.radioDetail, { color: theme.secondary }]}>
                        {spotifyPlaylist.owner.display_name}
                      </Text>
                    </View>
                    <View style={styles.radioActions}>
                      <TouchableOpacity
                        style={[styles.radioButton, { backgroundColor: '#1DB954' }]}
                        onPress={navigateToSpotifySearch}
                      >
                        <Ionicons name="swap-horizontal" size={18} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.radioButton, { backgroundColor: theme.error }]}
                        onPress={handleClearSpotifyPlaylist}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.selectSoundButton, { borderColor: '#1DB954' }]}
                    onPress={navigateToSpotifySearch}
                  >
                    <Ionicons name="musical-notes" size={24} color="#1DB954" />
                    <Text style={[styles.selectSoundText, { color: '#1DB954' }]}>
                      Sélectionner une playlist
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={[styles.formSection, { backgroundColor: theme.card }]}>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Activer l'alarme</Text>
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
              <Text style={[styles.switchLabel, { color: theme.text }]}>Activer le report</Text>
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
                  Intervalle de report (minutes)
                </Text>
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
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
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
}); 