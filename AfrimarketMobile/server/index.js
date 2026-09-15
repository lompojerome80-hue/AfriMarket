'use strict';

/*
 * Serveur de paiement AfriMarket (CinetPay).
 * Zéro dépendance : `node index.js` suffit.
 *
 * Démarrage :
 *   cd server
 *   node index.js
 *
 * Routes :
 *   GET  /health
 *   GET  /api/pay/status/:merchantId
 *   GET  /api/pay/transactions          (démo)
 *   POST /api/pay/init                  { merchantTransactionId, amount, currency, operatorKey, phone, designation, customerName, successUrl?, failedUrl?, notifyUrl? }
 *   POST /api/pay/verify-otp            { merchantTransactionId, otpCode }
 *   POST /api/pay/resend-otp            { merchantTransactionId }
 *   POST /api/pay/webhook               (notification CinetPay : x-www-form-urlencoded ou JSON)
 *   POST /api/sync/register             { accountKey, deviceKey? } -> secret (créé une seule fois)
 *   POST /api/sync/reset-secret         { accountKey } (x-admin-token)
 *   POST /api/sync/put                  { bucket?, entries, clientAt? } (x-sync-account + x-sync-secret)
 *   GET  /api/sync/pull?bucket=&since=  { rev, changed, entries } (x-sync-account + x-sync-secret)
 *   GET  /api/sync/status               (x-admin-token)
 */

const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Chargeur .env minimaliste (aucune dépendance).
(() => {
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const cinetpay = require('./lib/cinetpay');
const store = require('./lib/store');
const pushStore = require('./lib/pushStore');
const syncStore = require('./lib/syncStore');

const PORT = Number(process.env.PORT || 4000);

function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Token, X-Notify-Token, X-Admin-Token, X-Push-Key, X-Sync-Account, X-Sync-Secret, X-Device-Key',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function pushAuthorized(req) {
  const expected = process.env.PUSH_API_KEY || 'afrimarket-demo-push';
  return req.headers['x-push-key'] === expected;
}

function adminAuthorized(req) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'afrimarket-demo-admin';
  return !!req.headers['x-admin-token'] && req.headers['x-admin-token'] === ADMIN_TOKEN;
}

