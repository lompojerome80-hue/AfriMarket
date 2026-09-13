import AsyncStorage from '@react-native-async-storage/async-storage';
import fid from './fid';

const COUPONS_KEY = 'afrimarket_coupons';

export async function getCoupons() {
  try { return JSON.parse(await AsyncStorage.getItem(COUPONS_KEY)) || []; } catch { return []; }
}

export async function createCoupon({ code, type, value, maxUses }) {
  const list = await getCoupons();
  const cleanCode = String(code || '').trim().toUpperCase().replace(/\s+/g, '-');
  const nbValue = Number(value);
  if (!cleanCode) return { ok: false, error: 'Code manquant.' };
  if (type !== 'percent' && type !== 'amount') return { ok: false, error: 'Type invalide (pourcentage ou montant).' };
  if (!(nbValue > 0)) return { ok: false, error: 'Valeur de remise invalide.' };
  if (cleanCode.includes('_')) return { ok: false, error: 'Le code ne peut pas contenir de tiret bas.' };
  if (list.some((c) => c.code === cleanCode)) return { ok: false, error: `Le code ${cleanCode} existe déjà.` };
  const coupon = {
    id: fid('cp_'),
    code: cleanCode,
    type,
    value: type === 'percent' ? Math.min(100, nbValue) : Math.round(nbValue),
    maxUses: Math.max(1, Number(maxUses) || 1),
    uses: 0,
    actif: true,
    at: new Date().toISOString(),
  };
  list.unshift(coupon);
  await AsyncStorage.setItem(COUPONS_KEY, JSON.stringify(list));
  return { ok: true, coupon };
}

export async function toggleCoupon(code) {
  const list = await getCoupons();
  const c = list.find((x) => x.code === code);
  if (c) {
    c.actif = !c.actif;
    await AsyncStorage.setItem(COUPONS_KEY, JSON.stringify(list));
  }
  return list;
}

export async function deleteCoupon(code) {
  const list = (await getCoupons()).filter((x) => x.code !== code);
  await AsyncStorage.setItem(COUPONS_KEY, JSON.stringify(list));
  return list;
}

export async function applyCoupon(code, total) {
  const clean = String(code || '').trim().toUpperCase();
  const list = await getCoupons();
  const c = list.find((x) => x.code === clean);
  if (!c) return { ok: false, error: 'Code promo invalide.' };
  if (!c.actif) return { ok: false, error: 'Ce code est actuellement désactivé.' };
  if ((c.uses || 0) >= c.maxUses) {
    return { ok: false, error: `Ce code a atteint sa limite (${c.maxUses} utilisations).` };
  }
  let remise = c.type === 'percent'
    ? Math.round((Number(total) * Number(c.value)) / 100)
    : Math.min(Number(c.value), Number(total));
  remise = Math.max(0, Math.min(remise, Number(total)));
  if (remise <= 0) return { ok: false, error: 'Ce code ne produit aucune remise sur ce panier.' };
  return { ok: true, code: c.code, remise };
}

export async function markCouponUsed(code) {
  const list = await getCoupons();
  const c = list.find((x) => x.code === code);
  if (c) {
    c.uses = (c.uses || 0) + 1;
    await AsyncStorage.setItem(COUPONS_KEY, JSON.stringify(list));
  }
}