import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllAccounts, deleteAccountRecord, setAccountClosed, setAccountOpen,
  removeDossierByKey, userKey,
} from './auth';
import { pushNotification } from './notifications';
import { deleteBoutiquesByOwner } from './boutique';
import fid from './fid';

const INFOS_KEY = 'afrimarket_infos_plataforma';
const MODERATION_KEY = 'afrimarket_moderation_log';
const FLAGS_KEY = 'afrimarket_compte_flags';
const FEATURED_KEY = 'afrimarket_featured';
const REPORTS_KEY = 'afrimarket_product_reports';

const slugifyLocal = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const dayStr = () => new Date().toISOString().slice(0, 10);

export const SEVERITIES = [
  { key: 'info', label: 'Info' },
  { key: 'avertissement', label: 'Avertissement' },
  { key: 'suspension', label: 'Suspension' },
  { key: 'fermeture', label: 'Coup de semonce' },
];

const SEVERITY_LABEL = {
  info: 'Avertissement léger',
  avertissement: 'Avertissement',
  suspension: 'Suspension envisagée',
  fermeture: 'Fermeture envisagée',
};

/* ─── Informations plateforme (gérées par l'admin) ─── */
export async function getAdminInfos() {
  try { return JSON.parse(await AsyncStorage.getItem(INFOS_KEY)) || []; } catch { return []; }
}

export async function saveAdminInfos(list) {
  await AsyncStorage.setItem(INFOS_KEY, JSON.stringify((Array.isArray(list) ? list : [])));
  return list;
}

/* Compte de règlement USSD des livreurs (ex: 06181574) */
export async function getSettlementAccount() {
  const infos = await getAdminInfos();
  const hit = infos.find((i) => /r[eé]glement|compte du|compte de|ussd|paiement des d/i.test(i.titre || ''));
  const digits = (hit?.valeur || '').replace(/[^0-9]/g, '');
  return digits.length >= 5 ? digits : '06181574';
}

/* ─── Journal de modération produits ─── */
export async function getModerationLog() {
  try { return JSON.parse(await AsyncStorage.getItem(MODERATION_KEY)) || []; } catch { return []; }
}

export async function logModeration(entry) {
  const list = await getModerationLog();
  list.unshift({
    id: fid('m_'),
    ...entry,
    at: new Date().toISOString(),
  });
  await AsyncStorage.setItem(MODERATION_KEY, JSON.stringify(list));
  return list;
}

/* ─── Signalements de comptes ─── */
export async function getAccountFlags() {
  try { return JSON.parse(await AsyncStorage.getItem(FLAGS_KEY)) || []; } catch { return []; }
}

export async function getFlagsForUser(key) {
  return (await getAccountFlags()).filter((f) => f.key === key);
}

export async function addFlag({ key, name, phone, role, severity, reason, adminName }) {
  const list = await getAccountFlags();
  const activeIdx = list.findIndex((f) => f.key === key && f.status === 'actif');
  const now = new Date().toISOString();
  const flag = {
    id: fid('fl_'),
    key,
    name: name || '',
    phone: phone || null,
    role: role || '',
    severity: severity || 'avertissement',
    reason: String(reason || '').trim(),
    by: adminName || 'Administrateur',
    status: 'actif',
    at: now,
  };
  if (activeIdx !== -1) {
    list[activeIdx] = { ...list[activeIdx], reason: flag.reason, severity: flag.severity, by: flag.by, at: now };
  } else {
    list.unshift(flag);
  }
  await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(list));
  await notifyFlag(key, flag);
  return flag;
}

export async function notifyFlag(key, flag) {
  const label = SEVERITY_LABEL[flag?.severity] || 'Signalement';
  await pushNotification(key, {
    title: '🛡️ Compte signalé',
    body: `${label}${flag?.reason ? ' — ' + flag.reason : ''}. Une récidive peut conduire à la suspension ou à la fermeture de votre compte (art. 8 du contrat de partenariat).`,
    type: 'alerte',
  });
  return true;
}

