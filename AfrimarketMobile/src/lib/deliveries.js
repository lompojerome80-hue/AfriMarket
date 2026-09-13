import AsyncStorage from '@react-native-async-storage/async-storage';
import { userKey, isDossierVerified } from './auth';
import { patchOrder, markOrderCourseComplete, getOrderById } from './orders';
import { pushNotification } from './notifications';
import { haversineKm, deliveryPrice } from './location';
import { getSettlementAccount } from './admin';
import fid, { randCode } from './fid';

export const COMMISSION_PCT = 0.1;
export const COURSES_FREE = 10;

const COURSES_KEY = 'afrimarket_courses';
const SETTLEMENTS_KEY = 'afrimarket_settlements';
const SETTLEMENT_APPROVED = 'afrimarket_settlement_approved_';

const duesKey = (livreur) => 'afrimarket_dues_' + userKey(livreur);

function genCode(prefix) {
  return (prefix || '') + randCode(4);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function getAllCourses() {
  try { return JSON.parse(await AsyncStorage.getItem(COURSES_KEY)) || []; } catch { return []; }
}

async function saveCourses(courses) {
  await AsyncStorage.setItem(COURSES_KEY, JSON.stringify(courses));
}

/* ─── Création par le vendeur ─── */
export async function createCourse({ seller, titre, destination, prixFcfa, orderId, clientNote, sellerLocation }) {
  const courses = await getAllCourses();
  const now = new Date().toISOString();
  const sellerLat = sellerLocation?.lat ?? null;
  const sellerLng = sellerLocation?.lng ?? null;

  let fullDestination = String(destination || '').trim();
  let buyerPhone = null;
  let buyerLat = null;
  let buyerLng = null;
  let buyerName = null;
  if (orderId) {
    const order = await getOrderById(orderId);
    buyerPhone = order?.client?.phone || null;
    buyerName = order?.client?.name || null;
    buyerLat = order?.buyerLat ?? null;
    buyerLng = order?.buyerLng ?? null;
    if (buyerPhone && !fullDestination.includes(buyerPhone)) {
      fullDestination = fullDestination ? fullDestination + ' — ' + buyerPhone : 'Client : ' + buyerPhone;
    }
  }

  const distanceKm = haversineKm({ lat: sellerLat, lng: sellerLng }, { lat: buyerLat, lng: buyerLng });
  const prixAuto = deliveryPrice(distanceKm);
  const prixFinal = Math.max(0, parseInt(prixFcfa, 10) || 0) || prixAuto || 0;

  const course = {
    id: fid('csr_'),
    numero: 'LVR-' + String(Date.now()).slice(-6),
    status: 'ouverte',
    titre,
    destination: fullDestination,
    prixFcfa: prixFinal,
    prixAuto: prixAuto || null,
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
    orderId: orderId || null,
    clientNote: clientNote || '',
    sellerKey: userKey(seller),
    sellerNom: seller?.name || seller?.nom || 'Vendeur',
    sellerPhone: seller?.phone || null,
    sellerLat,
    sellerLng,
    buyerPhone,
    buyerName,
    buyerLat,
    buyerLng,
    pickupCode: genCode(),
    deliveryCode: null,
    livreurKey: null,
    livreurNom: null,
    livreurMoyen: null,
    commission: null,
    created_at: now,
    history: [],
  };
  course.history = [{ at: now, label: `Course créée. Code de récupération : ${course.pickupCode}` }];
  courses.unshift(course);
  await saveCourses(courses);

  if (orderId) {
    await patchOrder(orderId, { courseId: course.id, pickupCode: course.pickupCode });
  }
  return course;
}

/* ─── Lecture ─── */
export async function getOpenCourses() {
  return (await getAllCourses()).filter((c) => c.status === 'ouverte');
}

export async function getCoursesForLivreur(livreur) {
  const key = userKey(livreur);
  return (await getAllCourses())
    .filter((c) => c.livreurKey === key)
    .sort((a, b) => (a.status === 'livree' ? 1 : 0) - (b.status === 'livree' ? 1 : 0) || (a.created_at < b.created_at ? 1 : -1));
}

export async function getCoursesBySeller(seller) {
  const key = userKey(seller);
  return (await getAllCourses()).filter((c) => c.sellerKey === key);
}

export async function getCourseById(id) {
  return (await getAllCourses()).find((c) => c.id === id) || null;
}

async function saveCourse(course) {
  const courses = await getAllCourses();
  const idx = courses.findIndex((c) => c.id === course.id);
  if (idx === -1) return;
  courses[idx] = course;
  await saveCourses(courses);
}

/* ─── Dû quotidien ─── */
export async function getLivreurCompletedCount(livreur) {
  const key = userKey(livreur);
  return (await getAllCourses()).filter((c) => c.livreurKey === key && c.status === 'livree').length;
}
export async function getLivreurDues(livreur) {
  let data = {};
  try {
    data = JSON.parse(await AsyncStorage.getItem(duesKey(livreur))) || {};
  } catch { data = {}; }
  const montant = data.montant || 0;
  const jour = data.jour || null;
  const regle = data.regle === true;
  const blocked = montant > 0 && jour && jour !== today();
  return { montant, jour, regle, blocked, historique: data.historique || [] };
}

async function saveLivreurDues(livreur, data) {
  await AsyncStorage.setItem(duesKey(livreur), JSON.stringify(data));
}

async function addCommission(livreur, montant) {
  const dues = await getLivreurDues(livreur);
  const next = {
    montant: (dues.montant || 0) + montant,
    jour: today(),
    regle: false,
    historique: dues.historique,
  };
  await saveLivreurDues(livreur, next);
  return next;
}

export async function settleDues(livreur) {
  const dues = await getLivreurDues(livreur);
  await saveLivreurDues(livreur, {
    montant: 0,
    jour: today(),
    regle: true,
    historique: [
      ...dues.historique,
      { at: new Date().toISOString(), montant: dues.montant, jour: dues.jour || today() },
    ],
  });
  return getLivreurDues(livreur);
}

/* ─── Règlement en attente de confirmation admin ─── */
export async function requestSettlement(livreur, opts) {
  const dues = await getLivreurDues(livreur);
  if (!dues.montant) return { ok: false, error: 'rien', message: 'Aucun dû à régler.' };
  if (dues.blocked) return { ok: false, error: 'bloque', message: 'Dû bloqué : le règlement sera traité par l’admin.' };
  const key = userKey(livreur);
  const list = await getPendingSettlements();
  if (list.some((s) => s.key === key)) {
    return { ok: false, error: 'attente', message: 'Règlement déjà soumis, en attente de confirmation.' };
  }
  list.push({
    key,
    nom: livreur.name || 'Livreur',
    montant: dues.montant,
    at: new Date().toISOString(),
    status: 'en_attente',
    moyen: opts?.moyen || 'USSD *144#',
    proof: opts?.proof || null,
  });
  await AsyncStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(list));
  await pushNotification('admin', {
    title: 'Règlement à confirmer',
    body: `${livreur.name || 'Livreur'} dit avoir réglé ${dues.montant} FCFA — vérifier la preuve envoyée.`,
    type: 'commande',
  });
  return { ok: true, montant: dues.montant };
}

