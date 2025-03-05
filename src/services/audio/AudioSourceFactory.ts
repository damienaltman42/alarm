import { Alarm } from '../../types';
import { AudioSource } from './AudioSource';
import { RadioSource } from './RadioSource';
import { SpotifySource } from './SpotifySource';

/**
 * Factory pour créer des sources audio
 * Crée la source audio appropriée en fonction du type d'alarme
 */
export class AudioSourceFactory {
  /**
   * Crée une source audio pour une alarme
   * @param alarm Alarme pour laquelle créer une source audio
   * @returns Source audio ou null si aucune source n'est disponible
   */
  public static createSourceForAlarm(alarm: Alarm): AudioSource | null {
    // Vérifier si l'alarme utilise Spotify
    if (alarm.alarmSound === 'spotify' && alarm.spotifyPlaylist) {
      return new SpotifySource(
        alarm.spotifyPlaylist.uri,
        alarm.spotifyPlaylist.name
      );
    }
    
    // Vérifier si l'alarme utilise une station de radio
    if (alarm.radioStation) {
      return new RadioSource(
        alarm.radioStation.url_resolved,
        alarm.radioStation.name
      );
    }
    
    // Aucune source audio disponible
    console.warn(`Aucune source audio disponible pour l'alarme ${alarm.id}`);
    return null;
  }
} 