/* boutique.js — gestion des boutiques vendeurs AfriMarket.
   Essaie Supabase en priorité ; si la connexion échoue (hors-ligne, CORS,
   projet Supabase indisponibe), bascule automatiquement sur localStorage
   pour que le site reste 100 % fonctionnel. */

const BOUTIQUE_LS_KEY = 'afrimarket_boutiques';
const BOUTIQUE_PW_KEY = 'afrimarket_boutique_passwords';

/* ── localStorage helpers ── */
function _lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function _lsSave(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ── Teste si Supabase est joignable ── */
let _sbOk = null;
async function isSupabaseAvailable() {
  if (_sbOk !== null) return _sbOk;
  try {
    const { data, error } = await sb.from('boutiques').select('id').limit(1);
    if (error) {
      console.info('Supabase check error:', error.code, error.message);
      _sbOk = false;
    } else {
      _sbOk = true;
    }
  } catch {
    _sbOk = false;
  }
  return _sbOk;
}

/* ── boutiqueExists ── */
async function boutiqueExists(nom) {
  const slug = slugify(nom);
  if (await isSupabaseAvailable()) {
    const { data } = await sb.from('boutiques').select('id').eq('slug', slug).maybeSingle();
    return !!data;
  }
  return _lsGet(BOUTIQUE_LS_KEY).some(b => b.slug === slug);
}

/* ── createBoutique ── */
async function createBoutique(data) {
  const slug = slugify(data.nom);

  if (await isSupabaseAvailable()) {
    try {
      return await _createBoutiqueSupabase(data, slug);
    } catch (e) {
      console.warn('Supabase échoué, bascule localStorage:', e);
      _sbOk = false;
    }
  }
  return _createBoutiqueLocal(data, slug);
}

async function _createBoutiqueSupabase(data, slug) {
  const { data: shop, error } = await sb
    .from('boutiques')
    .insert({
      slug,
      nom: data.nom,
      logo: data.logo || null,
      banniere: data.banniere || null,
      histoire: data.histoire || null,
      reseaux: data.reseaux || {},
    })
    .select()
    .single();
  if (error) throw error;

  const { error: pwError } = await sb.rpc('set_boutique_password', {
    p_boutique_id: shop.id,
    p_password: data.motDePasse,
  });
  if (pwError) console.error('set_boutique_password:', pwError);

  if (data.produits && data.produits.length) {
    const rows = data.produits.map(p => ({
      boutique_id: shop.id,
      title: p.title,
      price: p.price,
      img: p.img,
    }));
    const { error: prodError } = await sb.from('produits').insert(rows);
    if (prodError) console.error('insert produits:', prodError);
  }
  return slug;
}

function _createBoutiqueLocal(data, slug) {
  const boutiques = _lsGet(BOUTIQUE_LS_KEY);
  const id = 'ls_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  const shop = {
    id,
    slug,
    nom: data.nom,
    logo: data.logo || null,
    banniere: data.banniere || null,
    histoire: data.histoire || null,
    reseaux: data.reseaux || {},
    created_at: now,
  };
  boutiques.push(shop);
  _lsSave(BOUTIQUE_LS_KEY, boutiques);

  /* Produits locaux */
  const PROD_KEY = 'afrimarket_produits_' + slug;
  const produits = (data.produits || []).map((p, i) => ({
    id: id + '_p' + i,
    boutique_id: id,
    title: p.title,
    price: p.price,
    img: p.img,
    vendus: 0,
    revenu: 0,
    created_at: now,
  }));
  _lsSave(PROD_KEY, produits);

  /* Avis locaux */
  _lsSave('afrimarket_avis_' + slug, []);

  /* Mot de passe local */
  const pws = JSON.parse(localStorage.getItem(BOUTIQUE_PW_KEY) || '{}');
  pws[slug] = data.motDePasse;
  _lsSave(BOUTIQUE_PW_KEY, pws);

  return slug;
}

/* ── getBoutique ── */
async function getBoutique(slug) {
  if (await isSupabaseAvailable()) {
    try {
      const shop = await _getBoutiqueSupabase(slug);
      if (shop) return shop;
    } catch (e) {
      console.warn('Supabase getBoutique échoué, fallback local:', e);
      _sbOk = false;
    }
  }
  return _getBoutiqueLocal(slug);
}

async function _getBoutiqueSupabase(slug) {
  const { data: shop, error } = await sb.from('boutiques').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!shop) return null;

  const [{ data: produits }, { data: avisList }] = await Promise.all([
    sb.from('produits').select('*').eq('boutique_id', shop.id).order('created_at'),
    sb.from('avis').select('*').eq('boutique_id', shop.id).order('created_at', { ascending: false }),
  ]);

  return {
    ...shop,
    creeLe: shop.created_at,
    produits: produits || [],
    avis: (avisList || []).map(a => ({ ...a, date: a.created_at })),
  };
}

