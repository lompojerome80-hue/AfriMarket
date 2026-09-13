import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { notifyFollowersNewProduct } from './follow';
import { hashPassword } from './auth';
import fid from './fid';

const BOUTIQUE_LS = 'afrimarket_boutiques';
const BOUTIQUE_PW = 'afrimarket_boutique_passwords';
const OWNERS_KEY = 'afrimarket_boutique_owners';

async function pwHash(code) {
  return hashPassword('boutique:' + String(code || ''), 'boutique');
}

async function getPwMap() {
  try { return JSON.parse(await AsyncStorage.getItem(BOUTIQUE_PW)) || {}; } catch { return {}; }
}

async function pwMatches(slug, password) {
  const pws = await getPwMap();
  const stored = pws[slug];
  if (stored == null) return false;
  if ((await pwHash(password)) === stored) return true;
  if (stored === password) {
    pws[slug] = await pwHash(password);
    await AsyncStorage.setItem(BOUTIQUE_PW, JSON.stringify(pws));
    return true;
  }
  return false;
}

async function setOwner(slug, key) {
  if (!key) return;
  try {
    const owners = JSON.parse(await AsyncStorage.getItem(OWNERS_KEY)) || {};
    owners[slug] = key;
    await AsyncStorage.setItem(OWNERS_KEY, JSON.stringify(owners));
  } catch {}
}

async function getOwner(slug) {
  try {
    const owners = JSON.parse(await AsyncStorage.getItem(OWNERS_KEY)) || {};
    return owners[slug] || null;
  } catch { return null; }
}

let _sbOk = null;

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function lsGet(key) {
  try { return JSON.parse(await AsyncStorage.getItem(key)) || []; } catch { return []; }
}
async function lsSave(key, data) {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

async function isSupabaseAvailable() {
  if (_sbOk !== null) return _sbOk;
  try {
    const { error } = await supabase.from('boutiques').select('id').limit(1);
    _sbOk = !error;
  } catch {
    _sbOk = false;
  }
  return _sbOk;
}

export async function boutiqueExists(nom) {
  const slug = slugify(nom);
  if (await isSupabaseAvailable()) {
    const { data } = await supabase.from('boutiques').select('id').eq('slug', slug).maybeSingle();
    return !!data;
  }
  const all = await lsGet(BOUTIQUE_LS);
  return all.some(b => b.slug === slug);
}

export async function createBoutique(data) {
  const slug = slugify(data.nom);
  if (await isSupabaseAvailable()) {
    try {
      const result = await _createSupabase(data, slug);
      await setOwner(slug, data.proprietaireKey);
      return result;
    } catch (e) {
      console.warn('Supabase fallback localStorage:', e.message);
      _sbOk = false;
    }
  }
  const result = await _createLocal(data, slug);
  await setOwner(slug, data.proprietaireKey);
  return result;
}

async function _createSupabase(data, slug) {
  const base = {
    slug, nom: data.nom, logo: data.logo || null,
    banniere: data.banniere || null, histoire: data.histoire || null,
    reseaux: data.reseaux || {},
  };
  let shop = null;
  if (data.ville) {
    const first = await supabase.from('boutiques').insert({ ...base, ville: data.ville }).select().single();
    if (!first.error) shop = first.data;
  }
  if (!shop) {
    const retry = await supabase.from('boutiques').insert(base).select().single();
    if (retry.error) throw retry.error;
    shop = retry.data;
  }

  const { error: pwErr } = await supabase.rpc('set_boutique_password', {
    p_boutique_id: shop.id, p_password: data.motDePasse,
  });
  if (pwErr) console.error('set_boutique_password:', pwErr);

  if (data.produits?.length) {
    const rows = data.produits.map(p => ({
      boutique_id: shop.id, title: p.title, price: p.price, img: p.img, category: p.category || null,
    }));
    await supabase.from('produits').insert(rows);
  }
  return slug;
}

async function _createLocal(data, slug) {
  const boutiques = await lsGet(BOUTIQUE_LS);
  const id = 'ls_' + fid('');
  const now = new Date().toISOString();
  boutiques.push({
    id, slug, nom: data.nom, logo: data.logo || null,
    banniere: data.banniere || null, histoire: data.histoire || null,
    reseaux: data.reseaux || {}, ville: data.ville || null,
    created_at: now,
  });
  await lsSave(BOUTIQUE_LS, boutiques);

  const produits = (data.produits || []).map((p, i) => ({
    id: id + '_p' + i, boutique_id: id, title: p.title,
    price: p.price,
    img: p.img || (Array.isArray(p.photos) ? p.photos[0] : undefined),
    photos: Array.isArray(p.photos) && p.photos.length ? p.photos : (p.img ? [p.img] : []),
    oldPrice: p.oldPrice,
    category: p.category || 'Autre',
    vendus: 0, revenu: 0, created_at: now,
  }));
  await lsSave('afrimarket_produits_' + slug, produits);
  await lsSave('afrimarket_avis_' + slug, []);

  const pws = await getPwMap();
  pws[slug] = await pwHash(data.motDePasse);
  await lsSave(BOUTIQUE_PW, pws);

  return slug;
}

export async function getBoutique(slug) {
  if (await isSupabaseAvailable()) {
    try {
      const shop = await _getSupabase(slug);
      if (shop) return shop;
    } catch (e) {
      console.warn('Supabase fallback:', e.message);
      _sbOk = false;
    }
  }
  return _getLocal(slug);
}

async function _getSupabase(slug) {
  const { data: shop, error } = await supabase.from('boutiques').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!shop) return null;

  const [{ data: produits }, { data: avisList }] = await Promise.all([
    supabase.from('produits').select('*').eq('boutique_id', shop.id).order('created_at'),
    supabase.from('avis').select('*').eq('boutique_id', shop.id).order('created_at', { ascending: false }),
  ]);

  return {
    ...shop, creeLe: shop.created_at,
    proprietaireKey: await getOwner(slug),
    produits: produits || [],
    avis: (avisList || []).map(a => ({ ...a, date: a.created_at })),
  };
}

