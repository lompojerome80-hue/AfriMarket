import AsyncStorage from '@react-native-async-storage/async-storage';
import { userKey } from './auth';
import { pushNotification } from './notifications';
import { maybeSendContract } from './contract';
import { getOrderById } from './orders';
import { restoreStockFromOrder } from './products';
import fid, { randCode } from './fid';

const PAYMENTS_KEY = 'afrimarket_paiements';

export const PAYPROVIDERS = [
  { key: 'orange', brand: 'Orange Money', feePct: 1, icon: '🟠', logo: require('../../assets/payments/orange.png') },
  { key: 'mtn', brand: 'MTN MoMo', feePct: 1.5, icon: '🟡', logo: require('../../assets/payments/mtn.png') },
  { key: 'wave', brand: 'Wave', feePct: 1, icon: '🔵', logo: require('../../assets/payments/wave.png') },
  { key: 'moov', brand: 'Moov Money', feePct: 1.5, icon: '🔴', logo: require('../../assets/payments/moov.png') },
];

export function getProvider(key) {
  return PAYPROVIDERS.find((p) => p.key === key) || PAYPROVIDERS[0];
}

const PROVIDER_SETTINGS_KEY = 'afrimarket_provider_settings';

export async function getProviderSettings() {
  try { return JSON.parse(await AsyncStorage.getItem(PROVIDER_SETTINGS_KEY)) || {}; } catch { return {}; }
}

export async function saveProviderSettings(map) {
  await AsyncStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(map || {}));
  return map;
}

export async function getActiveProviders() {
  const s = await getProviderSettings();
  const list = PAYPROVIDERS
    .map((p) => ({ ...p, feePct: (s[p.key] && s[p.key].feePct != null) ? Number(s[p.key].feePct) : p.feePct }))
    .filter((p) => (s[p.key] ? s[p.key].actif !== false : true));
  return list.length ? list : PAYPROVIDERS;
}

export async function providerFeePct(key) {
  const [s, p] = [await getProviderSettings(), getProvider(key)];
  return (s[key] && s[key].feePct != null) ? Number(s[key].feePct) : p.feePct;
}

export async function getProviderConfigForAdmin() {
  const s = await getProviderSettings();
  return PAYPROVIDERS.map((p) => ({
    key: p.key,
    brand: p.brand,
    icon: p.icon,
    baseFeePct: p.feePct,
    feePct: (s[p.key] && s[p.key].feePct != null) ? Number(s[p.key].feePct) : p.feePct,
    actif: (s[p.key] ? s[p.key].actif !== false : true),
  }));
}

export async function computeFees(montant, providerKey) {
  const feePct = await providerFeePct(providerKey);
  const frais = Math.round((montant * feePct) / 100);
  return { frais, total: montant + frais };
}

async function getPayments() {
  try {
    return JSON.parse(await AsyncStorage.getItem(PAYMENTS_KEY)) || [];
  } catch {
    return [];
  }
}

async function savePayments(list) {
  await AsyncStorage.setItem(PAYMENTS_KEY, JSON.stringify(list));
}

export function makeRef() {
  return 'PAY-' + fid('');
}

const COMMISSION_KEY = 'afrimarket_commission_settings';
const COMMISSIONS_KEY = 'afrimarket_commissions';

export async function getCommissionSettings() {
  try {
    return JSON.parse(await AsyncStorage.getItem(COMMISSION_KEY)) || { seuil: 0, taux: 0, forfait: 0 };
  } catch {
    return { seuil: 0, taux: 0, forfait: 0 };
  }
}

export async function setCommissionSettings(s) {
  const settings = {
    seuil: Math.max(0, Number(s && s.seuil) || 0),
    taux: Math.max(0, Number(s && s.taux) || 0),
    forfait: Math.max(0, Number(s && s.forfait) || 0),
  };
  await AsyncStorage.setItem(COMMISSION_KEY, JSON.stringify(settings));
  return settings;
}

export function computeCommission({ montant, settings }) {
  const se = settings || { seuil: 0, taux: 0, forfait: 0 };
  if (!(se.seuil > 0) || !(se.taux > 0 || se.forfait > 0)) return 0;
  const parTaux = Math.round((montant * (se.taux || 0)) / 100);
  return se.forfait > 0 ? Math.max(parTaux, se.forfait) : parTaux;
}

export async function getCommissions() {
  try {
    return JSON.parse(await AsyncStorage.getItem(COMMISSIONS_KEY)) || [];
  } catch {
    return [];
  }
}

async function addCommissionEntry(paiement) {
  const list = await getCommissions();
  list.push({
    id: paiement.id,
    orderId: paiement.orderId,
    sellerKey: paiement.sellerKey,
    montant: paiement.montant,
    commission: paiement.commission || 0,
    createdAt: paiement.createdAt,
  });
  await AsyncStorage.setItem(COMMISSIONS_KEY, JSON.stringify(list));
}

