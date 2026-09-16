-- ============================================================
-- HARDCORE SUPABASE RLS — correction des policies ouvertes
-- Fichier : docs/release/06_RLS_HARDCORE.sql
-- Problème prouvé au disque (supabase-schema.sql:71-83) :
--   FOR ALL USING (true) WITH CHECK (true)  => ÉCRITURE PUBLIQUE
-- Correctif : bloquer TOUTE écriture directe, laisser seulement :
--   1) SELECT public (catalogue consultable)
--   2) les fonctions SECURITY DEFINER (rpc) pour toute mutation
-- Application (Supabase Dashboard → SQL Editor) :
--   coller le contenu entier et RUN.
-- ============================================================

-- 0) On force le verrouillage des tables (RLS déjà enable)
ALTER TABLE boutiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE boutique_passwords ENABLE ROW LEVEL SECURITY;

-- ============ 1) DROP des policies d'écriture ouvertes ============
DROP POLICY IF EXISTS "ecriture_boutiques"  ON boutiques;
DROP POLICY IF EXISTS "ecriture_produits"   ON produits;
DROP POLICY IF EXISTS "ecriture_avis"       ON avis;
DROP POLICY IF EXISTS "ecriture_passwords"  ON boutique_passwords;

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

-- boutique_passwords : AUCUNE lecture publique (fichier des hash)
DROP POLICY IF EXISTS "lecture_publique_passwords" ON boutique_passwords;
CREATE POLICY "lecture_passwords_restreinte" ON boutique_passwords
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============ 3) AUCUNE policy d'écriture directe ============
-- (rien à créer : sans policy, RLS REFUSE toute écriture hors SET)
-- → toute mutation passe UNIQUEMENT par les fonctions SECURITY DEFINER
--   (check_boutique_password, add_sale, ... déjà présentes, l.100-167)

-- ============ 4) Garde-fou : revoquer les privilèges d'écriture anon ============
REVOKE INSERT, UPDATE, DELETE ON boutiques           FROM anon;
REVOKE INSERT, UPDATE, DELETE ON produits            FROM anon;
REVOKE INSERT, UPDATE, DELETE ON avis                FROM anon;
REVOKE INSERT, UPDATE, DELETE ON boutique_passwords  FROM anon;
-- (SELECT reste autorisé pour la lecture publique)
