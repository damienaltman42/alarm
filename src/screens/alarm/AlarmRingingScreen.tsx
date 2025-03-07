import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated, Easing, Alert, Image } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Alarm } from '../../types';
import { useTheme } from '../../hooks';
import { alarmManager } from '../../services/alarm/alarmManager';

// Messages de réveil amusants
const WAKE_UP_MESSAGES = [
  "Allez debout ! Même ton café s'est déjà réveillé avant toi ! ☕",
  "Si tu snooze encore, je t'ajoute automatiquement à un marathon. 🏃‍♂️",
  "C'est parti pour une nouvelle journée... ou un retour sous la couette ? 😴",
  "Le soleil est déjà levé, pourquoi pas toi ? 🌞",
  "Tu te réveilles... mais ton cerveau a besoin d'encore 5 minutes. 🧠💤"
];

// Type pour les paramètres de navigation
type RootStackParamList = {
  AlarmRinging: { alarm: Alarm };
  AlarmList: undefined;
  MainTabs: undefined;
};

type AlarmRingingScreenRouteProp = RouteProp<RootStackParamList, 'AlarmRinging'>;
type AlarmRingingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AlarmRinging'>;

interface AlarmRingingScreenProps {
  route: AlarmRingingScreenRouteProp;
  navigation: AlarmRingingScreenNavigationProp;
}

export const AlarmRingingScreen: React.FC<AlarmRingingScreenProps> = ({ route }) => {
  const { alarm } = route.params;
  const { theme } = useTheme();
  const navigation = useNavigation<AlarmRingingScreenNavigationProp>();
  
  // États pour les boutons
  const [isSnoozing, setIsSnoozing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  
  // Animation pour le message
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  
  // Sélectionner un message aléatoire
  const [wakeUpMessage] = useState(
    WAKE_UP_MESSAGES[Math.floor(Math.random() * WAKE_UP_MESSAGES.length)]
  );
  
  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Gérer le snooze
  const handleSnooze = async () => {
    try {
      // Éviter les doubles clics
      if (isSnoozing) return;
      setIsSnoozing(true);
      
      // Appeler la fonction snooze du gestionnaire d'alarmes
      await alarmManager.snoozeAlarm(alarm.snoozeInterval);
      
      // Message adapté selon que c'est 1 minute ou plusieurs minutes
      const minutesText = alarm.snoozeInterval === 1 ? 'minute' : 'minutes';
      
      // Afficher un message de confirmation
      Alert.alert(
        "Alarme reportée",
        `L'alarme sonnera à nouveau dans ${alarm.snoozeInterval} ${minutesText}.`,
        [{ text: "OK" }]
      );
      
      // Retourner à l'écran principal
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }]
      });
    } catch (error) {
      console.error('Erreur lors du snooze:', error);
      setIsSnoozing(false);
    }
  };
  
  // Gérer l'arrêt de l'alarme
  const handleStop = async () => {
    console.log("+++++++++++++++here handleStop AlarmRingingScreen +++++++++++++++++++++++");
    try {
      // Arrêter l'alarme
      await alarmManager.stopAlarm();
      
      // Retourner à l'écran principal
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }]
      });
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'alarme:', error);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Heure actuelle */}
        <Text style={[styles.time, { color: theme.text }]}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        
        {/* Source audio */}
        {alarm.alarmSound === 'radio' && alarm.radioStation ? (
          <View style={styles.audioSourceContainer}>
            <Ionicons name="radio" size={24} color={theme.primary} style={styles.audioSourceIcon} />
            <Text style={[styles.audioSourceName, { color: theme.primary }]}>
              {alarm.radioStation.name}
            </Text>
          </View>
        ) : alarm.alarmSound === 'spotify' && alarm.spotifyPlaylist ? (
          <View style={styles.audioSourceContainer}>
            <View style={styles.spotifyInfo}>
              {alarm.spotifyPlaylist.images && alarm.spotifyPlaylist.images.length > 0 ? (
                <Image 
                  source={{ uri: alarm.spotifyPlaylist.images[0].url }} 
                  style={styles.playlistImage} 
                />
              ) : (
                <View style={[styles.playlistImagePlaceholder, { backgroundColor: '#1DB954' }]}>
                  <Ionicons name="musical-notes" size={24} color="#fff" />
                </View>
              )}
              <View style={styles.spotifyTextInfo}>
                <Text style={[styles.audioSourceName, { color: theme.primary }]}>
                  {alarm.spotifyPlaylist.name}
                </Text>
                <Text style={[styles.spotifyOwner, { color: theme.secondary }]}>
                  {alarm.spotifyPlaylist.owner.display_name}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
        
        {/* Message de réveil */}
        <Animated.Text 
          style={[
            styles.message, 
            { 
              color: theme.text,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {wakeUpMessage}
        </Animated.Text>
        
        {/* Boutons d'action */}
        <View style={styles.buttonsContainer}>
          {/* Bouton Snooze */}
          {alarm.snoozeEnabled && (
            <TouchableOpacity 
              style={[styles.button, styles.snoozeButton, { backgroundColor: theme.card }]} 
              onPress={handleSnooze}
            >
              <Ionicons name="alarm-outline" size={24} color={theme.text} />
              <Text style={[styles.buttonText, { color: theme.text }]}>
                Snooze ({alarm.snoozeInterval} min)
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Bouton Stop */}
          <TouchableOpacity 
            style={[styles.button, styles.stopButton, { backgroundColor: theme.primary }]} 
            onPress={handleStop}
          >
            <Ionicons name="stop-circle-outline" size={24} color="#fff" />
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              Arrêter
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  time: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  radioName: {
    fontSize: 18,
    marginBottom: 40,
  },
  message: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 32,
  },
  buttonsContainer: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '80%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  snoozeButton: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  stopButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  audioSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  audioSourceIcon: {
    marginRight: 10,
  },
  audioSourceName: {
    fontSize: 18,
    fontWeight: '500',
  },
  spotifyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
  },
  playlistImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotifyTextInfo: {
    flexDirection: 'column',
  },
  spotifyOwner: {
    fontSize: 14,
    marginTop: 2,
  },
}); 