function syncHeaders(req) {
  return {
    accountKey: String(req.headers['x-sync-account'] || '').slice(0, 120),
    secret: String(req.headers['x-sync-secret'] || ''),
    deviceKey: String(req.headers['x-device-key'] || '').slice(0, 80),
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(new Error('Payload trop grand'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      try {
        const txt = raw.toString('utf8');
        let parsed = null;
        if (txt.trim()) {
          const ct = (req.headers['content-type'] || '').toLowerCase();
          if (ct.includes('application/json') || txt.trim().startsWith('{')) parsed = JSON.parse(txt);
          else {
            const u = new URLSearchParams(txt);
            parsed = Object.fromEntries(u.entries());
          }
        }
        resolve({ raw, parsed });
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function getLanIps() {
  const out = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces || []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out;
}

function notFound(req, res) {
  json(res, 404, { ok: false, error: `Route inconnue : ${req.method} ${req.url}` });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type, X-Token, X-Notify-Token, X-Admin-Token, X-Push-Key, X-Sync-Account, X-Sync-Secret, X-Device-Key',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, mode: cinetpay.getMode(), configured: cinetpay.isConfigured() });
    }

    if (req.method === 'GET' && url.pathname === '/api/pay/transactions') {
      const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'afrimarket-demo-admin';
      if (!req.headers['x-admin-token'] || req.headers['x-admin-token'] !== ADMIN_TOKEN) {
        return json(res, 401, { ok: false, error: 'Token admin requis (en-tête x-admin-token)' });
      }
      return json(res, 200, { ok: true, list: store.all() });
    }

    if (req.method === 'GET' && /^\/api\/pay\/status\/[^/]+$/.test(url.pathname)) {
      const merchantTransactionId = decodeURIComponent(url.pathname.split('/').pop());
      const st = await cinetpay.getStatus(merchantTransactionId);
      if (!st) return json(res, 404, { ok: false, error: 'Transaction inconnue' });
      return json(res, 200, { ok: true, ...st });
    }

    if (req.method === 'POST' && url.pathname === '/api/pay/init') {
      const { raw, parsed } = await readBody(req);
      if (!parsed || !parsed.merchantTransactionId || !parsed.amount) {
        return json(res, 400, { ok: false, error: 'merchantTransactionId et amount requis' });
      }
      const merchantTransactionId = String(parsed.merchantTransactionId).slice(0, 30);
      if (store.getByMerchant(merchantTransactionId)) {
        return json(res, 200, { ok: true, ...store.getByMerchant(merchantTransactionId) });
      }
      const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host || 'localhost'}`;
      const init = await cinetpay.initTransaction(
        {
          merchantTransactionId,
          amount: Math.round(Number(parsed.amount)),
          currency: parsed.currency || 'XOF',
          operatorKey: parsed.operatorKey || '',
          phone: parsed.phone || '',
          designation: parsed.designation || 'Paiement AfriMarket',
          customerName: parsed.customerName || 'Client',
          successUrl: parsed.successUrl || `${baseUrl}/api/pay/done`,
          failedUrl: parsed.failedUrl || `${baseUrl}/api/pay/done`,
          notifyUrl: parsed.notifyUrl || `${baseUrl}/api/pay/webhook`,
          paymentMethod: parsed.paymentMethod || '',
        },
        { raw }
      );
      store.upsert({
        merchantTransactionId,
        transactionId: init.transactionId,
        status: init.status,
        amount: Math.round(Number(parsed.amount)),
        currency: parsed.currency || 'XOF',
        operatorKey: parsed.operatorKey || '',
        phone: parsed.phone || '',
        designation: parsed.designation || '',
        customerName: parsed.customerName || '',
        mode: init.mode,
        otpCode: init.otpCode,
        notifyToken: init.notifyToken,
        paymentUrl: init.paymentUrl || null,
        createdAt: new Date().toISOString(),
      });
      return json(res, 200, { ok: true, ...init });
    }

    if (req.method === 'POST' && url.pathname === '/api/pay/verify-otp') {
      const { parsed } = await readBody(req);
      const r = await cinetpay.verifyOtp({
        merchantTransactionId: parsed && parsed.merchantTransactionId,
        otpCode: parsed && parsed.otpCode,
      });
      return json(res, r.ok ? 200 : 400, { ok: r.ok, ...r });
    }

    if (req.method === 'POST' && url.pathname === '/api/pay/resend-otp') {
      const { parsed } = await readBody(req);
      const r = await cinetpay.resendOtp({
        merchantTransactionId: parsed && parsed.merchantTransactionId,
      });
      return json(res, r.ok ? 200 : 404, { ok: r.ok, ...r });
    }

    if (req.method === 'POST' && url.pathname === '/api/push/register') {
      const { parsed } = await readBody(req);
      if (!pushAuthorized(req)) return json(res, 401, { ok: false, error: 'Clé invalide' });
      const registered = pushStore.register(parsed && parsed.key, parsed && parsed.token);
      return json(res, registered ? 200 : 400, { ok: registered });
    }

    if (req.method === 'POST' && url.pathname === '/api/push/notify') {
      const { parsed } = await readBody(req);
      if (!pushAuthorized(req)) return json(res, 401, { ok: false, error: 'Clé invalide' });
      const tokens = pushStore.tokensFor(parsed && parsed.keys);
      let sent = 0;
      let failed = 0;
      if (tokens.length) {
        const messages = tokens.map((to) => ({
          to,
          title: String((parsed && parsed.title) || 'AfriMarket'),
          body: String((parsed && parsed.body) || ''),
          data: (parsed && parsed.data) || null,
          sound: 'default',
        }));
        try {
          const r = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
          });
          const result = await r.json();
          const items = Array.isArray(result) ? result : [result];
          for (const it of items) {
            const st = (it && (it.status || (it.data && it.data.status))) || '';
            if (String(st).toLowerCase() === 'ok') sent += 1;
            else failed += 1;
          }
        } catch (e) {
          return json(res, 502, { ok: false, error: 'Expo push injoignable : ' + e.message });
        }
      }
      return json(res, 200, { ok: true, recipients: tokens.length, sent, failed });
    }

    if (req.method === 'POST' && url.pathname === '/api/sync/register') {
      const { parsed } = await readBody(req);
      const accountKey = String((parsed && parsed.accountKey) || '').slice(0, 120);
      const deviceKey = String((parsed && parsed.deviceKey) || '').slice(0, 80);
      if (!accountKey) return json(res, 400, { ok: false, error: 'accountKey requis' });
      const r = syncStore.registerAccount(accountKey, deviceKey);
      return json(res, 200, { ok: true, first: r.first, secret: r.secret, accountKey });
    }

    if (req.method === 'POST' && url.pathname === '/api/sync/reset-secret') {
      const { parsed } = await readBody(req);
      if (!adminAuthorized(req)) return json(res, 401, { ok: false, error: 'Token admin requis (en-tête x-admin-token)' });
      const accountKey = String((parsed && parsed.accountKey) || '').slice(0, 120);
      const secret = syncStore.resetSecret(accountKey);
      if (!secret) return json(res, 404, { ok: false, error: 'Compte inconnu' });
      return json(res, 200, { ok: true, secret, accountKey });
    }

    if (req.method === 'POST' && url.pathname === '/api/sync/put') {
      const { parsed } = await readBody(req);
      const h = syncHeaders(req);
      if (!syncStore.authAccount(h.accountKey, h.secret)) {
        return json(res, 401, { ok: false, error: 'Compte ou secret invalide' });
      }
      const bucket = String((parsed && parsed.bucket) || 'global').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) || 'global';
      const { rev, saved } = syncStore.putEntries(bucket, parsed && parsed.entries, h.deviceKey, parsed && parsed.clientAt);
      return json(res, 200, { ok: true, rev, saved });
    }

    if (req.method === 'GET' && url.pathname === '/api/sync/pull') {
      const h = syncHeaders(req);
      if (!syncStore.authAccount(h.accountKey, h.secret)) {
        return json(res, 401, { ok: false, error: 'Compte ou secret invalide' });
      }
      const bucket = String(url.searchParams.get('bucket') || 'global').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) || 'global';
      const since = Number(url.searchParams.get('since')) || 0;
      return json(res, 200, { ok: true, ...syncStore.pull(bucket, since) });
    }

    if (req.method === 'GET' && url.pathname === '/api/sync/status') {
      if (!adminAuthorized(req)) return json(res, 401, { ok: false, error: 'Token admin requis (en-tête x-admin-token)' });
      return json(res, 200, { ok: true, ...syncStore.status() });
    }

    if (req.method === 'POST' && url.pathname === '/api/pay/webhook') {
      const { raw, parsed } = await readBody(req);
      const vr = cinetpay.verifyWebhook({
        body: parsed,
        rawBody: parsed && typeof parsed === 'object' && !(parsed instanceof Object) ? '' : raw.toString('utf8'),
        xToken: req.headers['x-token'],
        notifyToken: req.headers['x-notify-token'] || (parsed && parsed.notifyToken),
      });
      if (!vr.ok) return json(res, 401, { ok: false, error: vr.error });
      return json(res, 200, { ok: true, processed: vr.processed });
    }

    if (req.method === 'POST' && url.pathname === '/api/account/delete') {
      const h = syncHeaders(req);
      if (!syncStore.authAccount(h.accountKey, h.secret)) {
        return json(res, 401, { ok: false, error: 'Compte ou secret invalide' });
      }
      const r = syncStore.deleteAccountData(h.accountKey);
      return json(res, 200, { ok: !!(r && r.ok), buckets: (r && (r.buckets !== undefined ? r.buckets : r.buckets) ) || 0, error: (r && !r.ok) ? 'Compte introuvable' : undefined });
    }

    return notFound(req, res);
  } catch (e) {
    console.error('[error]', e.message);
    return json(res, 500, { ok: false, error: e.message });
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} déjà utilisé. Modifier PORT dans l'environnement ou arrêter l'autre serveur.`);
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, () => {
  const ips = getLanIps();
  console.log('=============================================');
  console.log('  AFRI MARKET - SERVEUR DE PAIEMENT');
  console.log(`  Mode : ${cinetpay.getMode()}`);
  console.log(`  Port : ${PORT}`);
  console.log('  URL pour le telephone (LAN) :');
  for (const ip of ips) console.log(`    http://${ip}:${PORT}`);
  console.log('=============================================');
});

module.exports = server;