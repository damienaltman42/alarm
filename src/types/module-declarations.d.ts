// Déclaration pour react-native-push-notification
declare module 'react-native-push-notification' {
  export interface PushNotificationOptions {
    channelId?: string;
    channelName?: string;
    channelDescription?: string;
    playSound?: boolean;
    soundName?: string;
    importance?: number;
    vibrate?: boolean;
    vibration?: number;
    actions?: string[];
    category?: string;
    userInfo?: object;
    title?: string;
    message?: string;
    color?: string;
    tag?: string;
    id?: string | number;
    date?: Date;
    allowWhileIdle?: boolean;
    visibility?: 'private' | 'public' | 'secret';
    ignoreInForeground?: boolean;
    largeIcon?: string;
    smallIcon?: string;
    onlyAlertOnce?: boolean;
    [key: string]: any;
  }

  export interface PushNotification {
    finish: (fetchResult: string) => void;
    getMessage: () => string;
    getTitle: () => string;
    data: any;
    foreground: boolean;
    userInteraction: boolean;
    [key: string]: any;
  }

  export interface PushNotificationPermissions {
    alert?: boolean;
    badge?: boolean;
    sound?: boolean;
  }

  export interface PushNotificationChannel {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    importance?: number;
    vibrate?: boolean;
    playSound?: boolean;
    soundName?: string;
  }

  export default class PushNotificationStatic {
    static configure(options: {
      onNotification?: (notification: PushNotification) => void;
      onRegister?: (token: { token: string }) => void;
      onError?: (error: Error) => void;
      onAction?: (notification: PushNotification) => void;
      permissions?: PushNotificationPermissions;
      popInitialNotification?: boolean;
      requestPermissions?: boolean;
    }): void;

    static localNotification(details: PushNotificationOptions): void;
    static localNotificationSchedule(details: PushNotificationOptions): void;
    static cancelLocalNotifications(userInfo: object): void;
    static cancelLocalNotification(id: string): void;
    static cancelAllLocalNotifications(): void;
    static getScheduledLocalNotifications(callback: (notifications: PushNotificationOptions[]) => void): void;
    static createChannel(channel: PushNotificationChannel, callback?: (created: boolean) => void): void;
    static channelExists(channelId: string, callback: (exists: boolean) => void): void;
    static deleteChannel(channelId: string): void;
    static getChannels(callback: (channels: PushNotificationChannel[]) => void): void;
    static removeAllDeliveredNotifications(): void;
  }
}

// Déclaration pour @react-native-community/push-notification-ios
declare module '@react-native-community/push-notification-ios' {
  export enum FetchResult {
    NoData = 'UIBackgroundFetchResultNoData',
    NewData = 'UIBackgroundFetchResultNewData',
    Failed = 'UIBackgroundFetchResultFailed',
  }

  export default class PushNotificationIOS {
    static FetchResult: typeof FetchResult;
  }
}

// Déclaration pour react-native-track-player
declare module 'react-native-track-player' {
  export interface Track {
    id?: string;
    url: string;
    type?: 'default' | 'dash' | 'hls' | 'smoothstreaming';
    title?: string;
    artist?: string;
    album?: string;
    artwork?: string;
    duration?: number;
    date?: string;
    isLiveStream?: boolean;
    userAgent?: string;
    headers?: Record<string, string>;
    [key: string]: any;
  }

  export enum Event {
    PlaybackState = 'playback-state',
    PlaybackError = 'playback-error',
    PlaybackQueueEnded = 'playback-queue-ended',
    PlaybackTrackChanged = 'playback-track-changed',
    PlaybackMetadataReceived = 'playback-metadata-received',
    RemotePlay = 'remote-play',
    RemotePause = 'remote-pause',
    RemoteStop = 'remote-stop',
    RemoteSkip = 'remote-skip',
    RemoteNext = 'remote-next',
    RemotePrevious = 'remote-previous',
    RemoteJumpForward = 'remote-jump-forward',
    RemoteJumpBackward = 'remote-jump-backward',
    RemoteSeek = 'remote-seek',
    RemoteDuck = 'remote-duck',
  }

  export enum State {
    None = 0,
    Ready = 1,
    Playing = 2,
    Paused = 3,
    Stopped = 4,
    Buffering = 6,
    Connecting = 8,
  }

  export enum Capability {
    Play = 'play',
    Pause = 'pause',
    Stop = 'stop',
    SkipToNext = 'skip_to_next',
    SkipToPrevious = 'skip_to_previous',
    JumpForward = 'jump_forward',
    JumpBackward = 'jump_backward',
    SeekTo = 'seek_to',
  }

  export enum RepeatMode {
    Off = 0,
    Track = 1,
    Queue = 2,
  }

  export enum AppKilledPlaybackBehavior {
    ContinuePlayback = 'continue_playback',
    PausePlayback = 'pause_playback',
    StopPlaybackAndRemoveNotification = 'stop_playback_and_remove_notification',
  }

  export function setupPlayer(options?: any): Promise<boolean>;
  export function updateOptions(options: any): Promise<void>;
  export function registerPlaybackService(serviceProvider: () => void): void;
  export function play(): Promise<void>;
  export function pause(): Promise<void>;
  export function stop(): Promise<void>;
  export function add(tracks: Track | Track[]): Promise<void>;
  export function reset(): Promise<void>;
  export function getCurrentTrack(): Promise<string | null | undefined>;
  export function getPosition(): Promise<number>;
  export function setRepeatMode(mode: RepeatMode): Promise<void>;
  export function seekTo(position: number): Promise<void>;
  export function addEventListener(event: Event, listener: (data: any) => void): () => void;
}

/**
 * Déclaration de module pour react-native-background-timer
 */
declare module 'react-native-background-timer' {
  export function setTimeout(callback: () => void, timeout: number): number;
  export function clearTimeout(timeoutId: number): void;
  export function setInterval(callback: () => void, timeout: number): number;
  export function clearInterval(intervalId: number): void;
  export function start(delay?: number): void;
  export function stop(): void;
  export function runBackgroundTimer(callback: () => void, timeout: number): void;
  export function stopBackgroundTimer(): void;
  export default {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    start,
    stop,
    runBackgroundTimer,
    stopBackgroundTimer
  };
} 