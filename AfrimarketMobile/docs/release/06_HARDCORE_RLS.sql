-- ============================================================
-- HARDCORE SUPABASE RLS — correction des policies ouvertes
-- Fichier : docs/release/06_HARDCORE_RLS.sql (copie identique)
-- Problème prouvé au disque (policies FOR ALL USING (true) WITH CHECK (true))
--   => ÉCRITURE PUBLIQUE sur boutiques / produits / avis / boutique_passwords
-- Correctif : bloquer TOUTE écriture directe, laisser seulement :
--   1) SELECT public (catalogue consultable)
--   2) les fonctions SECURITY DEFINER (rpc) pour toute mutation
-- Casse volontairement l'écriture directe du client : l'application
-- fonctionne en local-first (AsyncStorage) et réplique vers le serveur
-- Node (sync buckets) — le split-brain est assumé côté Supabase.
-- Application (Supabase Dashboard → SQL Editor) :
--   coller le contenu entier et RUN.
-- ============================================================

-- 0) Verrouillage des tables (RLS enabled), campagnes incluses
ALTER TABLE boutiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE boutique_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE campagnes ENABLE ROW LEVEL SECURITY;

-- ============ 1) DROP des policies d'écriture ouvertes ============
DROP POLICY IF EXISTS "ecriture_boutiques"  ON boutiques;
DROP POLICY IF EXISTS "ecriture_produits"   ON produits;
DROP POLICY IF EXISTS "ecriture_avis"       ON avis;
DROP POLICY IF EXISTS "ecriture_passwords"  ON boutique_passwords;
DROP POLICY IF EXISTS "ecriture_campagnes"  ON campagnes;
DROP POLICY IF EXISTS "lecture_publique_campagnes" ON campagnes;

-- ============ 2) Lecture publique SEULEMENT (catalogue) ============
DROP POLICY IF EXISTS "lecture_publique_boutiques" ON boutiques;
CREATE POLICY "lecture_publique_boutiques" ON boutiques
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "lecture_publique_produits" ON produits;
CREATE POLICY "lecture_publique_produits" ON produits
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "lecture_publique_avis" ON avis;
CREATE POLICY "lecture_publique_avis" ON avis
  FOR SELECT USING (true);

-- campagnes : lecture publique (affichées sur l'accueil), aucun écriture directe
CREATE POLICY "lecture_publique_campagnes" ON campagnes
  FOR SELECT USING (true);

-- boutique_passwords : AUCUNE lecture, ni publique ni connectée (fichier des hash)
-- (l'authentification boutique ne passe que par le RPC check_boutique_password,
--  fonction SECURITY DEFINER, qui compare le hash sans jamais exposer la table)
DROP POLICY IF EXISTS "lecture_passwords_restreinte" ON boutique_passwords;
DROP POLICY IF EXISTS "lecture_publique_passwords"   ON boutique_passwords;

-- ============ 3) AUCUNE policy d'écriture directe ============
-- (rien à créer : sans policy, RLS REFUSE toute écriture hors SET)
-- → toute mutation passe UNIQUEMENT par les fonctions SECURITY DEFINER

-- ============ 4) Revoquer les privilèges anon / authenticated ============
REVOKE ALL     ON boutique_passwords FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON boutiques   FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON produits    FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON avis        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON campagnes   FROM anon, authenticated;
-- SELECT reste autorisé via les policies (catalogue public sauf boutique_passwords)

-- ============ 5) Masquer la colonne sensible des avis ============
-- user_key identifie qui a posté un avis (info perso) : inutile pour l'anonyme.
REVOKE SELECT (user_key) ON avis FROM anon, authenticated;

-- ============ 6) RENFORCEMENT DES RPC (actions avant RUN) ============
-- NOTE : les corps de fonctions ne sont pas sur le disque du projet
-- (supabase-schema.sql absent) — impossible de fournir le SQL définitif.
-- Avant de réactiver toute mutation côté Supabase, appliquer MANUELLEMENT :
--
--   1. ALTER FUNCTION public.update_product_stock(...) SECURITY DEFINER;
--      → exigent un argument secret (ex. p_password TEXT) et vérifient
--        le hash de la boutique (fichier boutique_passwords) AVANT écriture.
--   2. idem pour update_product_price et toutes les fonctions de mutation.
--   3. REVOKE EXECUTE ON FUNCTION public.update_product_stock FROM anon, authenticated;
--      REVOKE EXECUTE ON FUNCTION public.update_product_price FROM anon, authenticated;
--      (re-granter EXECUTE UNIQUEMENT aux fonctions sans effet de bord)
--   4. Révoquer EXECUTE de TOUTE fonction dont le client n'a pas besoin.
--
-- Tant que ces RPC acceptent d'écrire sans preuve d'authentification,
-- l'écriture Supabase reste une attaque possible : la contre-mesure active
-- (ANONYME + app local-first, RLS en place, sync serveur) couvre l'application.
-- ============================================================