export async function getPendingSettlements() {
  try { return JSON.parse(await AsyncStorage.getItem(SETTLEMENTS_KEY)) || []; } catch { return []; }
}

export async function approveSettlement(key) {
  await settleDues({ name: key });
  const list = await getPendingSettlements();
  const idx = list.findIndex((s) => s.key === key && s.status === 'en_attente');
  if (idx !== -1) list[idx].status = 'approuve';
  await AsyncStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(list));
  await pushNotification(key, {
    title: 'Règlement confirmé',
    body: 'Votre dû est enregistré comme réglé. Merci !',
    type: 'commande',
  });
  await AsyncStorage.setItem(SETTLEMENT_APPROVED + key, new Date().toISOString());
  return true;
}

export async function rejectSettlement(key) {
  const list = await getPendingSettlements();
  const idx = list.findIndex((s) => s.key === key && s.status === 'en_attente');
  if (idx !== -1) list[idx].status = 'rejete';
  await AsyncStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(list));
  const acc = await getSettlementAccount();
  await pushNotification(key, {
    title: 'Règlement rejeté',
    body: `Votre preuve de paiement n’a pas pu être vérifiée. Vérifiez le code *144*10*${acc}*Montant# et renvoyez une capture d’écran.`,
    type: 'commande',
  });
  return true;
}

export async function hasApprovedSettlement(key) {
  try { return !!(await AsyncStorage.getItem(SETTLEMENT_APPROVED + key)); } catch { return false; }
}

/* ─── Cycle livreur ─── */
export async function acceptCourse(courseId, livreur) {
  if (!isDossierVerified(livreur)) {
    return { ok: false, error: 'dossier', message: 'Votre dossier livreur doit être validé par un administrateur avant d’accepter une course.' };
  }
  const dues = await getLivreurDues(livreur);
  if (dues.blocked) {
    return { ok: false, error: 'bloque', message: 'Compte bloqué : réglez votre dû pour continuer.' };
  }
  const course = await getCourseById(courseId);
  if (!course || course.status !== 'ouverte') {
    return { ok: false, error: 'prise', message: 'Cette course n’est plus disponible.' };
  }
  const now = new Date().toISOString();
  const deliveryCode = genCode();
  course.status = 'acceptee';
  course.livreurKey = userKey(livreur);
  course.livreurNom = livreur.name || 'Livreur';
  course.livreurMoyen = livreur.courierDossier?.moyen || null;
  course.deliveryCode = deliveryCode;
  course.history = [...course.history, { at: now, label: 'Course acceptée. Code de livraison généré.' }];
  await saveCourse(course);

  if (course.orderId) {
    await patchOrder(course.orderId, { deliveryCode });
  }
  return { ok: true, course };
}

