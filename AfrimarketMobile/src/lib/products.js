import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { pushNotification } from './notifications';
import { logModeration } from './admin';
import fid from './fid';

export const DEMO_PRODUCTS = [
  { id: 'demo-1', title: 'Créme hydratante bio', price: 12000, oldPrice: 15000, rating: 4.6, category: 'Beauté', img: 'https://picsum.photos/seed/creme/400/400', stock: 25 },
  { id: 'demo-2', title: 'Kit maquillage complet', price: 19000, oldPrice: 25000, rating: 4.3, category: 'Beauté', img: 'https://picsum.photos/seed/maquillage/400/400', stock: 12 },
  { id: 'demo-3', title: 'Parfum artisanal', price: 14000, oldPrice: 18000, rating: 4.8, category: 'Beauté', img: 'https://picsum.photos/seed/parfum/400/400', stock: 18 },
  { id: 'demo-4', title: 'Sac en cuir fait-main', price: 35000, rating: 4.1, category: 'Mode', img: 'https://picsum.photos/seed/sac/400/400', stock: 8 },
  { id: 'demo-5', title: 'Bracelet artisanal', price: 5000, oldPrice: 8000, rating: 4.9, category: 'Art Local', img: 'https://picsum.photos/seed/bracelet/400/400', stock: 30 },
  { id: 'demo-6', title: 'Téléphone portable reconditionné', price: 85000, rating: 3.9, category: 'Électronique', img: 'https://picsum.photos/seed/phone/400/400', stock: 5 },
];

export const DEFAULT_STOCK = 50;

const PROD_REVIEWS_KEY = 'afrimarket_avis_produit';