function _getBoutiqueLocal(slug) {
  const shop = _lsGet(BOUTIQUE_LS_KEY).find(b => b.slug === slug);
  if (!shop) return null;

  const produits = _lsGet('afrimarket_produits_' + slug);
  const avis = _lsGet('afrimarket_avis_' + slug);

  return {
    ...shop,
    creeLe: shop.created_at,
    produits,
    avis,
  };
}

/* ── addAvis ── */
async function addAvis(slug, avisData) {
  if (await isSupabaseAvailable()) {
    try {
      const { data: shop } = await sb.from('boutiques').select('id').eq('slug', slug).maybeSingle();
      if (!shop) return false;
      const { error } = await sb.from('avis').insert({
        boutique_id: shop.id,
        nom: avisData.nom,
        note: avisData.note,
        comment: avisData.comment,
      });
      return !error;
    } catch (e) {
      console.warn('Supabase addAvis échoué, fallback local:', e);
      _sbOk = false;
    }
  }
  /* Local */
  const avis = _lsGet('afrimarket_avis_' + slug);
  avis.unshift({
    id: 'av_' + Date.now(),
    nom: avisData.nom,
    note: Number(avisData.note),
    comment: avisData.comment,
    created_at: new Date().toISOString(),
  });
  _lsSave('afrimarket_avis_' + slug, avis);
  return true;
}

/* ── checkBoutiquePassword ── */
async function checkBoutiquePassword(slug, password) {
  if (await isSupabaseAvailable()) {
    try {
      const { data } = await sb.rpc('check_boutique_password', { p_slug: slug, p_password: password });
      return data === true;
    } catch (e) {
      console.warn('Supabase checkPassword échoué, fallback local:', e);
      _sbOk = false;
    }
  }
  const pws = JSON.parse(localStorage.getItem(BOUTIQUE_PW_KEY) || '{}');
  return pws[slug] === password;
}

/* ── recordSale ── */
async function recordSale(slug, productId, qty, lineRevenue) {
  if (await isSupabaseAvailable()) {
    try {
      const { error } = await sb.rpc('record_sale', {
        p_product_id: productId,
        p_qty: qty,
        p_revenue: lineRevenue,
      });
      if (!error) return;
    } catch (e) {
      console.warn('Supabase recordSale échoué, fallback local:', e);
      _sbOk = false;
    }
  }
  /* Local */
  const produits = _lsGet('afrimarket_produits_' + slug);
  const p = produits.find(x => x.id === productId);
  if (p) {
    p.vendus = (p.vendus || 0) + qty;
    p.revenu = (Number(p.revenu) || 0) + lineRevenue;
    _lsSave('afrimarket_produits_' + slug, produits);
  }
}

/* ── getShopStats ── */
async function getShopStats(slug) {
  const shop = await getBoutique(slug);
  if (!shop) return null;
  const produits = shop.produits || [];
  const totalUnites = produits.reduce((s, p) => s + (p.vendus || 0), 0);
  const totalRevenu = produits.reduce((s, p) => s + (Number(p.revenu) || 0), 0);
  const meilleurVendeur = [...produits].sort((a, b) => (b.vendus || 0) - (a.vendus || 0))[0] || null;
  return { totalUnites, totalRevenu, meilleurVendeur, produits };
}

/* ── addProductSecure ── */
async function addProductSecure(slug, password, product) {
  if (await isSupabaseAvailable()) {
    try {
      const { data, error } = await sb.rpc('add_product_secure', {
        p_slug: slug,
        p_password: password,
        p_title: product.title,
        p_price: product.price,
        p_img: product.img,
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('Supabase addProductSecure échoué, fallback local:', e);
      _sbOk = false;
    }
  }
  /* Local */
  const PROD_KEY = 'afrimarket_produits_' + slug;
  const produits = _lsGet(PROD_KEY);
  const newProd = {
    id: 'ls_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    boutique_id: slug,
    title: product.title,
    price: product.price,
    img: product.img,
    vendus: 0,
    revenu: 0,
    created_at: new Date().toISOString(),
  };
  produits.push(newProd);
  _lsSave(PROD_KEY, produits);
  return newProd.id;
}

/* ── deleteProductSecure ── */
async function deleteProductSecure(slug, password, productId) {
  if (await isSupabaseAvailable()) {
    try {
      const { error } = await sb.rpc('delete_product_secure', {
        p_product_id: productId,
        p_slug: slug,
        p_password: password,
      });
      if (!error) return;
    } catch (e) {
      console.warn('Supabase deleteProductSecure échoué, fallback local:', e);
      _sbOk = false;
    }
  }
  /* Local */
  const PROD_KEY = 'afrimarket_produits_' + slug;
  const produits = _lsGet(PROD_KEY).filter(p => p.id !== productId);
  _lsSave(PROD_KEY, produits);
}