export async function liftFlag(id, reason) {
  const list = await getAccountFlags();
  const idx = list.findIndex((f) => f.id === id);
  if (idx === -1) return { ok: false, error: 'Signalement introuvable' };
  const flag = list[idx];
  flag.status = 'leve';
  flag.liftedAt = new Date().toISOString();
  flag.liftReason = reason || '';
  await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(list));
  await pushNotification(flag.key, {
    title: '✅ Signalement levé',
    body: 'Votre signalement a été levé par la plateforme. Merci de rester conforme aux règles.',
    type: 'alerte',
  });
  return { ok: true, flag };
}

export async function closeFlaggedAccount(id, reason) {
  const list = await getAccountFlags();
  const idx = list.findIndex((f) => f.id === id);
  if (idx === -1) return { ok: false, error: 'Signalement introuvable' };
  const flag = list[idx];
  flag.status = 'ferme';
  flag.closedAt = new Date().toISOString();
  flag.closureReason = reason || '';
  await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(list));
  await setAccountClosed(flag.key, reason);
  await pushNotification(flag.key, {
    title: '🛑 Compte fermé',
    body: `Votre compte a été fermé par la plateforme${reason ? ' — Motif : ' + reason : ''}. Contactez le support si vous estimez cette décision injustifiée.`,
    type: 'alerte',
  });
  return { ok: true, flag };
}

export async function reopenFlaggedAccount(id) {
  const list = await getAccountFlags();
  const idx = list.findIndex((f) => f.id === id);
  if (idx === -1) return { ok: false, error: 'Signalement introuvable' };
  const flag = list[idx];
  flag.status = 'leve';
  delete flag.closedAt;
  flag.liftedAt = new Date().toISOString();
  flag.liftReason = 'Compte rouvert';
  await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(list));
  await setAccountOpen(flag.key);
  await pushNotification(flag.key, {
    title: '🔓 Compte rouvert',
    body: 'Votre compte a été rouvert par la plateforme. Merci de rester conforme aux règles.',
    type: 'alerte',
  });
  return { ok: true, flag };
}

/* ─── Suppression complète d'un compte ─── */
async function wipeCompteData(key) {
  try { await AsyncStorage.removeItem('afrimarket_notifications_' + key); } catch {}
  try { await AsyncStorage.removeItem('afrimarket_dues_' + key); } catch {}
  try { await AsyncStorage.removeItem('afrimarket_settlement_approved_' + key); } catch {}
  try {
    const list = JSON.parse(await AsyncStorage.getItem('afrimarket_settlements')) || [];
    await AsyncStorage.setItem('afrimarket_settlements', JSON.stringify(list.filter((s) => s.key !== key)));
  } catch {}
  await removeDossierByKey(key);
}

export async function deleteAccountByKey(key, adminKey) {
  if (userKey({ name: adminKey }) === key || adminKey === key) {
    return { ok: false, error: 'Vous ne pouvez pas supprimer votre propre compte.' };
  }
  if (!(await deleteAccountRecord(key))) {
    return { ok: false, error: 'Compte introuvable.' };
  }
  await deleteBoutiquesByOwner(key);
  await wipeCompteData(key);
  try {
    const flags = await getAccountFlags();
    await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(flags.filter((f) => f.key !== key)));
  } catch {}
  return { ok: true };
}

export async function getAccountsWithFlags() {
  const [accounts, flags] = await Promise.all([getAllAccounts(), getAccountFlags()]);
  return accounts.map((a) => ({
    ...a,
    flags: flags.filter((f) => f.key === a.key),
    activeFlag: flags.find((f) => f.key === a.key && f.status === 'actif') || null,
    closedFlag: flags.find((f) => f.key === a.key && f.status === 'ferme') || null,
  }));
}

/* Noms/boutiques possédés par un vendeur (pour lister ses produits) */
export async function getSellerBoutiqueNames(ownerKey) {
  const names = new Set();
  try {
    const owners = JSON.parse(await AsyncStorage.getItem('afrimarket_boutique_owners')) || {};
    const slugs = Object.keys(owners).filter((s) => owners[s] === ownerKey);
    slugs.forEach((s) => {
      names.add(s);
      names.add(s.replace(/-/g, ' '));
    });
    const boutiques = JSON.parse(await AsyncStorage.getItem('afrimarket_boutiques')) || [];
    boutiques
      .filter((b) => slugs.includes(b.slug || b.nom))
      .forEach((b) => { if (b.nom) names.add(b.nom); if (b.name) names.add(b.name); });
  } catch {}
  return [...names];
}

