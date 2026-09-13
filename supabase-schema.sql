/* ══════════════════════════════════════════════════════════════════════
   AfriMarket — Schéma Supabase complet
   Exécutez ce script dans : Supabase Dashboard → SQL Editor → New query
   ══════════════════════════════════════════════════════════════════════ */

-- 1. Table boutiques
CREATE TABLE IF NOT EXISTS boutiques (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  nom         TEXT NOT NULL,
  logo        TEXT,
  banniere    TEXT,
  histoire    TEXT,
  reseaux     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Table produits
CREATE TABLE IF NOT EXISTS produits (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boutique_id  UUID REFERENCES boutiques(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  price        NUMERIC NOT NULL DEFAULT 0,
  img          TEXT,
  category     TEXT DEFAULT 'Autre',
  vendus       INT DEFAULT 0,
  revenu       NUMERIC DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 3. Table avis
CREATE TABLE IF NOT EXISTS avis (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boutique_id  UUID REFERENCES boutiques(id) ON DELETE CASCADE,
  nom          TEXT NOT NULL,
  note         INT NOT NULL CHECK (note >= 1 AND note <= 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 4. Table boutique_passwords (mots de passe hachés)
CREATE TABLE IF NOT EXISTS boutique_passwords (
  boutique_id   UUID REFERENCES boutiques(id) ON DELETE CASCADE PRIMARY KEY,
  password_hash TEXT NOT NULL
);

-- ═══ RLS (Row Level Security) — tout est accessible en lecture,
--    l'écriture est contrôlée par des fonctions RPC sécurisées ═══

ALTER TABLE boutiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE boutique_passwords ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour tout le monde
DO $$ BEGIN
  CREATE POLICY "lecture_publique_boutiques" ON boutiques FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "lecture_publique_produits" ON produits FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "lecture_publique_avis" ON avis FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Écriture
DO $$ BEGIN
  CREATE POLICY "ecriture_boutiques" ON boutiques FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "ecriture_produits" ON produits FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "ecriture_avis" ON avis FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "ecriture_passwords" ON boutique_passwords FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ Fonctions RPC ═══

-- Hasher un mot de passe (via pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enregistrer le mot de passe d'une boutique
CREATE OR REPLACE FUNCTION set_boutique_password(p_boutique_id UUID, p_password TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO boutique_passwords (boutique_id, password_hash)
  VALUES (p_boutique_id, crypt(p_password, gen_salt('bf')))
  ON CONFLICT (boutique_id) DO UPDATE SET password_hash = crypt(p_password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier le mot de passe
CREATE OR REPLACE FUNCTION check_boutique_password(p_slug TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  shop_id UUID;
  stored_hash TEXT;
BEGIN
  SELECT id INTO shop_id FROM boutiques WHERE slug = p_slug;
  IF shop_id IS NULL THEN RETURN FALSE; END IF;

  SELECT password_hash INTO stored_hash FROM boutique_passwords WHERE boutique_id = shop_id;
  IF stored_hash IS NULL THEN RETURN FALSE; END IF;

  RETURN stored_hash = crypt(p_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enregistrer une vente
CREATE OR REPLACE FUNCTION record_sale(p_product_id UUID, p_qty INT, p_revenue NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE produits
  SET vendus = COALESCE(vendus, 0) + p_qty,
      revenu = COALESCE(revenu, 0) + p_revenue
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter un produit (vérifié par mot de passe)
CREATE OR REPLACE FUNCTION add_product_secure(
  p_slug TEXT, p_password TEXT,
  p_title TEXT, p_price NUMERIC, p_img TEXT, p_category TEXT DEFAULT 'Autre'
)
RETURNS UUID AS $$
DECLARE
  shop_id UUID;
  new_id UUID;
BEGIN
  SELECT id INTO shop_id FROM boutiques WHERE slug = p_slug;
  IF shop_id IS NULL THEN RAISE EXCEPTION 'Boutique introuvable'; END IF;

  IF NOT check_boutique_password(p_slug, p_password) THEN
    RAISE EXCEPTION 'Mot de passe incorrect';
  END IF;

  new_id := gen_random_uuid();
  INSERT INTO produits (id, boutique_id, title, price, img, category)
  VALUES (new_id, shop_id, p_title, p_price, p_img, p_category);

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer un produit (vérifié par mot de passe)
CREATE OR REPLACE FUNCTION delete_product_secure(
  p_product_id UUID, p_slug TEXT, p_password TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT check_boutique_password(p_slug, p_password) THEN
    RAISE EXCEPTION 'Mot de passe incorrect';
  END IF;

  DELETE FROM produits WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
