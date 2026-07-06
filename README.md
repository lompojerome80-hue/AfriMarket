# AfriMarket Mobile (MVP Android)

Application mobile de boutique en ligne multi-vendeurs, en React Native / Expo.

## 🚀 Lancer ce projet dans Replit (le plus simple, aucune installation locale)

1. Va sur **replit.com** et connecte-toi (compte gratuit).
2. Cherche le **template "Expo"** officiel de Replit (sur la page d'accueil, dans les templates), et clique sur **"Remix"** — cela crée ta propre copie du projet avec toute la configuration Expo déjà prête.
3. Dans ton nouveau Repl, **supprime les fichiers d'exemple** générés (garde `package.json`, `app.json`, `babel.config.js` s'ils existent déjà, tu pourras les remplacer).
4. **Importe le contenu du fichier `AfriMarketMobile.zip`** que je t'ai fourni : dans Replit, utilise le bouton "Upload file" (menu des trois points à côté des fichiers) pour glisser-déposer le zip, ou glisse directement le dossier décompressé dans l'explorateur de fichiers à gauche.
5. Remplace le `package.json` du template par le mien (mêmes dépendances + celles déjà présentes dans le template Expo de Replit).
6. Clique sur le bouton **"Run"** en haut. La console affiche un **QR code**.
7. Sur ton téléphone (Android ou iPhone), installe l'app **Expo Go**, puis :
   - **Android** : ouvre Expo Go et scanne le QR code depuis l'app.
   - **iPhone** : scanne directement le QR code avec l'appareil photo natif.
8. L'application AfriMarket s'ouvre sur ton téléphone en quelques secondes, connectée en direct à l'éditeur Replit — chaque modification de code se recharge automatiquement.

💡 **Astuce encore plus simple** : une fois dans Replit, tu peux aussi simplement coller le contenu de chaque fichier dans le chat de **Replit Agent** et lui dire *"Configure ce projet Expo React Native et lance-le"* — l'agent installera les dépendances et lancera le serveur pour toi automatiquement.

## Fonctionnalités incluses
- Catalogue de produits avec catégories et recherche
- Fiche produit (galerie photo, quantité, ajout au panier, achat immédiat)
- Panier et validation de commande
- Espace vendeur : devenir vendeur, publier des produits avec photos prises
  depuis la galerie **ou l'appareil photo du téléphone**
- Limite de 3 produits pour les vendeurs gratuits
- Abonnement Premium mensuel (simulé) débloquant les produits illimités + badge "Vérifié"
- Espace Administration : statistiques, gestion des utilisateurs (accorder/retirer
  Premium, suspendre), gestion de tous les produits, suivi des abonnements

Le sélecteur "Connecté en tant que" en haut de l'écran simule la connexion
(à remplacer par une vraie authentification, voir plus bas).

## Installer les dépendances (en local, alternative à Replit)

```bash
cd AfriMarketMobile
npm install
```

## Lancer l'app en développement

```bash
npx expo start
```

- Installe l'application **Expo Go** sur ton téléphone Android (Play Store).
- Scanne le QR code affiché dans le terminal avec Expo Go.
- L'app se lance directement sur ton téléphone, avec rechargement en direct
  à chaque modification du code.

## Générer un fichier .apk installable (build réel)

Cette étape nécessite un compte Expo (gratuit) et une connexion internet.

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

Après quelques minutes, EAS te donne un lien pour télécharger le `.apk`,
que tu peux installer directement sur un téléphone Android ou distribuer
à des testeurs. Pour publier sur le Google Play Store, il faudra un compte
développeur Google Play (25 $ à vie) et générer un `.aab` avec
`eas build -p android --profile production`.

## Prochaines étapes pour une vraie mise en production
- **Backend réel** : base de données (Firebase, Supabase, ou API Node/PostgreSQL)
  pour stocker utilisateurs, produits et commandes de façon permanente.
- **Authentification réelle** : email/mot de passe, ou téléphone (très utilisé
  en Afrique), via Firebase Auth ou équivalent.
- **Paiement réel** : intégrer Mobile Money / Orange Money / MTN MoMo / Stripe
  pour les paiements clients et l'abonnement Premium mensuel.
- **Stockage des photos** : héberger les images sur un service cloud
  (Firebase Storage, Cloudinary, S3) plutôt qu'en local sur l'appareil.
- **Notifications push** : confirmer les commandes, alerter les vendeurs.

Je peux t'aider à mettre en place chacune de ces briques quand tu seras prêt.
