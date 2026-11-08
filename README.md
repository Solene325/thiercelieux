# 🌕 Les Loups-Garous de Thiercelieux

Application web temps réel pour jouer aux Loups-Garous **jusqu'à 50 joueurs**, chacun sur son téléphone, avec un **code de village à 6 caractères**, une narration **ElevenLabs** (ou voix du navigateur en secours) et une interface bleu nuit et or, illustrée de peintures anciennes et de gravures vectorielles.

## Démarrage

```bash
npm install
npm start            # http://localhost:3000
PORT=3100 npm start  # si le port 3000 est pris
```

Le terminal affiche aussi l'adresse réseau (`http://192.168.x.x:3000`) : vos amis l'ouvrent sur leur téléphone (même Wi-Fi), saisissent le code du village et leur nom.

### Inviter par QR code

La taverne affiche un QR code propre au village, généré localement sans service externe. Il ouvre le jeu avec le code déjà renseigné. Touchez le QR pour l’agrandir, copier son lien ou télécharger le SVG à imprimer ou partager. Les boutons de copie et de partage utilisent le même lien.

Sur un serveur ouvert via `localhost`, le lien utilise la première adresse IPv4 réseau disponible en conservant le port. Les téléphones doivent pouvoir joindre cette adresse, par exemple sur le même Wi-Fi. Si le jeu est hébergé sur un domaine public, ce domaine est conservé.

### Tester seul avec des bots

```bash
npm start                                  # terminal 1
node scripts/bots.js 7F4B92 15             # terminal 2 : 15 bots rejoignent le village 7F4B92
GAME_SPEED_FACTOR=0.05 PORT=3999 npm start # serveur accéléré…
URL=http://localhost:3999 npm test         # …et parties complètes simulées (4 → 50 joueurs)
```

## Interface

L’accueil permet de rejoindre un village par code ou d’en créer un, avec un aperçu des personnages, les trois étapes du jeu et une FAQ. La taverne rassemble les invitations, les joueurs, les cartes et les réglages. La vue Village présente les habitants avec leurs statuts, leurs places à table et les rôles connus ; elle permet de rechercher un nom et de filtrer les vivants et les disparus sans changer l’ordre des voisins. Pendant la partie, le bandeau indique la phase, les survivants et le code du village ; les commandes restent accessibles en bas de l’écran.

Le grimoire, disponible dans l’application ou à `/grimoire.html`, propose une recherche par nom et pouvoir ainsi que des filtres par camp. Les cartes révélées affichent directement le portrait du rôle, avec un bouton pour les masquer. La palette bleu nuit et or reste la même pendant la partie. Le jour et la nuit se distinguent par un fondu de 1,4 seconde entre deux éclairages du même paysage ; les titres et les contenus apparaissent en 240 à 300 ms. Aucun interlude ne masque le jeu. La réduction des animations est respectée. Les dialogues natifs se ferment avec Échap et gèrent le focus au clavier. L’interface s’adapte aux téléphones et respecte la préférence de réduction des animations. Les polices sont servies localement ; leurs licences SIL sont fournies dans `public/fonts/`.

## Déploiement

Le fichier `render.yaml` configure un service Render sur le forfait **Free**, avec Node 22, une installation des dépendances de production et le contrôle de santé `/health`. Aucune base de données ni clé API n'est nécessaire. Les déploiements automatiques sont désactivés pour éviter qu'une mise à jour coupe une partie en cours.

Pour le publier : pousser ce projet dans un dépôt GitHub, connecter ce dépôt à Render via **New → Blueprint**, puis appliquer la configuration en vérifiant que le forfait reste **Free**. L'adresse HTTPS attribuée par Render permet aussi de rejoindre les parties par QR code.

