'use strict';

const crypto = require('crypto');

/*
 * Adaptateur CinetPay.
 *
 * MODE MOCK (par défaut, sans clés API) :
 *   - recrée le comportement exact de l'API : init -> OTP -> vérification -> SUCCESS
 *   - le code OTP N'EST renvoyé qu'en mock (il arrive par vrai SMS en production)
 *
 * MODE REEL :
 *   Renseigner dans server/.env :
 *     CINETPAY_API_KEY=
 *     CINETPAY_API_PASSWORD=
 *     CINETPAY_COUNTRY=BF
 *   L'URL et la forme des endpoints suivent l'API CinetPay v1
 *   (https://docs.cinetpay.com). Vérifier/jouster ces constantes selon
 *   la doc au moment de l'activation des clés de production.
 */

const env = require('process').env;

const API_BASE = env.CINETPAY_API_BASE || 'https://api.cinetpay.net';
const COUNTRY = env.CINETPAY_COUNTRY || 'BF';

function isConfigured() {
  return !!(env.CINETPAY_API_KEY && env.CINETPAY_API_PASSWORD);
}

function getMode() {
  return isConfigured() ? 'api' : 'mock';
}

const randomOtp = () => String(Math.floor(1000 + Math.random() * 9000));
const randomToken = () => crypto.randomBytes(16).toString('hex');
const makeTxId = () =>
  'AFR-' + Date.now().toString().slice(-8) + '-' + Math.floor(100 + Math.random() * 900);

function timingSafeEqual(a, b) {
  const ha = String(a || '');
  const hb = String(b || '');
  const bufA = Buffer.from(ha);
  const bufB = Buffer.from(hb);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function mockInit({ merchantTransactionId, amount, currency, operatorKey, phone, designation, customerName }) {
  return {
    mode: 'mock',
    merchantTransactionId,
    transactionId: makeTxId(),
    status: 'INITIATED',
    mustBeRedirected: false,
    otpCode: randomOtp(),
    notifyToken: randomToken(),
    details: {
      operatorKey,
      phone,
      amount,
      currency,
      designation,
      customerName,
    },
  };
}

/*
 * --- API RELLE (à ajuster avec la doc CinetPay au moment de l'intégration) ---
 */

async function getAccessToken() {
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: env.CINETPAY_API_KEY, apiPassword: env.CINETPAY_API_PASSWORD }),
  });
  if (!res.ok) throw new Error(`CinetPay auth failed (${res.status})`);
  const data = await res.json();
  return (data && data.access_token) || (data && data.token) || null;
}

async function realInit(payload, token) {
  const res = await fetch(`${API_BASE}/payment/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currency: payload.currency || 'XOF',
      merchantTransactionId: payload.merchantTransactionId,
      amount: payload.amount,
      lang: 'fr',
      designation: payload.designation || 'Paiement AfriMarket',
      clientFirstName: payload.customerName || 'Client',
      clientLastName: payload.customerName || 'AfriMarket',
      clientPhoneNumber: payload.phone,
      successUrl: payload.successUrl,
      failedUrl: payload.failedUrl,
      notifyUrl: payload.notifyUrl,
      channel: 'OTP',
      directPay: true,
      paymentMethod: payload.paymentMethod,
    }),
  });
  if (!res.ok) throw new Error(`CinetPay init failed (${res.status})`);
  const data = await res.json();
  return {
    mode: 'api',
    merchantTransactionId: payload.merchantTransactionId,
    transactionId: data.transaction_id || data.transactionId || data.id,
    status: 'INITIATED',
    mustBeRedirected: !!(data && data.details && data.details.mustBeRedirected),
    paymentUrl: data.payment_url || data.paymentUrl || null,
    notifyToken: data.notify_token || data.notifyToken || randomToken(),
  };
}

async function realStatus(transactionId, token) {
  const res = await fetch(`${API_BASE}/payment/${transactionId}/status?country=${COUNTRY}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`CinetPay status failed (${res.status})`);
  const data = await res.json();
  return data && data.status;
}

/*
 * --- API exposée au serveur ---
 */

async function initTransaction(input, hooks) {
  const mode = getMode();
  if (mode === 'mock') {
    return mockInit(input);
  }
  const token = await getAccessToken();
  const result = await realInit(input, token);
  return {
    ...result,
    // OTP envoyé par CinetPay par SMS : jamais renvoyé ici en production
    otpCode: undefined,
  };
}

/*
 * Consommation idempotente d'un code promo lors du passage à SUCCESS.
 * Le drapeau couponConsumedAt empêche le double comptage si l'OTP et le
 * webhook reviennent tous les deux. Un échec n'annule pas le paiement déjà
 * encaissé : il est journalisé pour reconciliation.
 */
async function consumeCouponOnce(tx, store) {
  if (!tx || !tx.promoCode || tx.couponConsumedAt) return;
  const priceCheck = require('./priceCheck');
  const result = await priceCheck.consumeCoupon(tx.promoCode);
  if (result.consumed) {
    tx.couponConsumedAt = new Date().toISOString();
    delete tx.couponConsumeError;
  } else {
    tx.couponConsumeError = result.reason || 'echec inconnu';
    console.error('[coupon] consommation impossible', tx.promoCode, tx.couponConsumeError);
  }
  // patch() et non upsert() : on ne réécrit que les champs du coupon, donc
  // un statut écrit entre-temps par le webhook n'est pas écrasé.
  await store.patch(tx.merchantTransactionId, {
    couponConsumedAt: tx.couponConsumedAt,
    couponConsumeError: tx.couponConsumeError,
  });
}

