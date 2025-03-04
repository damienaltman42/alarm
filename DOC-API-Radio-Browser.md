Voici une documentation détaillée des principales routes de l'API Radio Browser, conçue pour aider au développement de votre application de réveil intégrant des stations de radio en ligne. Cette documentation couvre les endpoints essentiels, les paramètres requis et les structures de réponse associées.

---

## Table des Matières

1. [Introduction](#introduction)
2. [Considérations Générales](#considérations-générales)
3. [Endpoints Principaux](#endpoints-principaux)
   - [Liste des Stations de Radio](#liste-des-stations-de-radio)
   - [Recherche de Stations par Nom](#recherche-de-stations-par-nom)
   - [Liste des Pays](#liste-des-pays)
   - [Liste des Tags (Genres)](#liste-des-tags-genres)
4. [Structures de Réponse](#structures-de-réponse)
   - [Structure d'une Station](#structure-dune-station)
   - [Structure d'un Pays](#structure-dun-pays)
   - [Structure d'un Tag](#structure-dun-tag)
5. [Exemples de Requêtes](#exemples-de-requêtes)
   - [Exemple de Requête pour Obtenir des Stations de Jazz](#exemple-de-requête-pour-obtenir-des-stations-de-jazz)
   - [Exemple de Requête pour Obtenir la Liste des Pays Disponibles](#exemple-de-requête-pour-obtenir-la-liste-des-pays-disponibles)
   - [Exemple de Requête pour Obtenir la Liste des Tags Disponibles](#exemple-de-requête-pour-obtenir-la-liste-des-tags-disponibles)

---

## Introduction

L'API Radio Browser est une interface ouverte permettant d'accéder à une base de données exhaustive de stations de radio en ligne à travers le monde. Elle offre des endpoints pour rechercher et récupérer des informations détaillées sur ces stations, facilitant ainsi leur intégration dans des applications ou des sites web.

---

## Considérations Générales

- **Sélection du Serveur API :** L'API est distribuée sur plusieurs serveurs. Il est recommandé de sélectionner un serveur de manière aléatoire ou de permettre à l'utilisateur de choisir un serveur spécifique pour équilibrer la charge. Par exemple :
  - `https://de1.api.radio-browser.info`
  - `https://nl.api.radio-browser.info`
  - `https://at1.api.radio-browser.info`

- **User-Agent :** Lors des requêtes HTTP, il est conseillé d'utiliser un User-Agent identifiable, tel que `NomDeVotreApplication/1.0`, pour faciliter la communication avec les développeurs de l'API.

---

## Endpoints Principaux

### Liste des Stations de Radio

- **Description :** Récupère une liste de stations de radio selon des critères spécifiques.
- **Endpoint :** `/json/stations`
- **Méthode :** `GET`
- **Paramètres Optionnels :**
  - `country` : Filtre par pays (nom complet ou code ISO 3166-1 alpha-2).
  - `tag` : Filtre par tag (genre musical, thème, etc.).
  - `limit` : Nombre maximum de stations à retourner.
  - `offset` : Décalage pour la pagination des résultats.
  - `hidebroken` : Si défini à `true`, exclut les stations dont le flux est marqué comme cassé.

### Recherche de Stations par Nom

- **Description :** Recherche des stations de radio en fonction d'un nom spécifique.
- **Endpoint :** `/json/stations/search`
- **Méthode :** `GET`
- **Paramètres Optionnels :**
  - `name` : Nom ou partie du nom de la station à rechercher.
  - `country` : Filtre par pays.
  - `tag` : Filtre par tag.
  - `limit` : Nombre maximum de stations à retourner.
  - `offset` : Décalage pour la pagination des résultats.
  - `hidebroken` : Si défini à `true`, exclut les stations dont le flux est marqué comme cassé.

### Liste des Pays

- **Description :** Récupère la liste des pays avec des statistiques associées sur les stations de radio.
- **Endpoint :** `/json/countries`
- **Méthode :** `GET`
- **Paramètres :** Aucun

### Liste des Tags (Genres)

- **Description :** Récupère la liste des tags associés aux stations de radio dans la base de données.
- **Endpoint :** `/json/tags`
- **Méthode :** `GET`
- **Paramètres :** Aucun

---

## Structures de Réponse

### Structure d'une Station

Les réponses des endpoints relatifs aux stations de radio renvoient des objets avec les champs suivants :

- `stationuuid` : Identifiant unique de la station.
- `name` : Nom de la station.
- `url` : URL du site web de la station.
- `url_resolved` : URL directe du flux de streaming.
- `homepage` : Page d'accueil de la station.
- `favicon` : URL de l'icône de la station.
- `tags` : Liste des tags associés à la station.
- `country` : Pays d'origine de la station.


L'API de Radio Browser offre une interface complète pour rechercher et récupérer des informations sur les stations de radio du monde entier. Le point de terminaison `/json/stations/search` permet d'effectuer des recherches avancées en utilisant divers paramètres. Voici une description détaillée des paramètres disponibles pour affiner vos requêtes :

**Paramètres de la requête :**

- **name** : *(Valeur par défaut : aucune)*
  - **Type :** Chaîne de caractères (STRING)
  - **Description :** Nom de la station de radio.
  - **Exemple :** `name=Jazz FM`

- **nameExact** : *(Valeur par défaut : false)*
  - **Type :** Booléen (true, false)
  - **Description :** Si défini sur true, recherche uniquement les correspondances exactes du nom.
  - **Exemple :** `nameExact=true`

- **country** : *(Valeur par défaut : aucune)*
  - **Type :** Chaîne de caractères (STRING)
  - **Description :** Pays d'origine de la station.
  - **Exemple :** `country=France`

- **countryExact** : *(Valeur par défaut : false)*
  - **Type :** Booléen (true, false)
  - **Description :** Si défini sur true, recherche uniquement les correspondances exactes du pays.
  - **Exemple :** `countryExact=true`

- **countrycode** : *(Valeur par défaut : aucune)*
  - **Type :** Chaîne de caractères (STRING)
  - **Description :** Code pays à 2 lettres selon la norme ISO 3166-1 alpha-2.
  - **Exemple :** `countrycode=FR`

- **state** : *(Valeur par défaut : aucune)*
  - **Type :** Chaîne de caractères (STRING)
  - **Description :** État ou région de la station.
  - **Exemple :** `state=California`

- **stateExact** : *(Valeur par défaut : false)*
  - **Type :** Booléen (true, false)
  - **Description :** Si défini sur true, recherche uniquement les correspondances exactes de l'état.
  - **Exemple :** `stateExact=true`

- **language** : *(Valeur par défaut : aucune)*
  - **Type :** Chaîne de caractères (STRING)
  - **Description :** Langue principale de diffusion de la station.
  - **Exemple :** `language=English`

- **languageExact** : *(Valeur par défaut : false)*
  - **Type :** Booléen (true, false)
  - **Description :** Si défini sur true, recherche uniquement les correspondances exactes de la langue.
  - **Exemple :** `languageExact=true`

- **tag** : *(Valeur par défaut : aucune)*
  - **Type :** Chaîne de caractères (STRING)
  - **Description :** Tag ou genre associé à la station.
  - **Exemple :** `tag=rock`

- **tagExact** : *(Valeur par défaut : false)*
  - **Type :** Booléen (true, false)
  - **Description :** Si défini sur true, recherche uniquement les correspondances exactes du tag.
  - **Exemple :** `tagExact=true`

- **tagList** : *(Valeur par défaut : aucune)*
  - **Type :** Liste de chaînes de caractères, séparées par des virgules (STRING, STRING, ...)
  - **Description :** Liste de tags. Toutes les stations retournées doivent correspondre à tous les tags listés. Peut également être un tableau de chaînes en JSON pour les requêtes HTTP POST.
  - **Exemple :** `tagList=rock,classic`

- **codec** : *(Valeur par défaut : aucune)*
  - **Type :** Chaîne de caractères (STRING)
  - **Description :** Codec audio utilisé par la station (par exemple, mp3, aac).
  - **Exemple :** `codec=mp3`

- **bitrateMin** : *(Valeur par défaut : 0)*
  - **Type :** Entier positif
  - **Description :** Débit binaire minimum en kbps des stations à retourner.
  - **Exemple :** `bitrateMin=128`

- **bitrateMax** : *(Valeur par défaut : 1000000)*
  - **Type** : Entier positif
  - **Description** : Débit binaire maximum en kbps des stations à retourner.
  - **Exemple** : `bitrateMax=320`

- **has_geo_info** : *(Valeur par défaut : non défini)*
  - **Type** : Booléen (true, false)
  - **Description** : 
    - `true` : Afficher uniquement les stations avec des informations géographiques.
    - `false` : Afficher uniquement les stations sans informations géographiques.
    - Non défini : Afficher toutes les stations.
  - **Exemple** : `has_geo_info=true`

- **has_extended_info** : *(Valeur par défaut : non défini)*
  - **Type** : Booléen (true, false)
  - **Description** :
    - `true` : Afficher uniquement les stations qui fournissent des informations détaillées.
    - `false` : Afficher uniquement les stations qui ne fournissent pas d’informations détaillées.
    - Non défini : Afficher toutes les stations.
  - **Exemple** : `has_extended_info=true`

- **is_https** : *(Valeur par défaut : non défini)*
  - **Type** : Booléen (true, false)
  - **Description** :
    - `true` : Afficher uniquement les stations avec une URL HTTPS.
    - `false` : Afficher uniquement les stations avec une URL HTTP (non sécurisée).
    - Non défini : Afficher toutes les stations.
  - **Exemple** : `is_https=true`

- **geo_lat** : *(Valeur par défaut : aucune)*
  - **Type** : Nombre à virgule flottante (-90.0 ≤ x ≤ 90.0)
  - **Description** : Latitude géographique pour filtrer les stations situées autour d’un point spécifique.
  - **Exemple** : `geo_lat=48.8566`

- **geo_long** : *(Valeur par défaut : aucune)*
  - **Type** : Nombre à virgule flottante (-180.0 ≤ x ≤ 180.0)
  - **Description** : Longitude géographique pour filtrer les stations situées autour d’un point spécifique.
  - **Exemple** : `geo_long=2.3522`

- **geo_distance** : *(Valeur par défaut : aucune)*
  - **Type** : Nombre à virgule flottante (en mètres)
  - **Description** : Distance maximale en mètres à partir des coordonnées spécifiées (`geo_lat` et `geo_long`).
  - **Exemple** : `geo_distance=50000` (50 km)

- **order** : *(Valeur par défaut : name)*
  - **Type** : Chaîne de caractères (name, url, homepage, favicon, tags, country, state, language, votes, codec, bitrate, lastcheckok, lastchecktime, clicktimestamp, clickcount, clicktrend, changetimestamp, random)
  - **Description** : Attribut selon lequel les résultats doivent être triés.
  - **Exemple** : `order=votes` (trier par nombre de votes)

- **reverse** : *(Valeur par défaut : false)*
  - **Type** : Booléen (true, false)
  - **Description** : Si défini sur `true`, inverse l’ordre de tri des résultats.
  - **Exemple** : `reverse=true`

- **offset** : *(Valeur par défaut : 0)*
  - **Type** : Entier positif
  - **Description** : Détermine le point de départ de la liste des résultats pour la pagination.
  - **Exemple** : `offset=10` (commencer à partir du 11e résultat)

- **limit** : *(Valeur par défaut : 100000)*
  - **Type** : Entier positif (0,1,2,...)
  - **Description** : Nombre maximal de stations à retourner dans les résultats.
  - **Exemple** : `limit=20` (retourner 20 stations)

- **hidebroken** : *(Valeur par défaut : false)*
  - **Type** : Booléen (true, false)
  - **Description** : Exclut les stations dont les flux sont signalés comme hors service.
  - **Exemple** : `hidebroken=true`

---

## **📌 Exemple de Requête**
Cette requête récupère **les 10 stations de radio les plus votées en Espagne**, qui diffusent du **pop**, triées par nombre de votes dans l’ordre décroissant :

```http
GET http://de1.api.radio-browser.info/json/stations/search?limit=10&countrycode=es&tag=pop&order=votes&reverse=true


```markdown
- **bitrateMax** : *(Valeur par défaut : 1000000)*
  - **Type** : Entier positif
  - **Description** : Débit binaire maximum en kbps des stations à retourner.
  - **Exemple** : `bitrateMax=320`

- **has_geo_info** : *(Valeur par défaut : non défini)*
  - **Type** : Booléen (true, false)
  - **Description** : 
    - `true` : Afficher uniquement les stations avec des informations géographiques.
    - `false` : Afficher uniquement les stations sans informations géographiques.
    - Non défini : Afficher toutes les stations.
  - **Exemple** : `has_geo_info=true`

- **has_extended_info** : *(Valeur par défaut : non défini)*
  - **Type** : Booléen (true, false)
  - **Description** :
    - `true` : Afficher uniquement les stations qui fournissent des informations détaillées.
    - `false` : Afficher uniquement les stations qui ne fournissent pas d’informations détaillées.
    - Non défini : Afficher toutes les stations.
  - **Exemple** : `has_extended_info=true`

- **is_https** : *(Valeur par défaut : non défini)*
  - **Type** : Booléen (true, false)
  - **Description** :
    - `true` : Afficher uniquement les stations avec une URL HTTPS.
    - `false` : Afficher uniquement les stations avec une URL HTTP (non sécurisée).
    - Non défini : Afficher toutes les stations.
  - **Exemple** : `is_https=true`

- **geo_lat** : *(Valeur par défaut : aucune)*
  - **Type** : Nombre à virgule flottante (-90.0 ≤ x ≤ 90.0)
  - **Description** : Latitude géographique pour filtrer les stations situées autour d’un point spécifique.
  - **Exemple** : `geo_lat=48.8566`

- **geo_long** : *(Valeur par défaut : aucune)*
  - **Type** : Nombre à virgule flottante (-180.0 ≤ x ≤ 180.0)
  - **Description** : Longitude géographique pour filtrer les stations situées autour d’un point spécifique.
  - **Exemple** : `geo_long=2.3522`

- **geo_distance** : *(Valeur par défaut : aucune)*
  - **Type** : Nombre à virgule flottante (en mètres)
  - **Description** : Distance maximale en mètres à partir des coordonnées spécifiées (`geo_lat` et `geo_long`).
  - **Exemple** : `geo_distance=50000` (50 km)

- **order** : *(Valeur par défaut : name)*
  - **Type** : Chaîne de caractères (name, url, homepage, favicon, tags, country, state, language, votes, codec, bitrate, lastcheckok, lastchecktime, clicktimestamp, clickcount, clicktrend, changetimestamp, random)
  - **Description** : Attribut selon lequel les résultats doivent être triés.
  - **Exemple** : `order=votes` (trier par nombre de votes)

- **reverse** : *(Valeur par défaut : false)*
  - **Type** : Booléen (true, false)
  - **Description** : Si défini sur `true`, inverse l’ordre de tri des résultats.
  - **Exemple** : `reverse=true`

- **offset** : *(Valeur par défaut : 0)*
  - **Type** : Entier positif
  - **Description** : Détermine le point de départ de la liste des résultats pour la pagination.
  - **Exemple** : `offset=10` (commencer à partir du 11e résultat)

- **limit** : *(Valeur par défaut : 100000)*
  - **Type** : Entier positif (0,1,2,...)
  - **Description** : Nombre maximal de stations à retourner dans les résultats.
  - **Exemple** : `limit=20` (retourner 20 stations)

- **hidebroken** : *(Valeur par défaut : false)*
  - **Type** : Booléen (true, false)
  - **Description** : Exclut les stations dont les flux sont signalés comme hors service.
  - **Exemple** : `hidebroken=true`

---

## **📌 Exemple de Requête**
Cette requête récupère **les 10 stations de radio les plus votées en Espagne**, qui diffusent du **pop**, triées par nombre de votes dans l’ordre décroissant :

```http
GET http://de1.api.radio-browser.info/json/stations/search?limit=10&countrycode=es&tag=pop&order=votes&reverse=true
```

### **Réponse JSON Type**
```json
[
  {
    "stationuuid": "abcd-efgh-ijkl-mnop",
    "name": "Los40 España",
    "country": "Spain",
    "countrycode": "ES",
    "state": "Madrid",
    "language": "Spanish",
    "tags": "pop, hits, spanish",
    "url": "https://www.los40.com",
    "url_resolved": "http://stream.los40.com/live",
    "bitrate": 128,
    "votes": 5000,
    "lastcheckok": 1
  },
  ...
]
```

---

## **📌 Explication des Champs Importants dans la Réponse**
| Champ            | Description |
|-----------------|------------|
| `stationuuid`   | Identifiant unique de la station. |
| `name`          | Nom de la station. |
| `country`       | Pays où la station est basée. |
| `countrycode`   | Code pays ISO (ex : ES pour Espagne). |
| `state`         | État ou région de la station. |
| `language`      | Langue principale de diffusion. |
| `tags`          | Genres musicaux ou catégories associées. |
| `url`           | URL du site officiel de la station. |
| `url_resolved`  | **URL directe du flux de streaming (à utiliser pour la lecture).** |
| `bitrate`       | Débit binaire en kbps. |
| `votes`         | Nombre de votes des utilisateurs. |
| `lastcheckok`   | Indique si la station est fonctionnelle (1 = OK, 0 = non fonctionnelle). |

---

## **📌 Notes Importantes**
- **Utiliser `url_resolved`** pour lire une station dans un lecteur audio.
- **Filtrer avec `hidebroken=true`** pour éviter les stations hors service.
- **Utiliser `order=clicktrend`** pour obtenir les stations les plus populaires récemment.
- **Limiter les résultats avec `limit=xx`** pour ne pas surcharger la requête.

---

Avec cette documentation mise à jour, tu peux désormais **intégrer facilement l’API Radio-Browser** dans ton application et récupérer des stations de radio fonctionnelles avec leurs URL de streaming. 🚀🎶
