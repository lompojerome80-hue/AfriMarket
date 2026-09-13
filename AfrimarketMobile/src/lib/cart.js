import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, userKey } from './auth';
import { getStockForItem } from './products';

const PREFIX = 'afrimarket_cart_';
const GUEST_KEY = PREFIX + 'guest';

async function resolveKey() {
  try {
    const u = await getCurrentUser();
    return u ? PREFIX + userKey(u) : GUEST_KEY;
  } catch {
    return GUEST_KEY;
  }
}

async function readCart(keyValue) {
  try { return JSON.parse(await AsyncStorage.getItem(keyValue)) || []; } catch { return []; }
}

async function adoptGuestCart(keyValue) {
  if (keyValue === GUEST_KEY) return;
  let guest = [];
  try { guest = JSON.parse(await AsyncStorage.getItem(GUEST_KEY)) || []; } catch { guest = []; }
  if (!Array.isArray(guest) || guest.length === 0) return;
  const map = {};
  for (const it of await readCart(keyValue)) map[it.id] = { ...it };
  for (const it of guest) {
    const stock = await (async () => { try { return await getStockForItem(it); } catch { return it.stock; } })();
    if (map[it.id]) {
      map[it.id].qty = Math.min((map[it.id].qty || 0) + (it.qty || 0), stock);
    } else {
      map[it.id] = { ...it, stock };
    }
  }
  await AsyncStorage.setItem(keyValue, JSON.stringify(Object.values(map)));
  await AsyncStorage.setItem(GUEST_KEY, JSON.stringify([]));
}

export async function getCart() {
  const keyValue = await resolveKey();
  await adoptGuestCart(keyValue);
  return readCart(keyValue);
}

export async function saveCart(cart) {
  await AsyncStorage.setItem(await resolveKey(), JSON.stringify(cart));
}

export async function addToCart(product, qty = 1, shopSlug = null) {
  const stock = await getStockForItem(product);
  const cart = await getCart();
  const existing = cart.find(i => i.id === product.id);
  const current = existing ? existing.qty : 0;
  if (current + qty > stock) {
    return { ok: false, message: `Stock insuffisant (${stock} dispo).`, cart };
  }
  const enriched = {
    ...product,
    shopSlug: shopSlug || product.shopSlug || product.boutique_id || null,
    ownerKey: product.ownerKey || await ownerOfSlug(shopSlug || product.shopSlug || product.boutique_id),
    boutiqueName: product.boutiqueName || product.boutique_nom || '',
    boutiqueVille: product.boutiqueVille || product.boutique_ville || '',
  };
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...enriched, qty, stock });
  }
  await saveCart(cart);
  return { ok: true, cart };
}

async function ownerOfSlug(slug) {
  if (!slug) return null;
  try {
    const owners = JSON.parse(await AsyncStorage.getItem('afrimarket_boutique_owners')) || {};
    return owners[slug] || null;
  } catch { return null; }
}

export async function removeFromCart(id) {
  const cart = (await getCart()).filter(i => i.id !== id);
  await saveCart(cart);
  return cart;
}

export async function updateQty(id, qty) {
  const cart = await getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    const stock = await getStockForItem(item);
    item.qty = Math.max(1, Math.min(qty, stock));
  }
  await saveCart(cart);
  return cart;
}

export async function clearCart() {
  await saveCart([]);
  return [];
}

export async function getCartCount() {
  const cart = await getCart();
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

export async function getCartTotal() {
  const cart = await getCart();
  return cart.reduce((sum, i) => sum + i.qty * i.price, 0);
}

export function fcfa(n) {
  return (n || 0).toLocaleString('fr-FR') + ' FCFA';
}