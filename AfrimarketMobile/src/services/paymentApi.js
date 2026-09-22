import { NativeModules, Linking, Alert } from 'react-native';

/*
 * Façade de paiement AfriMarket -> serveur CinetPay.
 *
 * Le serveur doit tourner sur le PC :  cd server && node index.js
 * Le téléphone le trouve automatiquement via le host de Metro (mode LAN).
 *
 * Si le serveur est injoignable (ou non lancé), toutes les fonctions
 * renvoient null et PayScreen retombe sur la simulation locale.
 */

const SERVER_PORT = 4000;

export const PAYMENT_MODE = {
  server: 'server',
  local: 'local',
};

/*
 * URL du serveur AfriMarket.
 * - null : déduit automatiquement du host Metro (mode LAN développeur).
 * - sinon : URL fixe (ex: https://afrimarket-server.onrender.com) pour la prod.
 */
const PAYMENT_SERVER_URL = 'https://season-pricing-serves-regarding.trycloudflare.com';

function getServerBase() {
  if (PAYMENT_SERVER_URL) return PAYMENT_SERVER_URL;
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
    return { ok: false, error: (err && err.message) || 'Erreur serveur', status: err.status };
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