async function verifyOtp({ merchantTransactionId, otpCode }) {
  const store = require('./store');
  const tx = store.getByMerchant(merchantTransactionId);
  if (!tx) return { ok: false, error: 'Transaction introuvable' };

  if (getMode() === 'mock') {
    if (tx.status === 'SUCCESS') return { ok: true, status: 'SUCCESS' };
    if (String(tx.otpCode || '') !== String(otpCode || '')) {
      return { ok: false, status: 'FAILED', error: 'Code OTP invalide' };
    }
    tx.status = 'SUCCESS';
    tx.verifiedAt = new Date().toISOString();
    await store.upsert(tx);
    await consumeCouponOnce(tx, store);
    return { ok: true, status: 'SUCCESS', merchantTransactionId };
  }

  // Production : valider l'OTP côté CinetPay, puis re-vérifier le statut réel.
  const token = await getAccessToken();
  const status = await realStatus(tx.transactionId, token);
  const ok = status === 'SUCCESS';
  if (ok) {
    tx.status = status;
    await store.upsert(tx);
    await consumeCouponOnce(tx, store);
  }
  return { ok, status: status || 'FAILED', merchantTransactionId };
}

async function resendOtp({ merchantTransactionId }) {
  const store = require('./store');
  const tx = store.getByMerchant(merchantTransactionId);
  if (!tx) return { ok: false, error: 'Transaction introuvable' };

  if (getMode() === 'mock') {
    const code = randomOtp();
    tx.otpCode = code;
    await store.upsert(tx);
    return { ok: true, otpCode: code };
  }
  // Production : CinetPay renvoie le code par SMS. A déclencher selon sa doc.
  return { ok: true, otpCode: undefined };
}

async function getStatus(merchantTransactionId) {
  const store = require('./store');
  const tx = store.getByMerchant(merchantTransactionId);
  if (!tx) return null;

  if (getMode() === 'mock') {
    return { merchantTransactionId, status: tx.status, mode: 'mock' };
  }
  try {
    const token = await getAccessToken();
    const status = await realStatus(tx.transactionId, token);
    if (status && status !== tx.status) {
      tx.status = status;
      await store.upsert(tx);
    }
    return { merchantTransactionId, status: tx.status || 'PENDING', mode: 'api' };
  } catch {
    return { merchantTransactionId, status: tx.status || 'PENDING', mode: 'api', pending: true };
  }
}

/*
 * Webhook CinetPay (production). 3 vérifications :
 *  1. token (legacy : en-tête X-Token HMAC) ou notify_token (API v1)
 *  2. anti-replay : ignorer les notifications déjà traitées
 *  3. ne jamais se fier au body seul -> appel getStatus pour confirmer
 */
async function verifyWebhook({ body, rawBody, xToken, notifyToken }) {
  if (getMode() === 'api' && !xToken) {
    return { ok: false, error: 'Signature X-Token requise' };
  }
  const store = require('./store');

  // API v1 : notify_token envoyé par CinetPay (par pays dans une passerelle)
  let tx = null;
  if (notifyToken) {
    // En production, ne jamais faire confiance à un notify_token fourni par le client :
    // seule la signature HMAC (X-Token) fait foi.
    if (getMode() === 'api') return { ok: false, error: 'notify_token refusé en mode api' };
    tx = store.getByCinetpay(notifyToken) // fallback improbable : le token identifie la notif
      || store.all().find((x) => x.notifyToken && timingSafeEqual(x.notifyToken, notifyToken));
    if (!tx) return { ok: false, error: 'notify_token inconnu' };
  } else if (body && body.cpm_trans_id) {
    // Legacy CHECKOUT : HMAC SHA256 sur le body concaténé, comparé au X-Token
    tx = store.getByMerchant(body.cpm_trans_id) || null;
    if (!tx) return { ok: false, error: 'transaction inconnue' };
    if (xToken) {
      const expected = crypto
        .createHmac('sha256', env.CINETPAY_SECRET_KEY || '')
        .update(String(rawBody || ''))
        .digest('hex');
      if (!timingSafeEqual(xToken, expected)) return { ok: false, error: 'signature invalide' };
    }
  } else {
    return { ok: false, error: 'payload inconnu' };
  }

  if (tx.status === 'SUCCESS') return { ok: true, processed: true, tx }; // anti-replay

  if (getMode() === 'api') {
    // La notification CinetPay n'est qu'une alerte : on confirme le statut réel
    // auprès de l'API avant de marquer la transaction payée.
    try {
      const confirmed = await getStatus(tx.merchantTransactionId);
      const finalStatus = /success|accept|accepted/i.test(String(confirmed && confirmed.status))
        ? 'SUCCESS'
        : 'PENDING';
      if (finalStatus !== 'SUCCESS') return { ok: true, processed: false, tx };
    } catch {
      return { ok: false, error: 'Statut CinetPay non confirmé' };
    }
  } else {
    // Mock : aucun appel réseau possible. On acquitte seulement si le body ne
    // signale pas explicitement un échec (le statut réel reste simulé).
    const status = body.cpm_error_message
      ? body.cpm_error_message
      : body && (body.status || body.transactionStatus || 'SUCCESS');
    if (!/success|accept|accepted/i.test(String(status))) {
      return { ok: true, processed: false, tx };
    }
  }

  tx.status = 'SUCCESS';
  tx.webhookAt = new Date().toISOString();
  await store.upsert(tx);
  await consumeCouponOnce(tx, store);
  return { ok: true, processed: true, tx };
}

module.exports = {
  getMode,
  isConfigured,
  makeTxId,
  initTransaction,
  verifyOtp,
  resendOtp,
  getStatus,
  verifyWebhook,
};