export async function getCommissionsCollectees() {
  const list = await getCommissions();
  return {
    total: list.reduce((s, c) => s + (c.commission || 0), 0),
    count: list.length,
    entries: list,
  };
}

export async function getCommissionsForSeller(sellerKeyValue) {
  const list = await getCommissions();
  const mine = list.filter((c) => c.sellerKey === sellerKeyValue);
  return { total: mine.reduce((s, c) => s + (c.commission || 0), 0), count: mine.length };
}

function orderSellerKey(order) {
  const first = order?.items?.[0];
  return first?.ownerKey || order?.sellerKey || 'vendeur';
}

export async function createPaiement({ order, providerKey, phone }) {
  const provider = getProvider(providerKey);
  const montant = order?.total || 0;
  const { frais, total } = await computeFees(montant, providerKey);
  const buyerKeyValue = userKey(order?.client || {});
  const sellerKeyValue = orderSellerKey(order);
  const settings = await getCommissionSettings();
  const list0 = await getPayments();
  const paidCount = list0.filter((p) => p.sellerKey === sellerKeyValue && p.status === 'paye').length;
  const commission =
    settings.seuil > 0 && paidCount + 1 >= settings.seuil
      ? computeCommission({ montant, settings })
      : 0;
  const paiement = {
    id: makeRef(),
    orderId: order.id,
    buyerKey: buyerKeyValue,
    sellerKey: sellerKeyValue,
    operator: provider.brand,
    operatorKey: providerKey,
    phone: String(phone || '').replace(/\s+/g, ''),
    montant,
    frais,
    total,
    commission,
    status: 'paye',
    reference: 'REF-' + randCode(8),
    pushId: null,
    dispute: null,
    createdAt: new Date().toISOString(),
    history: [{ at: new Date().toISOString(), ev: 'payé — fonds sécurisés (escrow)' }],
  };

  const list = await getPayments();
  list.push(paiement);
  await savePayments(list);
  await addFraisEntry(paiement);
  if (commission > 0) await addCommissionEntry(paiement);
  await applyRevenusPaiement(paiement);

  await pushNotification(buyerKeyValue, {
    title: 'Paiement reçu',
    body: `${provider.brand} · ${montant} FCFA + ${frais} de frais. ` +
      `Réf ${paiement.reference}. Fonds sécurisés jusqu'à confirmation.`,
    type: 'paiement',
  });
  await pushNotification(sellerKeyValue, {
    title: 'Commande payée',
    body: `Commande ${order.id} payée (${total} FCFA). Fonds en escrow.`,
    type: 'commande',
  });

  await maybeSendContract(sellerKeyValue, paidCount + 1);

  return paiement;
}

export async function getPaiementForOrder(orderId) {
  const list = await getPayments();
  return list.find((p) => p.orderId === orderId) || null;
}

