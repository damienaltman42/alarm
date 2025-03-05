export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  owner: {
    display_name: string;
  };
  images: Array<{
    url: string;
  }>;
  description?: string;
}

export interface SpotifyAuthConfig {
  clientId: string;
  redirectUrl: string;
  tokenRefreshUrl?: string;
  tokenSwapUrl?: string;
  scopes: string[];
}

export interface SpotifyTokens {
  accessToken: string;
  refreshToken?: string;
  expirationDate: number; // timestamp en millisecondes
}

export interface SpotifyConnectionInfo {
  isConnected: boolean;
  isSpotifyInstalled: boolean;
  isPremium: boolean;
} 