/* ─── Diffusion (broadcast) ─── */
export async function broadcastNotification({ role, title, body }) {
  const accounts = await getAllAccounts();
  const roles = role === 'Tous' ? null : [role];
  const targets = accounts.filter((a) => a.key && (!roles || roles.includes(a.role)));
  for (const a of targets) {
    try {
      await pushNotification(a.key, { title, body, type: 'info' });
    } catch {}
  }
  return { count: targets.length };
}

/* ─── Boutiques / produits en avant ─── */
export async function getFeatured() {
  try {
    const d = JSON.parse(await AsyncStorage.getItem(FEATURED_KEY)) || {};
    return {
      boutiques: Array.isArray(d.boutiques) ? d.boutiques : [],
      produits: Array.isArray(d.produits) ? d.produits : [],
    };
  } catch {
    return { boutiques: [], produits: [] };
  }
}

export async function toggleFeaturedBoutique(slug) {
  const f = await getFeatured();
  const key = slugifyLocal(slug);
  f.boutiques = f.boutiques.includes(key)
    ? f.boutiques.filter((s) => s !== key)
    : [...f.boutiques, key];
  await AsyncStorage.setItem(FEATURED_KEY, JSON.stringify(f));
  return f;
}

export async function toggleFeaturedProduct(id) {
  const f = await getFeatured();
  const key = String(id);
  f.produits = f.produits.includes(key)
    ? f.produits.filter((x) => x !== key)
    : [...f.produits, key];
  await AsyncStorage.setItem(FEATURED_KEY, JSON.stringify(f));
  return f;
}

export async function getBoutiquesForAdmin() {
  const [f, raw] = await Promise.all([
    getFeatured(),
    AsyncStorage.getItem('afrimarket_boutiques')
      .then((r) => { try { return JSON.parse(r) || []; } catch { return []; } }),
  ]);
  return raw.map((b) => ({
    slug: b.slug || slugifyLocal(b.nom || b.name || ''),
    nom: b.nom || b.name || 'Boutique',
    ville: b.ville || b.location || '',
    featured: f.boutiques.includes(b.slug) || f.boutiques.includes(slugifyLocal(b.nom || b.name || '')),
  }));
}

/* ─── Signalements de produits (par les clients) ─── */
export async function getProductReports() {
  try {
    const list = JSON.parse(await AsyncStorage.getItem(REPORTS_KEY)) || [];
    return list.sort((a, b) => (a.at < b.at ? 1 : -1));
  } catch {
    return [];
  }
}

export async function sendProductReport({ productId, title, img, motif, reporterKey, reporterName, ownerKey }) {
  const list = await getProductReports();
  const report = {
    id: fid('rp_'),
    productId: String(productId),
    title: title || 'Produit',
    img: img || null,
    motif: String(motif || '').trim(),
    reporterKey: reporterKey || null,
    reporterName: reporterName || 'Client',
    ownerKey: ownerKey || null,
    status: 'nouveau',
    at: new Date().toISOString(),
  };
  list.unshift(report);
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(list));
  await pushNotification('admin', {
    title: '🚨 Produit signalé',
    body: `« ${report.title} » signalé par ${report.reporterName}. Consultez la console admin → Signalements.`,
    type: 'moderation',
  });
  return report;
}

export async function setProductReportStatus(id, status) {
  const list = await getProductReports();
  const idx = list.findIndex((r) => String(r.id) === String(id));
  if (idx !== -1) {
    list[idx].status = status;
    await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(list));
  }
  return list;
}

