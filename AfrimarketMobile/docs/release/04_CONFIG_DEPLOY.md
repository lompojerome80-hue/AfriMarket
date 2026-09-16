# 04 — Config de déploiement (CinetPay + synchro + CORS + EAS)

> Livrable de release — AfriMarket. Généré depuis les **preuves au disque**
> (`server/.env.example`, `server/lib/syncStore.js`, TAP 26/26, HEAD `e8381e4`).
> Date : 2026-09-16. État : **prêt à remplir, aucun secret réel embarqué**.

---

## 1. Fichiers à créer / adapter

| Étape | Fichier | Action |
|---|---|---|
| 1 | `server/.env` | Copier `server/.env.example` → remplacer les valeurs ci-dessous |
| 2 | `server/data/sync.json` | **Créé automatiquement** au 1er démarrage (aucune action) |
| 3 | `.env` (côté app, sinon) | Optionnel : seulement si tu veux des valeurs non-défaut |

---

## 2. Configuration CinetPay (paiements réels)

Copie exacte d'après `server/.env.example` (lu au disque) :

```dotenv
# Port du serveur (défaut 4000)
PORT=4000

# --- MODE RÉEL : renseigner ces clés CinetPay (API v1) ---
# Sans ces clés, le serveur fonctionne en MODE MOCK
# (OTP généré localement et retourné pour les tests).
CINETPAY_API_KEY=
CINETPAY_API_PASSWORD=
# Pays du compte marchand (BF = Burkina Faso)
CINETPAY_COUNTRY=BF
# Base de l'API CinetPay (ne pas toucher en général)
CINETPAY_API_BASE=https://api.cinetpay.net

# --- Legacy CHECKOUT (apikey/site_id) : pour le HMAC du webhook ---
# CINETPAY_SECRET_KEY=

# --- Notifications push (Expo) ---
# Clé partagée avec l'app pour /api/push/register et /api/push/notify.
PUSH_API_KEY=afrimarket-demo-push

# --- Admin : token requis sur GET /api/pay/transactions (en-tête x-admin-token) ---
ADMIN_TOKEN=afrimarket-demo-admin
```

### 🔒 Durcissements déjà appliqués (HEAD `e8381e4`)
- **CORS** : gate par `process.env.AFRIMARKET_ALLOW_ORIGIN` (défaut `*`). En prod, fixer une origine explicite.
- **Admin démo** : `loginAdminSimulated()` renvoie `{ok:false}` hors `__DEV__` (build production).
- **Compte** : suppression réelle `POST /api/account/delete` (401 si token invalide, purge buckets).

---

## 3. Synchronisation multi-appareils (mini-"base")

Pas de base SQL : **fichier JSON** `server/data/sync.json`, chemin configurable :

```js
// server/lib/syncStore.js (lue au disque)
const FILE = process.env.AFRIMARKET_SYNC_FILE
  || path.join(__dirname, '..', 'data', 'sync.json');
```

- **Aucune installation** : créé tout seul au démarrage.
- **Sécurité** : secrets hachés SHA-256 + salt, tokens en en-têtes (`x-sync-account`, `x-sync-secret`, `x-admin-token`).

---

## 4. Démarrage serveur

```powershell
# depuis server/
node index.js
# attendu : "AFRI MARKET - SERVEUR DE PAIEMENT" / "Port : 4000" (ou PORT=)
```

Vérification rapide :
```powershell
node --check server/index.js          # → pas d'erreur
node --check server/lib/syncStore.js  # → pas d'erreur
# TAP (suite complète) : 26/26 pass / 0 fail  →  preuve A16_TAP_POSTPATCH.txt
```

---

## 5. Build EAS (production, pour Play)

```powershell
npx eas build --profile production --platform android
```

- Profil `production` déjà présent dans `eas.json` (autoIncrement: true).
- Associer le build signé, puis soumettre le .aab dans Play Console.

---

## 6. Checklist avant soumission Play (n'appartient pas au code)

- [ ] `server/.env` rempli + ignoré de Git (jamais committer les clés)
- [ ] CORS fixé : `AFRIMARKET_ALLOW_ORIGIN=<origin HTTPS réelle>`
- [ ] `ADMIN_TOKEN` changé (≠ `afrimarket-demo-admin`)
- [ ] Politique de confidentialité **hébergée en HTTPS** + URL collée dans Play
- [ ] Data safety déclaré (réponses Play)
- [ ] Build production signé installé et retesté (y compris suppression compte)
