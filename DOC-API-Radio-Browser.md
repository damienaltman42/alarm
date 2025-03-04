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
-  