export async function getProductReviews(productId) {
  try {
    const map = JSON.parse(await AsyncStorage.getItem(PROD_REVIEWS_KEY)) || {};
    return (map[String(productId)] || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  } catch {
    return [];
  }
}

export async function addProductReview({ productId, userKey, userName, note, comment, ownerKey }) {
  try {
    if (ownerKey && userKey && ownerKey === userKey) {
      return { ok: false, error: 'Le vendeur ne peut pas noter son propre produit' };
    }
    const map = JSON.parse(await AsyncStorage.getItem(PROD_REVIEWS_KEY)) || {};
    const list = map[String(productId)] || [];
    if (userKey && list.some((r) => r.userKey && r.userKey === userKey)) {
      return { ok: false, error: 'Vous avez déjà noté ce produit' };
    }
    list.unshift({
      id: fid('pr_'),
      productId: String(productId),
      userKey: userKey || '',
      nom: (userName || '').trim() || 'Client',
      note: Number(note),
      comment: String(comment || '').trim(),
      created_at: new Date().toISOString(),
    });
    map[String(productId)] = list;
    await AsyncStorage.setItem(PROD_REVIEWS_KEY, JSON.stringify(map));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function getProductRating(productId) {
  const reviews = await getProductReviews(productId);
  if (!reviews.length) return { avg: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + Number(r.note) || 0, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export function normalizeStock(p) {
  return {
    stock: typeof p.stock === 'number' ? p.stock : DEFAULT_STOCK,
    vendus: p.vendus || 0,
  };
}

export function productDiscount(product) {
  const price = Number(product?.price) || 0;
  const oldPrice = Number(product?.oldPrice) || 0;
  if (oldPrice > price && price > 0) {
    const pct = Math.round((1 - price / oldPrice) * 100);
    return { has: true, pct: Math.min(95, Math.max(1, pct)), price, oldPrice, save: oldPrice - price };
  }
  return { has: false, pct: 0, price, oldPrice: 0, save: 0 };
}

export async function getAllProducts() {
  const products = [...DEMO_PRODUCTS];
  const seen = new Set(products.map((p) => String(p.id)));
  const push = (p) => {
    const photos = Array.isArray(p.photos) && p.photos.length
      ? p.photos.filter(Boolean)
      : [p.img, p.image, p.photo].filter(Boolean);
    const item = {
      ...p,
      ...normalizeStock(p),
      photos,
      img: p.img || photos[0] || undefined,
      category: p.category || 'Autre',
      boutiqueName: p.boutiqueName || '',
      boutiqueVille: p.boutiqueVille || '',
    };
    if (!seen.has(String(item.id))) {
      seen.add(String(item.id));
      products.push(item);
    }
  };

  try {
    const { data: boutiques, error } = await supabase.from('boutiques').select('id, nom, ville');
    if (!error && boutiques && boutiques.length) {
      const shopNames = {};
      boutiques.forEach((b) => {
        shopNames[b.id] = b.nom;
        const key = 'ville_' + b.id;
        shopNames[key] = b.ville || '';
      });
      const { data: produits, error: pErr } = await supabase.from('produits').select('*');
      if (!pErr && produits && produits.length) {
        produits.forEach((p) => push({
          ...p, id: p.id,
          boutiqueName: shopNames[p.boutique_id] || '',
          boutiqueVille: shopNames['ville_' + p.boutique_id] || '',
        }));
      }
    }
  } catch (e) {
    console.warn('getAllProducts Supabase indisponible:', e.message);
  }

  try {
    const boutiques = JSON.parse(await AsyncStorage.getItem('afrimarket_boutiques')) || [];
    const owners = JSON.parse(await AsyncStorage.getItem('afrimarket_boutique_owners')) || {};
    for (const b of boutiques) {
      const produits = JSON.parse(await AsyncStorage.getItem('afrimarket_produits_' + (b.slug || b.nom))) || [];
      produits.forEach((p) => push({
        ...p,
        boutiqueName: b.nom || b.name || '',
        boutiqueVille: b.ville || '',
        ownerKey: owners[b.slug || b.nom] || null,
      }));
    }
  } catch {}

  try {
    const orders = JSON.parse(await AsyncStorage.getItem('afrimarket_commandes')) || [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekly = {};
    orders.forEach((o) => {
      if (!o.created_at || new Date(o.created_at).getTime() < weekAgo) return;
      (o.items || []).forEach((it) => {
        const id = String(it.id);
        weekly[id] = (weekly[id] || 0) + (Number(it.qty) || 1);
      });
    });
    products.forEach((p) => {
      p.weeklySales = weekly[String(p.id)] || 0;
    });
  } catch {}

  try {
    const reviewsMap = JSON.parse(await AsyncStorage.getItem(PROD_REVIEWS_KEY)) || {};
    products.forEach((p) => {
      const list = Array.isArray(reviewsMap[String(p.id)]) ? reviewsMap[String(p.id)] : [];
      if (!list.length) {
        p.avisCount = typeof p.avisCount === 'number' ? p.avisCount : 0;
        return;
      }
      const sum = list.reduce((acc, r) => acc + Number(r.note) || 0, 0);
      p.rating = Math.round((sum / list.length) * 10) / 10;
      p.avisCount = list.length;
      if (!Array.isArray(p.reviews)) p.reviews = list;
    });
  } catch {}

  return products;
}

async function findLocalProduct(productId) {
  try {
    const boutiques = JSON.parse(await AsyncStorage.getItem('afrimarket_boutiques')) || [];
    for (const b of boutiques) {
      const KEY = 'afrimarket_produits_' + (b.slug || b.nom);
      const produits = JSON.parse(await AsyncStorage.getItem(KEY)) || [];
      const idx = produits.findIndex((p) => String(p.id) === String(productId));
      if (idx !== -1) {
        return { slug: b.slug || b.nom, KEY, list: produits, idx, product: produits[idx] };
      }
    }
  } catch {}
  return null;
}

export async function getStockForItem(item) {
  const found = await findLocalProduct(item?.id);
  return found ? normalizeStock(found.product).stock : DEFAULT_STOCK;
}

export async function refreshStockForProduct(product) {
  const found = await findLocalProduct(product?.id);
  if (found) return normalizeStock(found.product).stock;
  return typeof product?.stock === 'number' ? product.stock : DEFAULT_STOCK;
}

export async function adminDeleteProduct({ id, slug, boutiqueName, ownerKey, title, reason, adminName }) {
  const safeTitle = String(title || 'Produit');
  let deleted = false;

  if (slug) {
    try {
      const KEY = 'afrimarket_produits_' + slug;
      const produits = JSON.parse(await AsyncStorage.getItem(KEY)) || [];
      const keep = produits.filter((p) => String(p.id) !== String(id));
      if (keep.length !== produits.length) {
        await AsyncStorage.setItem(KEY, JSON.stringify(keep));
        deleted = true;
      }
    } catch {}
  }
  if (!deleted) {
    const found = await findLocalProduct(id);
    if (found) {
      found.list.splice(found.idx, 1);
      try { await AsyncStorage.setItem(found.KEY, JSON.stringify(found.list)); } catch {}
      deleted = true;
    }
  }
  if (!deleted) {
    try {
      const { data, error } = await supabase
        .from('produits')
        .delete()
        .eq('id', String(id))
        .select('id');
      if (!error && data && data.length > 0) deleted = true;
    } catch {}
  }

  if (deleted) {
    try {
      const reviewsMap = JSON.parse(await AsyncStorage.getItem(PROD_REVIEWS_KEY)) || {};
      if (reviewsMap[String(id)]) {
        delete reviewsMap[String(id)];
        await AsyncStorage.setItem(PROD_REVIEWS_KEY, JSON.stringify(reviewsMap));
      }
    } catch {}
    await logModeration({
      productId: String(id),
      title: safeTitle,
      boutique: boutiqueName || '',
      ownerKey: ownerKey || null,
      reason: String(reason || '').trim(),
      by: adminName || 'Administrateur',
    });
  }

  if (ownerKey) {
    await pushNotification(ownerKey, {
      title: '🚫 Produit retiré de la plateforme',
      body: `« ${safeTitle} » a été supprimé par la modération${reason ? ' — Motif : ' + reason : '.'}${reason ? '.' : ' Contactez le support si vous pensez que c\'est une erreur.'}`,
      type: 'moderation',
    });
  }

  return {
    ok: deleted,
    message: deleted
      ? 'Produit supprimé et vendeur notifié.'
      : 'Produit introuvable (déjà supprimé ?).',
  };
}

export async function decrementStockFromOrders(items) {
  if (!items || !items.length) return;
  const grouped = {};
  items.forEach((i) => {
    grouped[String(i.id)] = (grouped[String(i.id)] || 0) + (i.qty || 1);
  });
  for (const id of Object.keys(grouped)) {
    const found = await findLocalProduct(id);
    if (!found) continue;
    const { stock } = normalizeStock(found.product);
    found.product.stock = Math.max(0, stock - grouped[id]);
    found.product.vendus = (found.product.vendus || 0) + grouped[id];
    found.list[found.idx] = found.product;
    try {
      await AsyncStorage.setItem(found.KEY, JSON.stringify(found.list));
    } catch {}
  }
}

export async function restoreStockFromOrder(items) {
  if (!items || !items.length) return;
  const grouped = {};
  items.forEach((i) => {
    grouped[String(i.id)] = (grouped[String(i.id)] || 0) + (Number(i.qty) || 1);
  });
  for (const id of Object.keys(grouped)) {
    const found = await findLocalProduct(id);
    if (!found) continue;
    const { stock } = normalizeStock(found.product);
    found.product.stock = (found.product.stock === undefined ? DEFAULT_STOCK : stock) + grouped[id];
    found.list[found.idx] = found.product;
    try {
      await AsyncStorage.setItem(found.KEY, JSON.stringify(found.list));
    } catch {}
  }
}

export async function getAllReviews() {
  const products = await getAllProducts();
  const map = JSON.parse(await AsyncStorage.getItem(PROD_REVIEWS_KEY)) || {};
  const out = [];
  for (const pid of Object.keys(map)) {
    const prod = products.find((p) => String(p.id) === String(pid));
    for (const r of (Array.isArray(map[pid]) ? map[pid] : [])) {
      out.push({ ...r, productTitle: prod?.title || 'Produit', boutique: prod?.boutiqueName || prod?.boutique_nom || '' });
    }
  }
  return out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function deleteProductReview(productId, reviewId) {
  try {
    const map = JSON.parse(await AsyncStorage.getItem(PROD_REVIEWS_KEY)) || {};
    const pid = String(productId);
    const list = map[pid] || [];
    const keep = list.filter((r) => String(r.id) !== String(reviewId));
    if (keep.length !== list.length) {
      map[pid] = keep;
      await AsyncStorage.setItem(PROD_REVIEWS_KEY, JSON.stringify(map));
      return { ok: true };
    }
    return { ok: false, error: 'Avis introuvable.' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}