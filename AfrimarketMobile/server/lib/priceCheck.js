'use strict';

/*
 * priceCheck — source de vérité des prix (Supabase REST, zéro dépendance).
 *
 * Le montant d'une commande n'est JAMAIS cru sur parole : le serveur
 * relit chaque produit dans la table `produits` et recalcule le total
 * avec les prix réellement en base.
 *
 * Clé publique (anon/publishable) identique à celle de l'app
 * (src/lib/supabase.js) : elle est publique par conception, donc
 * utilisable ici. Un env SUPABASE_URL / SUPABASE_ANON_KEY peut la
 * surcharger pour un autre projet.
 *
 * Lignes non-produit du panier (livraison, frais, remise promo) :
 * elles n'existent pas dans `produits`, leur montant est donc repris
 * tel quel. Les prix de produits, eux, sont systématiquement ignorés
 * puis remplacés par le prix base.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://acxbdhdpmdasrdxwllgi.supabase.co').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_gyQKxL1C-D6l-phEOD7d3g_A2Ac1sG4';
const TABLE = process.env.SUPABASE_TABLE_PRODUITS || 'produits';
const COL = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(process.env.SUPABASE_COL_PRIX || 'price')
  ? (process.env.SUPABASE_COL_PRIX || 'price')
  : 'price';
const FALLBACK_COLS = ['prix', 'prixUnitaire', 'price', 'montant', 'prix_unit'];
const TIMEOUT_MS = 5000;
const MAX_QTE = 99;

const LIGNES_CALCULEES = new Set(['promo', 'livraison', 'frais', 'remise', 'port', 'taxes']);
const LIGNES_FRAIS = new Set(['livraison', 'frais', 'port', 'taxes']);
const LIGNES_REMISE = new Set(['promo', 'remise']);
const TABLE_COUPONS = process.env.SUPABASE_TABLE_COUPONS || 'coupons';
const MAX_FEE = Math.max(0, Math.round(Number(process.env.MAX_FEE_PER_LINE) || 10000));

function sanitizeId(v) {
  return String(v == null ? '' : v).trim().slice(0, 80);
}

function sanitizeQte(v) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_QTE);
}

// Identifiant produit acceptable : UUID (colonne `id` de `produits`) ou entier.
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isQueryableId(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return false;
  if (RE_UUID.test(s)) return true;
  return /^\d+$/.test(s);
}

function readPrice(row) {
  if (!row || typeof row !== 'object') return null;
  const candidates = [COL, ...FALLBACK_COLS];
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      const n = Math.round(Number(row[key]));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/*
 * GET /rest/v1/produits?select=id,price&id=in.(...)
 * Retourne une Map id -> prix unitaire.
 *
 * La colonne `id` de `produits` est un UUID : on ne filtre donc jamais sur
 * un entier casté, on transmet l'identifiant tel quel (UUID ou entier).
 */
async function fetchProductPrices(ids) {
  const unique = [...new Set(ids.filter((v) => isQueryableId(v)))];
  const prices = new Map();
  if (!unique.length) return prices;

  // PostgREST limite la taille d'un in.(...) : on découpe par lots.
  const BATCH = 50;
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const url =
      `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE)}` +
      `?select=id,${encodeURIComponent(COL)}&id=in.(${batch.map((v) => encodeURIComponent(v)).join(',')})`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const err = new Error(`Supabase inaccessible (HTTP ${res.status}) : prix non vérifiables.`);
      err.code = 'PRICE_SOURCE_UNAVAILABLE';
      throw err;
    }
    const rows = await res.json();
    if (!Array.isArray(rows)) {
      const err = new Error('Réponse Supabase inattendue : prix non vérifiables.');
      err.code = 'PRICE_SOURCE_UNAVAILABLE';
      throw err;
    }
    for (const row of rows) {
      const id = row && row.id;
      const price = readPrice(row);
      if (id !== undefined && id !== null && price !== null) prices.set(String(id), price);
    }
  }
  return prices;
}

/*
 * Validation d'un code promo contre la table `coupons` du serveur.
 * Le montant de la remise n'est JAMAIS fourni par l'app : il est recalculé
 * ici à partir de la valeur stockée en base. Fail-closed.
 */
