# Build & soumission — commandes exactes (AfriMarket)

Repo canonique : `C:\Users\lompo\Downloads\amazon_clone-main\AfrimarketMobile`

## 1. Build de production signé (Android AAB)

```powershell
cd C:\Users\lompo\Downloads\amazon_clone-main\AfrimarketMobile

# premieère connexion (une seule fois)
npx eas-cli login
npx eas-cli whoami

# build production : génère l'AAB signé (autoIncrement versionCode : 1 → 2)
npx eas-cli build --platform android --profile production

# si "No credentials" : eas génère le Keystore lui-même.
# ⚠️ Télécharger et GARDER le fichier .keys.json + le mot de passe que
#    eas affiche à la fin — sans lui, re-build impossible.
```

Résultat attendu : URL `https://expo.dev/accounts/<toi>/projects/afrimarket/builds/<id>`
état `✅ finished` → bouton « Install »/« Artefact » → télécharger le `.aab`.

## 2. Build iOS (optionnel, App Store)

```powershell
# Nécessite compte Apple Developer ($99/an) + certificat de distribution.
# Sur Windows, EAS peut builder iOS (cloud), pas de Mac obligatoire.
npx eas-cli build --platform ios --profile production
```

## 3. Upload & soumission Play Console

1. https://play.google.com/console → créer une **application** « AfriMarket »,
   FR (France) → langue FR → type « Application ».
2. Section **Test interne** (Internal testing) : créer un groupe, inviter ton
   e-mail, Upload l'AAB, « Promouvoir ».
3. **Data safety** : rentrer les réponses de `01-DATA-SAFETY-CHECKLIST-FR.md`.
4. **Politique de confidentialité** : URL publique de
   `02-POLITIQUE-CONFIDENTIALITE-FR.md`.
5. **Test production** → puis « Publier ».

## Rappel git (tout déjà poussé)

- `master` : HEAD `9a56690`, arbre propre, suite 26/26 TAP au disque.
- Bundle : `com.afrimarket.mobile` (Android + iOS).
- Docs : `docs/store/*` (état disque, checklist, politique, commandes).