Sur l'offre gratuite, le serveur se met en veille après 15 minutes sans trafic et son réveil prend environ une minute. Les parties sont en mémoire : un redémarrage, une veille ou un déploiement efface les villages en cours. Render peut également redémarrer une instance gratuite. Pour éviter les frais de dépassement, ne pas ajouter de moyen de paiement ; les services sont alors suspendus si les quotas gratuits sont épuisés. Voir les [limites de l'offre gratuite](https://render.com/docs/free).

Il faut un hébergeur qui garde un processus Node actif avec WebSockets (Render, Railway, Fly.io, un VPS…). Les plateformes purement *serverless* (Vercel, Netlify Functions) ne conviennent pas.

```bash
docker build -t loups-garous . && docker run -p 3000:3000 loups-garous
```

L'état des parties est en mémoire : un seul processus, pas de base de données. Les joueurs qui perdent la connexion (écran verrouillé…) retrouvent automatiquement leur place grâce à un jeton conservé dans le navigateur.

## Déroulement

| Phase | Ce qui se passe |
|---|---|
| **Taverne** (lobby) | Le meneur partage le code, choisit la composition (*Équilibre automatique* ou *Personnalisée*), les règles, les minuteurs et la voix. Il peut jouer ou n'être que narrateur (il voit alors tout). |
| **Distribution** | Chacun retourne sa carte en secret. Les loups découvrent leur meute. |
| **La nuit** | Réveils successifs : Cupidon et Chien-Loup (1ʳᵉ nuit), Salvateur, Voyante, Loups-Garous (vote + tanière, Petite Fille qui espionne), Loup Blanc (une nuit sur deux), Sorcière, Corbeau. Quand un rôle est mort, un faux délai est simulé pour ne rien trahir. |
| **L'aube** | Révélation des victimes et de leurs cartes, chagrin des amoureux, dernier tir du Chasseur. |
| **Le conseil** | Débat minuté. La majorité peut réclamer le vote plus tôt. |
| **Le bûcher** | Vote public en direct (changeable jusqu'au bout), +2 voix du Corbeau, égalité = personne. L'Idiot du Village est épargné une fois. |
| **Fin** | Victoire du Village, de la Meute, des Amoureux ou du Loup Blanc ; toutes les cartes sont révélées. |

**24 rôles** (consultables dans le *Grimoire*, depuis l'accueil, la taverne ou `/grimoire.html`) :

- **La Meute** : Loup-Garou, Grand Méchant Loup (seconde victime tant qu'aucun loup n'est mort), Infect Père des Loups (transforme la victime une fois par partie).
- **Le Village** : Simple Villageois, Voyante, Sorcière, Chasseur, Cupidon, Petite Fille, Chien-Loup, Salvateur, L'Ancien, Idiot du Village, Corbeau, Renard (flaire un joueur et ses voisins), Montreur d'Ours (l'ours grogne si un voisin est loup), Enfant Sauvage (rejoint la meute si son modèle meurt), Deux Sœurs, Bouc Émissaire (meurt en cas d'égalité), Chevalier à l'Épée Rouillée (tue le premier loup à sa gauche), Prêtre (eau bénite, une fois).
- **Les Solitaires** : Loup Blanc, Joueur de Flûte (gagne si tous les survivants sont envoûtés), Ange (gagne s'il est brûlé au premier conseil).

Les « voisins de table » suivent l'ordre (mélangé) de la grille des joueurs.

**Équilibre automatique** : ~23 % de loups, puis les rôles spéciaux par paliers (Voyante dès 5 joueurs, Sorcière 6, Chasseur 7, Cupidon 8, Petite Fille 9, Salvateur 10, Renard 11, Chien-Loup 12, Ancien 13, Loup Blanc 14, Idiot 15, Corbeau 16, Montreur d'Ours 17, Enfant Sauvage 18, Grand Méchant Loup 19, Sœurs 20, Bouc 21, Chevalier 23, Prêtre 25, Infect 27, Ange 29, Joueur de Flûte 31), le reste en villageois. Une jauge indique l'équilibre de la composition.

## Illustrations

Chaque carte affiche une peinture ancienne du domaine public (Waterhouse, Goya, Courbet, Dürer, Holman Hunt, Friedrich…) affichée en portrait dans un cadre doré — voir `public/img/roles/CREDITS.md`. Si une image manque, la gravure vectorielle (silhouettes à l'encre, lune gravée) prend le relais. Pour utiliser vos propres images (illustrations commandées, IA…), déposez-les dans `public/img/roles/` sous le nom du rôle : `loup.webp`, `voyante.jpg`, `grand_mechant_loup.png`… Elles remplacent automatiquement l'illustration correspondante, le cadre doré est conservé. Format conseillé : portrait 2:3 (ex. 800×1200).

## Narration ElevenLabs

Dans la taverne → *La voix du conteur* : collez votre clé API, choisissez une voix (vos voix sont listées automatiquement) et un modèle, puis *Écouter*. Le serveur appelle ElevenLabs, met l'audio en cache et diffuse la même réplique à tous les appareils dont la narration est activée — conseil : un seul appareil au centre de la table. La clé reste dans votre navigateur et dans la mémoire du serveur (jamais écrite sur disque). Sans clé ou en cas d’erreur, la synthèse vocale du navigateur prend le relais avec une voix française et un débit naturel. Les sous-titres arrivent immédiatement ; si la synthèse distante tarde plus de 1,8 seconde, la lecture locale démarre. Une réplique déjà lue n’est pas rejouée quand son audio arrive plus tard. Les annonces des anciennes phases sont interrompues, et le bandeau permet d’écouter ou d’arrêter la lecture. Les effets sonores de phase laissent la priorité à la voix lorsqu’elle est activée.

## Architecture

```
server/
  index.js       HTTP + Socket.IO, validation des événements
  room.js        salon : joueurs, réglages, diffusion de vues personnalisées, chat par canal, narration
  game.js        moteur de jeu autoritaire (phases, minuteurs, actions, morts, victoire, vue par joueur)
  narration.js   consignes du conteur, annonces de fin de réveil, proxy + cache ElevenLabs
  invitation.js  liens d’accès au village et génération locale des QR codes SVG
shared/roles.js  rôles, ordre de la nuit, équilibre automatique (partagé client/serveur)
shared/narration.js contexte des répliques et estimation de leur durée
public/
  index.html     import map (Preact + htm servis localement, aucune étape de build)
  css/main.css   structure, décor jour/nuit/bûcher, cartes et animations
  css/redesign.css identité visuelle, écrans adaptatifs, composants et dialogues
  js/art.js      cartes, emblèmes, sceaux et paysage — SVG dessinés à la main
  js/audio.js    narration, ambiance et effets synthétisés en WebAudio
  js/net.js      connexion, reconnexion, magasin d'état
  js/components/ ui.js (carte, grille de joueurs, minuteur, tiroirs…), Chat.js
  js/screens/    Landing, Lobby, Reveal, Night, Actions, Day, Vote, GameOver, GameShell
scripts/         bots.js (bots aléatoires), simulate.js (parties de bout en bout)
```

Le serveur ne divulgue jamais une information cachée : chaque joueur reçoit une vue calculée pour lui (son rôle, ce que la Voyante a vu, sa meute, ses amoureux…).

### Vérifier la narration

`npm run test:narration` vérifie les consignes des rôles, la diffusion immédiate des sous-titres, le rejet des audios obsolètes et le repli après une erreur du fournisseur, sans appel externe.

`npm run test:invitation` vérifie les liens publics et locaux, les adresses refusées et la génération du QR SVG.

### Composition personnalisée

Le meneur règle aussi le nombre de simples villageois avec les boutons − / +. Ce nombre peut être nul et reste fixe lorsque des joueurs arrivent ou quittent le village. Le compteur affiche les cartes manquantes ou en trop ; le lancement exige exactement une carte par joueur. Le mode automatique continue à ajuster la composition au nombre de participants.

`npm run test:composition` vérifie les nombres explicites, le choix de zéro villageois, les limites et la validation des totaux.

### Animation du verdict

Le bûcher combine une captation réelle de flammes, détourée sur le GPU, et un foyer de bois et de braises détaillé. La boucle vidéo est servie localement, sans son, à 30 images par seconde. Elle peut être mise en pause et s’arrête lorsque l’effet est hors écran ou l’onglet masqué. Une image fixe prend le relais en réduction des animations ou si la vidéo ou WebGL sont indisponibles. Le feu apparaît uniquement lors d’une condamnation au bûcher ou du sacrifice du Bouc Émissaire. Les sources et transformations sont documentées dans `public/media/verdict/CREDITS.md`.
