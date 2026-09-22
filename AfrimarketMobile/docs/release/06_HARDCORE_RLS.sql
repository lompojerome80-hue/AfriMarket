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
-- Nom réel trouvé sur le projet djqtznsfjgolnifbjovn → acxbdhdpmdasrdxwllgi :
-- la policy "Campagnes acces public" (cmd ALL) est le trou d'écriture actif.
DROP POLICY IF EXISTS "Campagnes acces public" ON campagnes;

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

-- ============ 5) Aucune colonne sensible à masquer sur avis ============
-- Schéma réel : avis(id, boutique_id, nom, note, comment, created_at).
-- Pas de colonne user_key → rien à REVOKE de plus (nom = nom d'affichage
-- choisi par l'auteur, assumé public comme pour n'importe quel commentaire).

-- ============ 6) RPC — inventaire RÉEL du projet (28/09/2026) ============
-- Requêté via la Management API (pg_proc + has_function_privilege).
-- Toutes sont SECURITY DEFINER, VOLATILE, EXECUTE ouvert à anon + authenticated :
--
--   check_boutique_password(p_slug, p_password)      → authentification boutique ✅
--   add_product_secure(p_slug, p_password, ...)      → ajout produit (preuve mdp) ✅
--   delete_product_secure(p_product_id, p_slug, p_password) → suppression (mdp) ✅
--   set_boutique_password(p_boutique_id, p_password) → ⚠️ change le mdp SANS
--       vérifier le mdp courant → un anon connaissant l'id peut verrouiller une
--       boutique. App utilisée uniquement à la création (juste après l'insert).
--       À terme : exiger le mdp courant (ou vérifier un champ owner dans
--       la session) pour les mises à jour.
--   record_sale(p_product_id, p_qty, p_revenue)      → ⚠️ AUCUNE preuve :
--       un anon peut gonfler ventes/revenus de n'importe quelle boutique.
--       JAMAIS appelé par l'app mobile → EXECUTE révoqué ci-dessous.
--
-- ABSENTES alors que l'app les appelle (src/lib/boutique.js) :
--   update_product_stock / update_product_price → « function does not exist ».
--   Les créer UNIQUEMENT comme SECURITY DEFINER exigeant p_password (hash
--   comparé via boutique_passwords) AVANT écriture, puis REVOKE EXECUTE anon.
--
-- Application immédiate (sûre, idempotente) :
-- NB : les fonctions du schéma public ont un EXECUTE par défaut à PUBLIC ;
-- il faut révoquer PUBLIC en plus des rôles (sinon le grant hérité demeure).
REVOKE EXECUTE ON FUNCTION public.record_sale(uuid, integer, numeric) FROM anon, authenticated, PUBLIC;

-- ============ 7) Synthèse ============
-- Écritures directes (insert/update/delete) : REFUSÉES sur les 5 tables
-- (RLS + REVOKE anon/authenticated). Noter que l'app tente quand même des
-- écritures directes (campagnes, avis, produits…) : elles échouent côté
-- Supabase et sont couvertes par le fallback local-first + sync serveur.
-- ============================================================