async function _getLocal(slug) {
  const shop = (await lsGet(BOUTIQUE_LS)).find(b => b.slug === slug);
  if (!shop) return null;
  const produits = await lsGet('afrimarket_produits_' + slug);
  const avis = await lsGet('afrimarket_avis_' + slug);
  return { ...shop, creeLe: shop.created_at, proprietaireKey: await getOwner(slug), produits, avis };
}

export async function addAvis(slug, avisData) {
  const userKeyVal = avisData.userKey || null;
  const ownerKey = await getOwner(slug);
  if (userKeyVal && ownerKey && userKeyVal === ownerKey) {
    return { ok: false, error: 'Le vendeur ne peut pas noter sa propre boutique' };
  }

  if (await isSupabaseAvailable()) {
    try {
      const { data: shop } = await supabase.from('boutiques').select('id').eq('slug', slug).maybeSingle();
      if (!shop) return { ok: false, error: 'Boutique introuvable' };
      if (userKeyVal) {
        const { data: existing } = await supabase
          .from('avis')
          .select('id')
          .eq('boutique_id', shop.id)
          .eq('user_key', userKeyVal)
          .maybeSingle();
        if (existing) return { ok: false, error: 'Vous avez déjà noté cette boutique' };
      }
      const { error } = await supabase.from('avis').insert({
        boutique_id: shop.id, nom: avisData.nom, note: avisData.note, comment: avisData.comment,
        user_key: userKeyVal || null,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    } catch { _sbOk = false; }
  }
  const avis = await lsGet('afrimarket_avis_' + slug);
  if (userKeyVal && avis.some((a) => a.userKey && a.userKey === userKeyVal)) {
    return { ok: false, error: 'Vous avez déjà noté cette boutique' };
  }
  avis.unshift({
    id: 'av_' + Date.now(), nom: avisData.nom, note: Number(avisData.note),
    comment: avisData.comment, userKey: userKeyVal || null, created_at: new Date().toISOString(),
  });
  await lsSave('afrimarket_avis_' + slug, avis);
  return { ok: true };
}

export async function checkBoutiquePassword(slug, password) {
  if (await isSupabaseAvailable()) {
    try {
      const { data } = await supabase.rpc('check_boutique_password', { p_slug: slug, p_password: password });
      return data === true;
    } catch { _sbOk = false; }
  }
  return await pwMatches(slug, password);
}

export async function addProductSecure(slug, password, product) {
  if (await isSupabaseAvailable()) {
    try {
      const { data, error } = await supabase.rpc('add_product_secure', {
        p_slug: slug, p_password: password, p_title: product.title, p_price: product.price,
        p_img: product.img, p_category: product.category || 'Autre',
      });
      if (error) throw error;
      await notifyFollowersNewProduct(slug, product.title);
      return data;
    } catch { _sbOk = false; }
  }
  const KEY = 'afrimarket_produits_' + slug;
  const produits = await lsGet(KEY);
  if (!password || !(await pwMatches(slug, password))) return null;
  const newProd = {
    id: 'ls_' + fid(''),
    boutique_id: slug, title: product.title, price: product.price,
    img: product.img || (Array.isArray(product.photos) ? product.photos[0] : undefined),
    photos: Array.isArray(product.photos) && product.photos.length ? product.photos : (product.img ? [product.img] : []),
    oldPrice: product.oldPrice,
    category: product.category || 'Autre',
    vendus: 0, revenu: 0, created_at: new Date().toISOString(),
  };
  produits.push(newProd);
  await lsSave(KEY, produits);
  await notifyFollowersNewProduct(slug, product.title);
  return newProd.id;
}

export async function deleteProductSecure(slug, password, productId) {
  if (await isSupabaseAvailable()) {
    try {
      const { error } = await supabase.rpc('delete_product_secure', {
        p_product_id: productId, p_slug: slug, p_password: password,
      });
      if (!error) return;
    } catch { _sbOk = false; }
  }
  const KEY = 'afrimarket_produits_' + slug;
  if (!password || !(await pwMatches(slug, password))) return;
  const produits = (await lsGet(KEY)).filter(p => p.id !== productId);
  await lsSave(KEY, produits);
}

export async function updateProductStock(slug, productId, stock) {
  if (await isSupabaseAvailable()) {
    try {
      const { error } = await supabase.rpc('update_product_stock', {
        p_product_id: productId, p_slug: slug, p_stock: Math.max(0, Math.floor(stock || 0)),
      });
      if (!error) return { ok: true };
    } catch { _sbOk = false; }
  }
  const KEY = 'afrimarket_produits_' + slug;
  const produits = await lsGet(KEY);
  const idx = produits.findIndex((p) => String(p.id) === String(productId));
  if (idx === -1) return { ok: false, error: 'Produit introuvable' };
  produits[idx].stock = Math.max(0, Math.floor(stock || 0));
  await lsSave(KEY, produits);
  return { ok: true };
}

export async function updateProductPrice(slug, productId, { price, oldPrice } = {}) {
  const newPrice = Math.max(0, Number(price) || 0);
  const newOldPrice = Math.max(0, Number(oldPrice) || 0);
  const finalOld = newOldPrice > newPrice ? newOldPrice : 0;
  if (await isSupabaseAvailable()) {
    try {
      const { error } = await supabase.rpc('update_product_price', {
        p_product_id: productId, p_slug: slug, p_price: newPrice, p_old_price: finalOld,
      });
      if (!error) return { ok: true };
    } catch { _sbOk = false; }
  }
  const KEY = 'afrimarket_produits_' + slug;
  const produits = await lsGet(KEY);
  const idx = produits.findIndex((p) => String(p.id) === String(productId));
  if (idx === -1) return { ok: false, error: 'Produit introuvable' };
  produits[idx].price = newPrice;
  if (finalOld > 0) produits[idx].oldPrice = finalOld;
  else delete produits[idx].oldPrice;
  await lsSave(KEY, produits);
  return { ok: true };
}

export async function deleteBoutiquesByOwner(ownerKey) {
  const boutiques = await lsGet(BOUTIQUE_LS);
  if (!ownerKey) return [];
  const owned = [];
  for (const b of boutiques) {
    if ((await getOwner(b.slug || b.nom)) === ownerKey) owned.push(b);
  }
  if (!owned.length) return [];
  for (const b of owned) {
    try {
      await AsyncStorage.removeItem('afrimarket_produits_' + (b.slug || b.nom));
      await AsyncStorage.removeItem('afrimarket_avis_' + (b.slug || b.nom));
    } catch {}
  }
  await lsSave(BOUTIQUE_LS, boutiques.filter((b) => !owned.includes(b)));
  try {
    const owners = JSON.parse(await AsyncStorage.getItem(OWNERS_KEY)) || {};
    owned.forEach((b) => delete owners[b.slug || b.nom]);
    await AsyncStorage.setItem(OWNERS_KEY, JSON.stringify(owners));
  } catch {}
  const pws = JSON.parse(await AsyncStorage.getItem(BOUTIQUE_PW) || '{}');
  owned.forEach((b) => delete pws[b.slug || b.nom]);
  try { await AsyncStorage.setItem(BOUTIQUE_PW, JSON.stringify(pws)); } catch {}
  return owned.map((b) => b.slug || b.nom);
}