/* ─── Vue globale des dûs livreurs ─── */
export async function getAllDuesOverview() {
  const accounts = await getAllAccounts();
  const today = dayStr();
  const out = [];
  for (const a of accounts) {
    if (a.role !== 'Livreur' || !a.key) continue;
    let d = {};
    try { d = JSON.parse(await AsyncStorage.getItem('afrimarket_dues_' + a.key)) || {}; } catch { d = {}; }
    const montant = Number(d.montant || 0);
    const jour = d.jour || null;
    const regle = d.regle === true;
    const overdue = montant > 0 && jour && jour !== today;
    out.push({
      key: a.key,
      name: a.name || a.phone || a.key,
      phone: a.phone || '',
      montant,
      jour,
      regle,
      overdue,
      compteFerme: a.accountStatus === 'ferme',
      historique: Array.isArray(d.historique) ? d.historique : [],
    });
  }
  return out.sort((x, y) => y.montant - x.montant);
}

/* ─── Rapports / statistiques ─── */
export async function getAdminReport() {
  let orders = [], paiements = [], courses = [];
  try { orders = JSON.parse(await AsyncStorage.getItem('afrimarket_commandes')) || []; } catch {}
  try { paiements = JSON.parse(await AsyncStorage.getItem('afrimarket_paiements')) || []; } catch {}
  try { courses = JSON.parse(await AsyncStorage.getItem('afrimarket_courses')) || []; } catch {}

  const paid = paiements.filter((p) => p.status === 'paye');
  const totalVentes = paid.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const totalFrais = paid.reduce((s, p) => s + (Number(p.frais) || 0), 0);
  const totalCommissions = paid.reduce((s, p) => s + (Number(p.commission) || 0), 0);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const k = d.toISOString().slice(0, 10);
    days.push({ key: k, label: k.slice(5), count: 0, total: 0 });
  }
  for (const p of paid) {
    const k = (p.createdAt || '').slice(0, 10);
    const day = days.find((x) => x.key === k);
    if (day) { day.count++; day.total += Number(p.montant) || 0; }
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const productMap = {};
  for (const o of orders) {
    for (const it of (o.items || o.products || [])) {
      const pid = it.productId ?? it.id ?? null;
      const k = String(pid || it.title || 'inconnu');
      productMap[k] = productMap[k] || {
        id: pid, title: it.title || it.name || 'Produit', qty: 0, total: 0,
        img: it.img || it.image || null,
      };
      const q = Number(it.qty || it.quantity || 1);
      productMap[k].qty += q;
      productMap[k].total += (Number(it.price || it.prix || 0) * q);
    }
  }
  const topProduits = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const sellerMap = {};
  for (const p of paid) {
    const sKey = p.sellerKey || 'inconnu';
    sellerMap[sKey] = sellerMap[sKey] || { key: sKey, total: 0, count: 0 };
    sellerMap[sKey].total += Number(p.montant) || 0;
    sellerMap[sKey].count++;
  }
  const topVendeurs = Object.values(sellerMap).sort((a, b) => b.total - a.total).slice(0, 5);

  const opMap = {};
  for (const p of paid) {
    const k = p.operator || p.operatorKey || 'Autre';
    opMap[k] = (opMap[k] || 0) + 1;
  }
  const operators = Object.entries(opMap).sort((a, b) => b[1] - a[1]);

  const done = courses.filter((c) => c.status === 'terminee').length;
  const qrLi = courses.filter((c) => c.status === 'livree').length;

  return {
    ordersCount: orders.length,
    paidCount: paid.length,
    totalVentes, totalFrais, totalCommissions,
    days, maxDay, topProduits, topVendeurs, operators,
    coursesDone: done, coursesLivrees: qrLi,
  };
}

/* ─── Export / réinitialisation de démo ─── */
export async function exportAllData() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('afrimarket_'));
  const pairs = await AsyncStorage.multiGet(keys);
  const obj = {};
  for (const [k, v] of pairs) {
    try { obj[k] = JSON.parse(v); } catch { obj[k] = v; }
  }
  return { json: JSON.stringify(obj, null, 2), count: keys.length };
}

export async function resetDemoData() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('afrimarket_'));
  await AsyncStorage.multiRemove(keys);
  return keys.length;
}