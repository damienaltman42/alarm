# Aurora Wake - Application de Réveil avec Radio

Aurora Wake est une application de réveil intelligente qui vous permet de vous réveiller avec votre station de radio préférée. Configurez des alarmes personnalisées pour chaque jour de la semaine et choisissez parmi des milliers de stations de radio du monde entier.

## Fonctionnalités

- **Gestion complète des alarmes** : Ajoutez, modifiez et supprimez des alarmes facilement
- **Répétition personnalisée** : Configurez vos alarmes pour qu'elles se répètent certains jours de la semaine
- **Stations de radio en ligne** : Réveillez-vous avec votre station de radio préférée
- **Recherche de stations** : Recherchez des stations par nom, pays ou genre musical
- **Mode snooze** : Configurez l'intervalle de snooze selon vos préférences
- **Interface intuitive** : Design moderne et facile à utiliser

## Installation

1. Assurez-vous d'avoir [Node.js](https://nodejs.org/) et [Expo CLI](https://docs.expo.dev/get-started/installation/) installés sur votre machine.

2. Clonez ce dépôt :
   ```
   git clone https://github.com/votre-nom/aurora-wake.git
   cd aurora-wake
   ```

3. Installez les dépendances :
   ```
   npm install
   ```

4. Lancez l'application :
   ```
   npx expo start
   ```

5. Scannez le code QR avec l'application Expo Go sur votre appareil mobile ou utilisez un émulateur.

## Utilisation

### Ajouter une alarme

1. Appuyez sur le bouton "+" sur l'écran principal
2. Configurez l'heure de l'alarme
3. Sélectionnez les jours de répétition
4. Ajoutez une étiquette (optionnel)
5. Sélectionnez une station de radio
6. Configurez les options de snooze
7. Appuyez sur "Enregistrer"

### Rechercher une station de radio

1. Lors de la création ou de la modification d'une alarme, appuyez sur "Sélectionner une station"
2. Utilisez les onglets pour rechercher par nom, pays ou genre
3. Entrez votre terme de recherche et appuyez sur "Rechercher"
4. Appuyez sur une station pour la sélectionner

### Modifier ou supprimer une alarme

- Pour modifier une alarme, appuyez simplement dessus dans la liste
- Pour supprimer une alarme, appuyez longuement dessus et confirmez la suppression

## API Radio-Browser

Cette application utilise l'API Radio-Browser pour accéder à une base de données de stations de radio en ligne. L'API est gratuite et ne nécessite pas de clé d'API.

Pour plus d'informations sur l'API, consultez la [documentation officielle](https://de1.api.radio-browser.info/).

## Dépendances principales

- [React Native](https://reactnative.dev/) avec [Expo](https://expo.dev/)
- [React Navigation](https://reactnavigation.org/) pour la navigation entre les écrans
- [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/) pour la lecture audio
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) pour les alarmes
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) pour le stockage local

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails. 