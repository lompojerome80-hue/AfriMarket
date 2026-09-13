import AsyncStorage from '@react-native-async-storage/async-storage';
import { userKey } from './auth';
import { decrementStockFromOrders } from './products';
import fid, { randCode } from './fid';

const ORDERS_KEY = 'afrimarket_commandes';

function genCode(prefix) {
  return (prefix || '') + randCode(4);
}

export function orderNumero(createdAt) {
  const d = new Date(createdAt);
  const p = (x) => String(x).padStart(2, '0');
  return 'CMD-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + String(d.getTime()).slice(-4);
}

export async function getAllOrders() {
  try { return JSON.parse(await AsyncStorage.getItem(ORDERS_KEY)) || []; } catch { return []; }
}

export async function createOrder({ items, total, client, location, coupon, livraison }) {
  if (!items || !items.length) return null;
  const orders = await getAllOrders();
  const now = new Date().toISOString();
  const ownerMap = await ownersMap();
  const normalizedItems = items.map((it) => {
    const slug = it.shopSlug || it.boutique_id || null;
    return {
      ...it,
      shopSlug: slug,
      ownerKey: it.ownerKey || (slug ? ownerMap[slug] : null) || null,
      boutiqueName: it.boutiqueName || it.boutique_nom || '',
      boutiqueVille: it.boutiqueVille || it.boutique_ville || '',
    };
  });
  const sellerKey = normalizedItems.map((i) => i.ownerKey).find(Boolean) || 'vendeur';
  const order = {
    id: fid('cmd_'),
    numero: orderNumero(now),
    status: 'en_cours',
    items: normalizedItems,
    total,
    coupon: coupon && coupon.remise > 0 ? coupon : null,
    livraison: livraison && livraison.frais > 0 ? livraison : null,
    client,
    clientKey: client?.key || 'inconnu',
    sellerKey,
    buyerLat: location?.lat ?? null,
    buyerLng: location?.lng ?? null,
    buyerLocationAt: location?.at ?? null,
    deliveryCode: genCode(),
    pickupCode: null,
    courseId: null,
    created_at: now,
    history: [
      { at: now, label: 'Commande validée. Code de livraison généré.' },
      ...(coupon && coupon.remise > 0 ? [{ at: now, label: `Code promo ${coupon.code} appliqué (-${coupon.remise} FCFA).` }] : []),
      ...(livraison && livraison.frais > 0 ? [{ at: now, label: `Livraison ${livraison.ville} : +${livraison.frais} FCFA.` }] : []),
    ],
  };
  await decrementStockFromOrders(items);
  orders.unshift(order);
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return order;
}

async function ownersMap() {
  try {
    return JSON.parse(await AsyncStorage.getItem('afrimarket_boutique_owners')) || {};
  } catch { return {}; }
}

export async function getOrdersFor(user) {
  const orders = await getAllOrders();
  if (!user) return [];
  const key = userKey(user);
  if (user.role === 'Vendeur') return filterSellerOrders(orders, key, user);
  return orders.filter((o) => o.clientKey === key);
}

async function sellerProductIds(sellerKey, user) {
  const ids = new Set();
  try {
    const boutiques = JSON.parse(await AsyncStorage.getItem('afrimarket_boutiques')) || [];
    const owners = JSON.parse(await AsyncStorage.getItem('afrimarket_boutique_owners')) || {};
    const ownSlugs = boutiques
      .filter((b) => owners[b.slug || b.nom] === sellerKey)
      .map((b) => b.slug || b.nom);
    const legacySlug = user?.name
      ? user.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : null;
    const slugs = new Set(ownSlugs);
    if (legacySlug) {
      boutiques.forEach((b) => { if ((b.slug || b.nom) === legacySlug) slugs.add(b.slug || b.nom); });
    }
    for (const slug of slugs) {
      const produits = JSON.parse(await AsyncStorage.getItem('afrimarket_produits_' + slug)) || [];
      produits.forEach((p) => ids.add(String(p.id)));
    }
  } catch {}
  return ids;
}

async function filterSellerOrders(orders, key, user) {
  const knownIds = await sellerProductIds(key, user);
  if (!knownIds.size) return [];
  return orders.filter((o) => (o.items || []).some((it) => knownIds.has(String(it.id))));
}

export async function getOrderById(id) {
  const orders = await getAllOrders();
  return orders.find((o) => o.id === id) || null;
}

export async function patchOrder(id, patch) {
  const orders = await getAllOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...patch };
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return orders[idx];
}

export async function markOrderCourseComplete(orderId, courseId) {
  const order = await getOrderById(orderId);
  if (!order) return null;
  const now = new Date().toISOString();
  return patchOrder(orderId, {
    status: 'livree',
    courseId,
    history: [...(order.history || []), { at: now, label: 'Commande livrée — code validé.' }],
  });
}

export async function linkOrderToCourse(orderId, courseId, pickupCode) {
  const order = await getOrderById(orderId);
  if (!order) return null;
  const now = new Date().toISOString();
  return patchOrder(orderId, {
    courseId,
    pickupCode,
    history: [...(order.history || []), { at: now, label: 'Boutique créée une course de livraison.' }],
  });
}