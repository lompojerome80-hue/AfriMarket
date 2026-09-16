# 05 — Livraison iOS : App Store Connect (miroir Play)

> AfriMarket Mobile — chantier ④-bis, livrable release.
> Preuves au disque : `eas.json` (3 profils dont `production`), `app.json`
> (bundleIdentifier `com.afrimarket.mobile`, `supportsTablet:true`, `infoPlist`
> caméra/photo/localisation), TAP 26/26, HEAD poussé.
> Date : 2026-09-16.

---

## 1. Prérequis Apple (à faire PAR TOI, hors code)

- [ ] Compte **Apple Developer** (Program : 99 USD/an, individuel ou société)
- [ ] **App Store Connect** accessible (même identifiant Apple)
- [ ] (Optionnel mais recommandé) Mac sur lequel visionner les builds —
      sinon **EAS iOS cloud builds** (exécutés par Expo, pas besoin de Mac)
- [ ] Les 3 réponses Data Safety **identiques** à Play (bulleted à recopier)

> Détail honnête : contrairement à Android, il n'y a **pas** de D-U-N-S
> **obligatoire** pour le compte individuel Apple (seulement pour l'équipe
> société, et encore : des fois demandé). C'est la grosse simplification iOS.

---

## 2. Config au disque (déjà en place)

| Clé | Valeur (lue à l'instant) | Fichier |
|---|---|---|
| `expo.ios.bundleIdentifier` | `com.afrimarket.mobile` | `app.json` |
| `expo.ios.supportsTablet` | `true` | `app.json` |
| `expo.ios.infoPlist.NSCameraUsageDescription` | « scanner QR + photo dossier livreur » | `app.json` |
| `expo.ios.infoPlist.NSPhotoLibraryUsageDescription` | « illustrer boutique / dossier livreur » | `app.json` |
| `expo.ios.infoPlist.NSLocationWhenInUseUsageDescription` | « suivre et créer des livraisons » | `app.json` |
| Profil EAS `production` | `{"autoIncrement":true}` | `eas.json` |

Toutes ces ancres ont été **relues au disque** (pas recopiées par mémoire) :
`profile=production="autoIncrement":true` ✔

---

## 3. Commandes build iOS (EXACTES)

```powershell
# depuis C:/Users/lompo/Downloads/amazon_clone-main/AfrimarketMobile

# 1) Prévisualisation (SDK 57) — plus rapide, test sur simulateur/TesFlight
npx eas build --platform ios --profile preview

# 2) Build PRODUCTION (celui à soumettre à l'App Store)
npx eas build --platform ios --profile production
```

- Le **bundle Identifier iOS** doit coller `com.afrimarket.mobile` (déjà défini).
- `eas build` iOS cloud **n'exige pas de Mac** (Expo compile pour toi).
- Livrables sortants : `.ipa` (App Store) — à déposer via **Transporter**
  (app macOS) ou **ici : https://appstoreconnect.apple.com** rubrique « Apps » → « + » → « Nouvelle app ».

---

## 4. Checklist de soumission App Store (miroir Play)

### a) App Store Connect — onglet « Informations sur l'app »
- [ ] Titre, sous-titre (31 max), catégorie, note d'âge
- [ ] **Politique de confidentialité** : héberger le même
      `docs/release/02_politique_confidentialite_FR.md` sur une URL HTTPS
      publique + coller le lien.
- [ ] **URL d'assistance** + **URL marketing** (peuvent être la même)

### b) Écrans (captures d'écran obligatoires)
- [ ] **iPhone 6.7"** (et 6.1", 5.5", 5.8" selon compat) — 6.5 minimum requis
- [ ] iPad : `supportsTablet:true` → **captures iPad obligatoires** (12.9" + 11")
- [ ] Prévisualisation app (vidéo 30 s max) — recommandée, pas obligatoire

### c) Privacy (équivalent français du Data Safety Play)
- [ ] Répondre au **App Privacy Questionnaire** — mêmes réponses que Play :
      - Données collectées : compte (courriel), achats (montants),
        contact (téléphone), identifiants.
      - Utilisées pour : fonctionnalités de l'app, sécurité,
        analyse (si tu coches Analytics).
      - Chiffrées en transit (TLS) : OUI.
- [ ] **Suivi** (App Tracking Transparency) : NON (pas d'IDFA, pas de pubs)

### d) Sous-titres FR suggérés
> « Marché local : commande, paiement mobile money, suivi de livraison »

---

## 5. Coûts (transparence — à te rappeler)

| Plateforme | Compte développeur | D-U-N-S ? |
|---|---|---|
| Google Play | 25 USD **une fois** | OUI (obligatoire) |
| **App Store** | 99 USD / **an** | NON pour individu |

> Planifiez donc l'**ordre** : Play d'abord si vous testez en Afrique de
> l'Ouest (Android est la majorité là-bas) — iOS ensuite quand le budget an
> le permet. C'est un conseil, pas une obligation.

---

## 6. État du chantier (dernier carré)

| ✅ Fait (poussé) | 🔐 Chef toi (hors code) |
|---|---|
| Serveur delete compte réel + 26/26 TAP | Compte Apple 99$/an |
| Verrou admin `__DEV__` + CORS env | Compte + .env CinetPay |
| Livrables docs Play (00-04) | Captures iPhone/iPad |
| Livrable 05 iOS (ce fichier) | Réponses Privacy Connect |
| HEAD `8143163` pushé | `eas build --platform ios --profile production` |

---

*Fin du livrable 05. Prochaine étape : c'est uniquement de ta main
(submission store), et c'est assumé — pas de « tout est prêt » fantaisiste ici.*