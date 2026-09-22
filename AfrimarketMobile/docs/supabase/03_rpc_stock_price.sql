-- 03_rpc_stock_price.sql
-- À exécuter sur le projet Supabase acxbdhdpmdasrdxwllgi (Schema public)
--
-- Objectif :
--  1) Créer update_product_stock / update_product_price : l'app les appelle
--     mais ils n'existaient pas -> erreur silencieuse -> fallback local.
--  2) Les sécuriser : exiger le mot de passe boutique, vérifié via la
--     fonction opérationnelle check_boutique_password (aucun hash dupliqué).
--  3) Désactiver le vecteur de takeover set_boutique_password(id, mdp) tant
--     qu'une version "preuve de l'ancien mot de passe" n'est pas écrite.
--
-- Notes :
--  - Les RPC sont appelés par l'app sous le rôle ANON (clé publishable).
--    La preuve = mot de passe boutique, donc EXECUTE accordé à anon est OK
--    (même exposition que check_boutique_password déjà en place).
--  - Les colonnes stock / old_price sont ajoutées si absentes (l'app les
--    gère déjà en local ; le serveur les enregistre désormais aussi).

-- 0. Colonnes manquantes éventuelles
ALTER TABLE public.produits ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;
ALTER TABLE public.produits ADD COLUMN IF NOT EXISTS old_price numeric;

-- 1. Mettre à jour le stock d'un produit (sécurisé)
CREATE OR REPLACE FUNCTION public.update_product_stock(
  p_product_id text,
  p_slug text,
  p_password text,
  p_stock integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b boutiques%ROWTYPE;
BEGIN
  SELECT * INTO b FROM boutiques WHERE LOWER(slug) = LOWER(p_slug);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boutique introuvable';
  END IF;
  IF NOT COALESCE(public.check_boutique_password(p_slug, p_password), false) THEN
    RAISE EXCEPTION 'Code boutique invalide';
  END IF;
  UPDATE produits
     SET stock = GREATEST(0, COALESCE(p_stock, 0))
   WHERE id::text = p_product_id
     AND boutique_id = b.id;
END;
$$;
REVOKE ALL ON FUNCTION public.update_product_stock(text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_product_stock(text,text,text,integer) TO anon, authenticated;

-- 2. Mettre à jour le prix d'un produit (sécurisé)
CREATE OR REPLACE FUNCTION public.update_product_price(
  p_product_id text,
  p_slug text,
  p_password text,
  p_price numeric,
  p_old_price numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b boutiques%ROWTYPE;
BEGIN
  SELECT * INTO b FROM boutiques WHERE LOWER(slug) = LOWER(p_slug);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boutique introuvable';
  END IF;
  IF NOT COALESCE(public.check_boutique_password(p_slug, p_password), false) THEN
    RAISE EXCEPTION 'Code boutique invalide';
  END IF;
  UPDATE produits
     SET price = GREATEST(0, COALESCE(p_price, 0)),
         old_price = CASE
                       WHEN p_old_price IS NOT NULL AND p_old_price > price
                         THEN p_old_price
                       ELSE NULL::numeric
                     END
   WHERE id::text = p_product_id
     AND boutique_id = b.id;
END;
$$;
REVOKE ALL ON FUNCTION public.update_product_price(text,text,text,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_product_price(text,text,text,numeric,numeric) TO anon, authenticated;

-- 3. Désactiver le takeover set_boutique_password(boutique_id, mdp)
--    (signature réelle détectée dynamiquement pour ne dépendre d'aucun type)
DO $$
DECLARE
  v_sig text;
BEGIN
  SELECT pg_get_function_identity_arguments(p.oid)
    INTO v_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_boutique_password'
   LIMIT 1;
  IF v_sig IS NOT NULL THEN
    EXECUTE format('REVOKE ALL ON FUNCTION public.set_boutique_password(%s) FROM anon, authenticated, PUBLIC', v_sig);
  END IF;
END;
$$;
-- ⚠️ Conséquence : la création de boutique via l'app (boutique.js) n'appellera
--    plus set_boutique_password avec succès. RLS bloque de toute façon l'INSERT
--    boutiques. À remplacer plus tard par une version exigeant l'ancien mdp.
-- 4. Fix cross-boutique : delete_product_secure ne vérifiait PAS que le
--    produit appartient à la boutique -> avec son propre mot de passe, une
--    boutique pouvait supprimer n'importe quel produit dont elle connaissait
--    l'uuid. On contraint désormais par boutique_id.
CREATE OR REPLACE FUNCTION public.delete_product_secure(
  p_product_id uuid,
  p_slug text,
  p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_boutique_password(p_slug, p_password) THEN
    RAISE EXCEPTION 'Mot de passe incorrect';
  END IF;
  DELETE FROM produits
   WHERE id = p_product_id
     AND boutique_id = (SELECT id FROM boutiques WHERE slug = p_slug);
END;
$$;
-- Les grants existants sur cette signature sont conservés par CREATE OR REPLACE.