export async function pickupCourse(courseId, code, livreur) {
  const dues = await getLivreurDues(livreur);
  if (dues.blocked) {
    return { ok: false, error: 'bloque', message: 'Compte bloqué : réglez votre dû pour continuer.' };
  }
  const course = await getCourseById(courseId);
  if (!course || course.livreurKey !== userKey(livreur)) {
    return { ok: false, error: 'course', message: 'Course introuvable.' };
  }
  if (String(code).trim() !== String(course.pickupCode)) {
    return { ok: false, error: 'code', message: 'Code de récupération incorrect.' };
  }
  if (course.status !== 'acceptee') {
    return { ok: false, error: 'etat', message: 'Cette course n’est pas au bon état.' };
  }
  const now = new Date().toISOString();
  course.status = 'recupere';
  course.history = [...course.history, { at: now, label: 'Colis récupéré — code validé.' }];
  await saveCourse(course);
  return { ok: true, course };
}

export async function completeCourse(courseId, code, livreur) {
  const dues = await getLivreurDues(livreur);
  if (dues.blocked) {
    return { ok: false, error: 'bloque', message: 'Compte bloqué : réglez votre dû avant la remise.' };
  }
  const course = await getCourseById(courseId);
  if (!course || course.livreurKey !== userKey(livreur)) {
    return { ok: false, error: 'course', message: 'Course introuvable.' };
  }
  if (String(code).trim() !== String(course.deliveryCode)) {
    return { ok: false, error: 'code', message: 'Code de livraison incorrect.' };
  }
  if (course.status !== 'recupere' && course.status !== 'acceptee') {
    return { ok: false, error: 'etat', message: 'Cette course n’est pas en cours de livraison.' };
  }
  const commission = Math.round(course.prixFcfa * COMMISSION_PCT);
  const completed = (await getAllCourses()).filter((c) => c.livreurKey === userKey(livreur) && c.status === 'livree').length;
  const index = completed + 1;
  const freeCourse = index <= COURSES_FREE;
  const now = new Date().toISOString();
  course.status = 'livree';
  course.commission = commission;
  course.freeCourse = freeCourse;
  course.freeCourseIndex = index;
  course.history = [
    ...course.history,
    {
      at: now,
      label: freeCourse
        ? `Livré ! Course ${index}/${COURSES_FREE} offerte : commission ${Math.round(COMMISSION_PCT * 100)} % (${commission} FCFA) non due.`
        : `Livré ! Commission AfriMarket (${Math.round(COMMISSION_PCT * 100)} %) : ${commission} FCFA à régler avant 0h.`,
    },
  ];
  await saveCourse(course);

  if (freeCourse) {
    await pushNotification(userKey(livreur), {
      title: `🎁 Course ${index}/${COURSES_FREE} offerte`,
      body: `Cette course est offerte : aucun dû. À partir de la ${COURSES_FREE + 1}e course, la commission ${Math.round(COMMISSION_PCT * 100)} % s'activera sur votre dû.`,
      type: 'livraison',
    });
  } else {
    await addCommission(livreur, commission);
    const d = await getLivreurDues(livreur);
    const acc = await getSettlementAccount();
    await pushNotification(userKey(livreur), {
      title: '⏰ Dû AfriMarket à régler avant 0h',
      body: `Votre dû est de ${d.montant} FCFA. Réglez-le avant 0h (code *144*10*${acc}*Montant#) sinon vos courses seront bloquées.`,
      type: 'commande',
    });
  }
  if (course.orderId) {
    await markOrderCourseComplete(course.orderId, course.id);
  }
  return { ok: true, course, commission, freeCourse };
}

export async function speedUpCourse(orderId, buyer) {
  if (!orderId) return { ok: false, error: 'course', message: 'Commande introuvable.' };
  const course = (await getAllCourses()).find((c) => c.orderId === orderId);
  if (!course) {
    return { ok: false, error: 'course', message: 'Aucune course en cours pour cette commande.' };
  }
  if (course.status === 'livree' || course.status === 'annulee') {
    return { ok: false, error: 'etat', message: 'Cette livraison est déjà terminée.' };
  }
  if (!course.livreurKey) {
    return { ok: false, error: 'livreur', message: 'Aucun livreur n’a encore accepté cette course.' };
  }
  const now = new Date().toISOString();
  const speeds = course.speedUps || [];
  course.speedUps = [{ at: now, by: buyer?.name || 'L’acheteur' }, ...speeds];
  course.history = [...course.history, { at: now, label: 'L’acheteur demande d’accélérer la livraison.' }];
  await saveCourse(course);
  await pushNotification(course.livreurKey, {
    title: '⏱️ Demande d’accélération',
    body: `${buyer?.name || 'L’acheteur'} souhaite accélérer la livraison de « ${course.titre} ».`,
    type: 'livraison',
  });
  return { ok: true, course };
}

export function courseStatusLabel(status) {
  const map = {
    ouverte: 'En attente d’un livreur',
    acceptee: 'Acceptée — en cours',
    recupere: 'Colis récupéré — en route',
    livree: 'Livrée',
    annulee: 'Annulée',
  };
  return map[status] || status;
}