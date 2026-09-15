# Checklist « Data safety » — Google Play Console (AfriMarket)

Prérequis vérifiés au disque : package `com.afrimarket.mobile`, versionCode 1,
bundleId iOS `com.afrimarket.mobile`, tests 26/26 sur `master`.

---

## 1. Données collectées (réponses honnêtes pour le formulaire Play)

Play/le store SANCTIONNENT les fausses déclarations (jusqu'à suspension de
compte). Réponds exactement ceci :

### Localisation
- [x] **Approximative** utilisée ? **OUI** (livreurs : suivi/création de
  livraison, `ACCESS_COARSE_LOCATION`).
- [x] **Précise** utilisée ? **OUI** (boutique livreur : `ACCESS_FINE_LOCATION`).

### Informations personnelles
- [x] Nom → **OUI** (`USER_STORAGE_KEY`, profil AsyncStorage + Supabase).
- [x] Numéro de téléphone → **OUI** (identifiant de connexion, OTP WhatsApp).
- [ ] Adresse → **NON** (pas collectée).
- [ ] E-mail → **NON** (connexion par téléphone + OTP, jamais par e-mail).
- [x] Autres infos d'identité / rôle → **OUI** (acheteur/vendeur/livreur/admin).

### Données d'activité
- [x] Historique d'achat → **OUI** (commandes).
- [x] Recherches → **OUI partiel** (recherche produits, stockée localement,
  pas revendue).
- [x] Autres activités dans l'app → **OUI** (vues produits, boutiques suivies —
  AsyncStorage + Supabase).

### Photos / vidéos
- [ ] Photos → **OUI** (boutiques, produits, avatar : `expo-image-picker`,
  permission `CAMERA`). Envoyées uniquement si l'utilisateur les publie.
- [ ] Vidéos → **NON**.

### Paiements
- [x] Achat d'articles in-app → **OUI** (CinetPay + paiement interne).
- [ ] Paiement par carte réel stocké → **NON** (CinetPay gère côté tiers).

### Notifications
- [x] Notifications push → **OUI** (`expo-notifications`).

### Contacts / santé / biométrie / messages / audio / fichiers
- [ ] Tous → **NON** (rien de tel dans le code).

### Caméra / micro
- [x] Photos via caméra → **OUI** (permission `CAMERA` déclarée).
- [ ] Micro / enregistrements audio → **NON** (`RECORD_AUDIO` absent d'app.json).

## 2. Sécurité (tunnel chiffré)
- [x] Chiffrement en transit : **OUI** (https Supabase + serveur Node HTTPS).
- [x] Chiffrement au repos des données : **OUI par défaut** (Supabase chiffre
  au repos) — à confirmer côté console Supabase si requis.

## 3. Suppression des données & politique
- [x] Compte supprimable dans l'app ? **OUI** (`AccountScreen` :
  bouton « Supprimer mon compte » + `deleteAccount`).
- [ ] Suppression des données **côté serveur** réellement implémentée ?
  **À FAIRE** — `deleteAccount` purge le stockage local + AsyncStorage et
  déconnecte, mais la suppression au niveau Supabase/serveur doit être
  démontrée avant soumission. → prévoir endpoint de suppression + test TAP.
- [x] Politique de confidentialité FR : fournie (`docs/store/`).
- [x] Bouton de suppression avec confirmation → **OUI** (`confirm` mot de passe).

## 4. Reste à faire du côté STORE pour déclarer « 100 % déployé »

| # | Action | Bloquant |
|---|---|---|
| A | Suppression serveur réelle (Supabase) + test TAP | 🔴 OUI |
| B | Compte développeur Play réglé (frais 25 $ + D-U-N-S) | 🔴 OUI |
| C | Politique de confidentialité publiée en ligne (URL stable) | 🔴 OUI |
| D | Formulaire Data safety rempli (sections ci-dessus) | 🔴 OUI |
| E | Build EAS signé `eas build --platform android --profile production` | 🔴 OUI |
| F | Upload AAB en test interne puis production | 🟡 |
| G | Captures d'écran, description, icône de feature | 🟡 |

**Déjà prêt (code) :** `useAuth()`/AuthProvider (session unique, 0 fantôme),
bundle/package `com.afrimarket.mobile`, bouton suppression + confirmation,
politique FR + checklist générées, tests 26/26.
