const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const cors = require("cors")({ origin: true });
const axios = require("axios");

// Configurez avec vos identifiants Spotify
const CLIENT_ID = "39d474184067408497b09fad92b1c0fa";
const CLIENT_SECRET = "f8a5df5a0e854b519db4068eb7a0dfa8"; // IMPORTANT: Vous DEVEZ ajouter votre Client Secret ici avant de déployer !
const REDIRECT_URI = "aurorawake://spotify-auth-callback";

// Fonction pour échanger le code contre un token
exports.swapSpotifyToken = onRequest({ region: "europe-west1" }, (request, response) => {
  cors(request, response, async () => {
    try {
      const { code } = request.query;
      
      if (!code) {
        return response.status(400).json({ error: "Code manquant" });
      }

      const tokenResponse = await axios({
        method: "POST",
        url: "https://accounts.spotify.com/api/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64")
        },
        data: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI
        }).toString()
      });

      return response.json(tokenResponse.data);
    } catch (error) {
      console.error("Erreur d\'échange de token:", error.response?.data || error.message);
      return response.status(500).json({ error: "Échec de l\'échange de token" });
    }
  });
});

// Fonction pour rafraîchir un token expiré
exports.refreshSpotifyToken = onRequest({ region: "europe-west1" }, (request, response) => {
  cors(request, response, async () => {
    try {
      const { refresh_token } = request.query;
      
      if (!refresh_token) {
        return response.status(400).json({ error: "Token de rafraîchissement manquant" });
      }

      const tokenResponse = await axios({
        method: "POST",
        url: "https://accounts.spotify.com/api/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64")
        },
        data: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token
        }).toString()
      });

      return response.json(tokenResponse.data);
    } catch (error) {
      console.error("Erreur de rafraîchissement de token:", error.response?.data || error.message);
      return response.status(500).json({ error: "Échec du rafraîchissement de token" });
    }
  });
});