export async function getAllPaiements() {
  return (await getPayments()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function confirmReception(orderId) {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: 'Commande introuvable.' };
  if (order.status !== 'livree') {
    return { ok: false, error: 'La commande doit être livrée avant de pouvoir confirmer la réception.' };
  }
  const list = await getPayments();
  const p = list.find((x) => x.orderId === orderId);
  if (!p || p.status !== 'paye') return { ok: false, error: 'Fonds indisponibles' };
  p.status = 'confirme';
  p.history.push({ at: new Date().toISOString(), ev: 'réception confirmée — fonds libérés au vendeur' });
  await savePayments(list);
  await applyRevenusPaiement(p);
  await pushNotification(p.sellerKey, {
    title: 'Fonds libérés',
    body: `Le client a confirmé la réception de la commande ${orderId}. Fonds disponibles.`,
    type: 'escrow',
  });
  return { ok: true, paiement: p };
}

export async function openDispute(orderId, byKey, reason) {
  const list = await getPayments();
  const p = list.find((x) => x.orderId === orderId);
  if (!p) return { ok: false, error: 'Paiement introuvable' };
  if (p.status === 'dispute') return { ok: false, error: 'Litige déjà ouvert' };
  p.status = 'dispute';
  p.dispute = { by: byKey, reason: reason || '', at: new Date().toISOString() };
  p.history.push({ at: new Date().toISOString(), ev: 'litige ouvert — fonds bloqués' });
  await savePayments(list);
  await pushNotification('admin', {
    title: 'Litige ouvert',
    body: `Litige sur ${orderId} (${reason || 'aucun motif'}). Fonds bloqués.`,
    type: 'litige',
  });
  return { ok: true, paiement: p };
}

export async function resolveDispute(orderId, action) {
  const list = await getPayments();
  const p = list.find((x) => x.orderId === orderId);
  if (!p || p.status !== 'dispute') return { ok: false, error: 'Aucun litige actif' };
  p.status = action === 'rembourse' ? 'rembourse' : 'libere_admin';
  p.history.push({
    at: new Date().toISOString(),
    ev: action === 'rembourse' ? 'litige résolu — remboursement acheteur' : 'litige résolu — fonds libérés au vendeur',
  });
  await savePayments(list);
  await applyRevenusPaiement(p);
  await pushNotification(p.buyerKey, {
    title: 'Litige résolu',
    body: action === 'rembourse'
      ? `Commande ${orderId} remboursée. ${p.total} FCFA restitués.`
      : `Litige ${orderId} résolu en faveur du vendeur.`,
    type: 'litige',
  });
  return { ok: true, paiement: p };
}

export async function adminResolvePayment(orderId, action) {
  const list = await getPayments();
  const p = list.find((x) => x.orderId === orderId);
  if (!p) return { ok: false, error: 'Paiement introuvable' };
  if (p.status !== 'paye') {
    return { ok: false, error: `Statut actuel : « ${p.status} ». L'action admin n'est possible que sur un paiement en escrow.` };
  }
  p.status = action === 'rembourse' ? 'rembourse_admin' : 'libere_admin';
  p.history.push({
    at: new Date().toISOString(),
    ev: action === 'rembourse' ? 'remboursement décidé par l\'admin' : 'fonds libérés par l\'admin',
  });
  await savePayments(list);
  if (action !== 'rembourse') await applyRevenusPaiement(p);
  if (action === 'rembourse') {
    const order = await getOrderById(orderId);
    if (order && order.items) await restoreStockFromOrder(order.items);
  }
  await pushNotification(p.buyerKey, {
    title: action === 'rembourse' ? 'Commande remboursée' : 'Commande régularisée',
    body: action === 'rembourse'
      ? `Commande ${orderId} : ${p.total} FCFA remboursés (décision de la plateforme).`
      : `Commande ${orderId} : la plateforme a libéré les fonds au vendeur.`,
    type: 'escrow',
  });
  await pushNotification(p.sellerKey, {
    title: action === 'rembourse' ? 'Vente annulée' : 'Fonds libérés',
    body: action === 'rembourse'
      ? `Commande ${orderId} annulée avec remboursement au client (décision de la plateforme).`
      : `Commande ${orderId} : fonds libérés suite à décision de la plateforme.`,
    type: 'escrow',
  });
  return { ok: true, paiement: p };
}

export async function getSellerRevenus(sellerKeyValue) {
  try {
    return JSON.parse(await AsyncStorage.getItem('afrimarket_revenus_' + sellerKeyValue)) || {
      enAttente: 0, libere: 0, rembourse: 0, total: 0,
    };
  } catch {
    return { enAttente: 0, libere: 0, rembourse: 0, total: 0 };
  }
}

const FRAIS_KEY = 'afrimarket_frais';

async function getFraisList() {
  try {
    return JSON.parse(await AsyncStorage.getItem(FRAIS_KEY)) || [];
  } catch {
    return [];
  }
}

async function addFraisEntry(paiement) {
  const list = await getFraisList();
  list.push({
    id: paiement.id,
    orderId: paiement.orderId,
    operator: paiement.operator,
    operatorKey: paiement.operatorKey,
    montant: paiement.montant,
    frais: paiement.frais,
    total: paiement.total,
    createdAt: paiement.createdAt,
  });
  await AsyncStorage.setItem(FRAIS_KEY, JSON.stringify(list));
}

export async function getFraisCollectes() {
  const list = await getFraisList();
  const parOperateur = {};
  for (const f of list) parOperateur[f.operatorKey] = (parOperateur[f.operatorKey] || 0) + (f.frais || 0);
  return {
    total: list.reduce((s, f) => s + (f.frais || 0), 0),
    totalPayes: list.reduce((s, f) => s + (f.total || 0), 0),
    totalNet: list.reduce((s, f) => s + (f.montant || 0), 0),
    count: list.length,
    entries: list,
    parOperateur: Object.entries(parOperateur).map(([key, total]) => ({ operatorKey: key, total })),
  };
}

async function addRevenu(sellerKeyValue, evolution) {
  const r = await getSellerRevenus(sellerKeyValue);
  if (evolution.enAttente) r.enAttente += evolution.enAttente;
  if (evolution.libere) r.libere += evolution.libere;
  if (evolution.rembourse) r.rembourse += evolution.rembourse;
  r.total = r.libere + r.enAttente;
  await AsyncStorage.setItem('afrimarket_revenus_' + sellerKeyValue, JSON.stringify(r));
  return r;
}

export async function applyRevenusPaiement(paiement) {
  const net = (paiement.montant || 0) - (paiement.commission || 0);
  if (paiement.status === 'paye') {
    await addRevenu(paiement.sellerKey, { enAttente: net });
  } else if (paiement.status === 'confirme' || paiement.status === 'libere_admin') {
    await addRevenu(paiement.sellerKey, { libere: net, enAttente: -net });
  } else {
    await addRevenu(paiement.sellerKey, { rembourse: net, enAttente: -net });
  }
  return getSellerRevenus(paiement.sellerKey);
}