async function fetchCoupon(code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return null;
  const url =
    `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE_COUPONS)}` +
    `?select=code,type,value,max_uses,uses,actif&code=eq.${encodeURIComponent(clean)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`Codes promo non vérifiables (HTTP ${res.status}).`);
    err.code = 'COUPON_SOURCE_UNAVAILABLE';
    throw err;
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows[0];
}

/*
 * Consommation d'une utilisation de code promo via la fonction SQL
 * `increment_coupon_use` (SECURITY DEFINER). Sans elle, le compteur `uses`
 * ne bouge jamais et `max_uses` n'est jamais atteint. Idempotent côté serveur
 * via le drapeau `couponConsumedAt` de la transaction.
 */
async function consumeCoupon(code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { consumed: false, reason: 'code absent' };
  const url = `${SUPABASE_URL}/rest/v1/rpc/increment_coupon_use`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ p_code: clean }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return { consumed: false, reason: e && e.message ? e.message : 'timeout' };
  }
  if (res.status === 404) {
    return { consumed: false, reason: 'fonction increment_coupon_use absente' };
  }
  if (!res.ok) {
    return { consumed: false, reason: `HTTP ${res.status}` };
  }
  const data = await res.json().catch(() => null);
  if (data && data.consumed === false) {
    return { consumed: false, reason: data.reason || 'refuse par la base' };
  }
  return { consumed: true, code: clean };
}

/*
 * computeRealTotal(items, options) -> { total, lines, unmatched, discount }
 *
 * items : panier envoyé par l'app. Pour un produit, seuls `id` et `qte` font
 * foi : `prixUnitaire` est ignoré et le prix est relu dans `produits`.
 *
 * Lignes de frais (livraison/frais/port/taxes) : montant positif, plafonné par
 * MAX_FEE et qte forcée à 1, pour empêcher la multiplication par la quantité.
 *
 * Lignes de remise (promo/remise) : le montant fourni par l'app est ignoré.
 * La remise est recalculée par le serveur depuis le code promo stocké en base
 * (`options.promoCode`). Sans code valide, aucune remise n'est appliquée.
 *
 * Fail-closed : produit introuvable, remise non vérifiable ou total <= 0
 * lèvent une erreur — jamais de repli sur le montant annoncé par l'app.
 */
async function computeRealTotal(items, options = {}) {
  const list = Array.isArray(items) ? items : [];
  const promoCode = options.promoCode !== undefined ? options.promoCode : null;

  const productLines = [];
  const feeLines = [];
  const unmatched = [];
  let hasDiscountLine = false;

  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const id = sanitizeId(raw.id);
    const qte = sanitizeQte(raw.qte !== undefined ? raw.qte : raw.quantity);
    const amount = Math.round(Number(raw.prixUnitaire !== undefined ? raw.prixUnitaire : raw.price) || 0);

    if (LIGNES_REMISE.has(id)) {
      hasDiscountLine = true;
      continue;
    }
    if (LIGNES_FRAIS.has(id)) {
      if (amount < 0 || amount > MAX_FEE) {
        const err = new Error(
          `Frais « ${id} » hors limites (${amount}, maximum ${MAX_FEE}). Montant refusé.`
        );
        err.code = 'FEE_OUT_OF_RANGE';
        throw err;
      }
      feeLines.push({ id, amount });
      continue;
    }
    if (LIGNES_CALCULEES.has(id)) {
      const err = new Error(`Ligne de panier non autorisée : « ${id} ».`);
      err.code = 'UNEXPECTED_LINE';
      throw err;
    }
    if (!isQueryableId(id)) {
      // Id produit inexploitable (ex. 'article', identifiant local) :
      // impossible de sourcer son prix -> refus fail-closed.
      unmatched.push(id || '(vide)');
      continue;
    }
    productLines.push({ id, qte });
  }

  const prices = await fetchProductPrices(productLines.map((l) => l.id));

  const lines = [];
  let subtotal = 0;

  for (const line of productLines) {
    const price = prices.has(line.id) ? prices.get(line.id) : null;
    if (price === null) {
      unmatched.push(String(line.id));
      continue;
    }
    const lineTotal = price * line.qte;
    subtotal += lineTotal;
    lines.push({ id: String(line.id), qte: line.qte, prixUnitaire: price, source: 'supabase' });
  }

  if (unmatched.length) {
    const err = new Error(
      'Produit introuvable ou prix indisponible en base : ' + unmatched.join(', ') +
      '. Montant refusé (le prix envoyé par l\'application n\'est jamais utilisé).'
    );
    err.code = 'PRICE_NOT_FOUND';
    err.unmatched = unmatched;
    throw err;
  }

  let fees = 0;
  for (const line of feeLines) {
    fees += line.amount;
    lines.push({ id: line.id, qte: 1, prixUnitaire: line.amount, source: 'envoye' });
  }

  let discount = 0;
  if (hasDiscountLine && !promoCode) {
    const err = new Error('Remise demandée sans code promo vérifiable. Montant refusé.');
    err.code = 'COUPON_REQUIRED';
    throw err;
  }
  if (promoCode) {
    const coupon = await fetchCoupon(promoCode);
    if (!coupon) {
      const err = new Error(`Code promo invalide : ${String(promoCode).toUpperCase()}.`);
      err.code = 'COUPON_INVALID';
      throw err;
    }
    if (coupon.actif === false) {
      const err = new Error('Ce code promo est désactivé.');
      err.code = 'COUPON_INACTIVE';
      throw err;
    }
    const maxUses = Math.round(Number(coupon.max_uses) || 0);
    const uses = Math.round(Number(coupon.uses) || 0);
    if (maxUses > 0 && uses >= maxUses) {
      const err = new Error('Ce code promo a atteint sa limite d\'utilisations.');
      err.code = 'COUPON_EXHAUSTED';
      throw err;
    }
    const value = Number(coupon.value) || 0;
    const rawDiscount = String(coupon.type) === 'percent'
      ? Math.round((subtotal * Math.min(100, Math.max(0, value))) / 100)
      : Math.round(Math.max(0, value));
    discount = Math.max(0, Math.min(rawDiscount, subtotal));
    lines.push({ id: 'promo', qte: 1, prixUnitaire: -discount, source: 'supabase', code: coupon.code });
  }

  const total = subtotal + fees - discount;
  if (!(total > 0)) {
    const err = new Error('Montant total nul ou négatif : paiement refusé.');
    err.code = 'TOTAL_NOT_POSITIVE';
    throw err;
  }

  return { total, lines, unmatched, subtotal, fees, discount };
}

module.exports = { computeRealTotal, fetchProductPrices, fetchCoupon, consumeCoupon };
