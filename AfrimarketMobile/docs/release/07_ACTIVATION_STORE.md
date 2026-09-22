# 07 — Activation réelle en 3 étapes (Play Store)
> Date : 2026-09-16. Canal : write -> node -> read (preuve au disque).
> Prérequis déjà au disque : `supabase-harcore-rls.sql` (2640 o, 8 DROP + 4 CREATE + 4 REVOKE), `server/.env.example`, `eas.json` (profil preview + production), TAP 26/26 VERT.

---

## Étape 1 — Verrouiller la base (30 s, toi)
1. Ouvre Supabase Dashboard → ton projet `djqtznsfjgolnifbjovn`
2. SQL Editor → colle le contenu de `supabase-harcore-rls.sql` → **Run**
3. **Test** : dans Table Editor → boutiques → « Insérer ligne » → tu dois voir
   `RLS: new row violates row-level security policy` → ✅ verrouillé

## Étape 2 — Vraies clés (5 min, toi)
1. Crée `server/.env` en copiant `.env.example` :
   ```
   Copy-Item server/.env.example server/.env
   ```
2. Remplis les clés CinetPay réelles (dashboard CinetPay) :
   ```
   CINETPAY_API_KEY=ta_vraie_cle
   CINETPAY_API_PASSWORD=ton_mdp_reel
   ADMIN_TOKEN=un_token_aléatoire_long
   ```
3. Redémarre : `node server/index.js` → tu dois voir `Mode : api`

## Étape 3 — Build installable (15 min, toi)
```
npx eas build --platform android --profile preview
```
→ télécharge le `.apk` → envoie-le à tes amis (ils installent « sources inconnues » = autorisé). C'est la VRAIE app, testée avant Play.

> Quand ils ont validé → `npx eas build --platform android --profile production` → `.aab` → Play Console.
