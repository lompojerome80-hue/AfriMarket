import { NativeModules, Linking, Alert } from 'react-native';

/*
 * Façade de paiement AfriMarket -> serveur CinetPay.
 *
 * Le serveur doit tourner sur le PC :  cd server && node index.js
 * Le téléphone le trouve automatiquement via le host de Metro (mode LAN).
 *
 * Si le serveur refuse (HTTP 4xx/5xx), les fonctions renvoient { ok:false, error }
 * et PayScreen affiche un refus explicite.
 * Si le serveur est joignable mais ne répond pas (panne reseau en DEV), les
 * fonctions renvoient null et PayScreen bascule sur la simulation locale.
 */

const SERVER_PORT = 4000;

export const PAYMENT_MODE = {
  server: 'server',
  local: 'local',
};

/*
 * URL du serveur AfriMarket (ordre de priorité) :
 *   1. process.env.EXPO_PUBLIC_PAYMENT_SERVER_URL   → réglée dans un .env à la racine de l'app
 *      (variable publique Expo : lisible au runtime, peut être cliquée/dorée).
 *      Exemple : EXPO_PUBLIC_PAYMENT_SERVER_URL=https://afrimarket-pay-xxxx.onrender.com
 *   2. PAYMENT_SERVER_URL (constante ci-dessous) → éditée à la main dans ce fichier.
 *   3. null → fallback LAN développeur (serveur qui tourne sur le PC, IP Metro).
 */
const PAYMENT_SERVER_URL =
  process.env.EXPO_PUBLIC_PAYMENT_SERVER_URL || null;

/* URL fixe de secours si tu ne veux pas passer par .env (remplace par ton Render). */
const PAYMENT_SERVER_URL_FALLBACK = null; // ex: 'https://afrimarket-pay-xxxx.onrender.com'

/*
 * Aucune URL configurée ET build de production : on ne tente PAS le fallback
 * LAN (192.168.1.10). Cette adresse n'existe que sur le réseau du développeur ;
 * en prod elle garantit un échec réseau puis un faux "paiement simulé".
 * On renvoie donc null, ce qui déclenche un refus 503 explicite dans request().
 */
function getServerBase() {
  if (PAYMENT_SERVER_URL) return PAYMENT_SERVER_URL;
  if (!__DEV__) return null;
  try {
    const scriptUrl = NativeModules?.SourceCode?.scriptURL;
    const parsed = scriptUrl && typeof scriptUrl === 'string' ? new URL(scriptUrl) : null;
    if (parsed && parsed.hostname) return `http://${parsed.hostname}:${SERVER_PORT}`;
  } catch {
    // ignore
  }
  return `http://192.168.1.10:${SERVER_PORT}`;
}

export const PAYMENT_API_BASE = getServerBase();

const TIMEOUT_MS = 6000;

async function request(path, { method = 'GET', body } = {}) {
  /*
   * Serveur non configuré (build prod sans EXPO_PUBLIC_PAYMENT_SERVER_URL) :
   * refus immédiat 503. Sans cela, fetch() échouerait après TIMEOUT_MS et
   * l'erreur serait perçue comme une simple panne réseau -> simulation.
   */
  if (!PAYMENT_API_BASE) {
    const err = new Error('Serveur de paiement non configuré (EXPO_PUBLIC_PAYMENT_SERVER_URL absente).');
    err.status = 503;
    err.payload = null;
    throw err;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${PAYMENT_API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/*
 * Rejet explicite du serveur (4xx/5xx) -> { ok:false, error }
 * pour le distinguer d'une simple panne réseau -> null.
 * C'est ce qui empêche PayScreen de basculer en paiement simulé
 * quand le serveur refuse (ex: montant non sourçable en mode api).
 */
function remoteResult(err) {
  if (err && err.status) {
    return {
      ok: false,
      error: (err && err.message) || 'Erreur serveur',
      status: err.status,
      code: (err.payload && err.payload.code) || undefined,
    };
  }
  return null;
}

export async function pingServer() {
  try {
    const data = await request('/health');
    return data?.ok === true;
  } catch {
    return false;
  }
}

export async function initRemotePayment(payload) {
  try {
    return await request('/api/pay/init', { method: 'POST', body: payload });
  } catch (err) {
    return remoteResult(err);
  }
}

export async function verifyRemoteOtp(merchantTransactionId, otpCode) {
  try {
    return await request('/api/pay/verify-otp', {
      method: 'POST',
      body: { merchantTransactionId, otpCode: String(otpCode || '') },
    });
  } catch (err) {
    return remoteResult(err);
  }
}

export async function resendRemoteOtp(merchantTransactionId) {
  try {
    return await request('/api/pay/resend-otp', {
      method: 'POST',
      body: { merchantTransactionId },
    });
  } catch (err) {
    return remoteResult(err);
  }
}

export async function getRemoteStatus(merchantTransactionId) {
  try {
    return await request(`/api/pay/status/${encodeURIComponent(merchantTransactionId)}`);
  } catch (err) {
    return remoteResult(err);
  }
}

export function openPaymentUrl(url) {
  if (!url) return;
  Linking.openURL(url).catch(() =>
    Alert.alert('Paiement', 'Impossible d\'ouvrir la page de paiement.')
  );
}

export function makeMerchantId() {
  return 'AFR-' + Date.now().toString().slice(-8) + '-' + Math.floor(100 + Math.random() * 900);
}