import AsyncStorage from '@react-native-async-storage/async-storage';

import { PAYMENT_API_BASE } from '../services/paymentApi';
import { userKey } from './auth';

/*
 * Synchronisation multi-appareils (façade + moteur).
 *
 * Buckets servis par le serveur (server/index.js) : "global" pour l'état de la
 * place de marché, "<accountKey>" pour les données personnelles. Ce moteur
 * réplique le bucket "global" (namespace clés "afrimarket_*").
 *
 * Algorithme (last-write-wins, diffusé) :
 *   1. pull          -> clés modifiées distantes depuis la dernière révision ;
 *   2. application   -> écriture locale des clés distantes (jamais celles déjà
 *                       modifiées localement) ;
 *   3. diff          -> clés locales différentes de l'instantané du dernier push ;
 *   4. push          -> envoi des seules clés modifiées (évite la clobberisation).
 *
 * Toutes les opérations sont best-effort et silencieuses.
 */

const META_KEY = 'afrimarket__sync';
const CREDS_KEY = 'afrimarket__sync_creds';
const DEVICE_KEY = 'afrimarket__device';
const TIMEOUT_MS = 6000;

const SYNC_EXCLUDE = [
  /^afrimarket__/,
  /afrimarket_boutique_passwords/,
];

function isExcludedKey(key) {
  return SYNC_EXCLUDE.some((re) => re.test(key));
}

let running = false;

async function request(path, { method = 'GET', body, accountKey, secret, deviceKey, adminToken } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (accountKey) headers['X-Sync-Account'] = String(accountKey);
    if (secret) headers['X-Sync-Secret'] = String(secret);
    if (deviceKey) headers['X-Device-Key'] = String(deviceKey);
    if (adminToken) headers['X-Admin-Token'] = String(adminToken);
    const res = await fetch(`${PAYMENT_API_BASE}${path}`, {
      method,
      headers,
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function getOrCreateDeviceKey() {
  return AsyncStorage.getItem(DEVICE_KEY).then((k) => {
    if (k) return k;
    const next = ('dv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e9).toString(36)).slice(0, 24);
    return AsyncStorage.setItem(DEVICE_KEY, next).then(() => next);
  });
}

async function getCreds(accountKey) {
  try {
    const raw = await AsyncStorage.getItem(CREDS_KEY);
    const creds = raw ? JSON.parse(raw) : null;
    if (creds && creds.accountKey === accountKey && creds.secret) return creds;
    const deviceKey = await getOrCreateDeviceKey();
    const res = await request('/api/sync/register', { method: 'POST', body: { accountKey, deviceKey } });
    if (!res || !res.secret) return null;
    const next = { accountKey, secret: res.secret, deviceKey };
    await AsyncStorage.setItem(CREDS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

/** Liste les clés AsyncStorage d'un namespace (ex. "afrimarket_"). */
export async function listDeviceKeys(prefix = 'afrimarket_') {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  } catch {
    return [];
  }
}

/** Instantané { clé: valeur (string brute) } des clés locales d'un namespace. */
export async function snapshotLocal(prefix = 'afrimarket_') {
  try {
    const keys = await listDeviceKeys(prefix);
    const pairs = await AsyncStorage.multiGet(keys);
    const out = {};
    for (const [k, v] of pairs) if (v != null && !k.startsWith('afrimarket__')) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

/** Crée (ou retrouve) un compte distant ; le secret n'est renvoyé qu'à la première création. */
export async function syncRegister(accountKey, deviceKey) {
  return request('/api/sync/register', { method: 'POST', body: { accountKey, deviceKey } });
}

/** Pousse des clés (valeur sérialisée) vers un bucket. */
export async function syncPush(bucket, entries, accountKey, secret, deviceKey, clientAt) {
  return request('/api/sync/put', {
    method: 'POST',
    body: { bucket, entries, clientAt: clientAt || Date.now() },
    accountKey,
    secret,
    deviceKey,
  });
}

/** Rapatrie les clés modifiées depuis la révision `since`. */
export async function syncPull(bucket, since, accountKey, secret) {
  return request(`/api/sync/pull?bucket=${encodeURIComponent(bucket)}&since=${Number(since) || 0}`, {
    accountKey,
    secret,
  });
}

/** Génère un nouveau secret pour un compte (auth admin). */
export async function syncResetSecret(accountKey, adminToken) {
  return request('/api/sync/reset-secret', { method: 'POST', body: { accountKey }, adminToken });
}

/** État du registre de synchro (auth admin). */
export async function syncStatus(adminToken) {
  return request('/api/sync/status', { adminToken });
}

/** Fusionne deux états ; last-write-wins simplifié (la version distante gagne). */
export function mergeLastWriteWins(localMap, remoteEntries) {
  const out = { ...(localMap || {}) };
  for (const key of Object.keys(remoteEntries || {})) {
    out[key] = remoteEntries[key].v;
  }
  return out;
}

async function loadMeta() {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    const meta = raw ? JSON.parse(raw) : null;
    return { rev: Number(meta && meta.rev) || 0, pushed: (meta && meta.pushed) || {} };
  } catch {
    return { rev: 0, pushed: {} };
  }
}

async function saveMeta(meta) {
  try {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // best-effort
  }
}

/**
 * Passe de synchro complète du bucket "global" pour le compte fourni.
 * Retourne un résumé pour debug ; ne lève jamais.
 */
export async function runSync(user) {
  if (running) return null;
  running = true;
  try {
    const accountKey = userKey(user);
    if (!accountKey) return null;
    const creds = await getCreds(accountKey);
    if (!creds) return null;

    const meta = await loadMeta();
    const remote = await syncPull('global', meta.rev, accountKey, creds.secret);
    if (!remote) return null;

    const applied = {};
    const metaKeys = (Object.keys(remote.entries || {})).filter((k) => !isExcludedKey(k));
    if (metaKeys.length) {
      const toSet = {};
      for (const k of metaKeys) {
        applied[k] = remote.entries[k].v;
        toSet[k] = remote.entries[k].v;
      }
      await AsyncStorage.multiSet(Object.entries(toSet));
    }

    const local = await snapshotLocal();
    const pushedView = { ...(meta.pushed || {}), ...applied };
    const diffs = {};
    for (const k of Object.keys(local)) {
      if (isExcludedKey(k)) continue;
      if (local[k] !== pushedView[k]) diffs[k] = local[k];
    }

    let saved = 0;
    const diffKeys = Object.keys(diffs);
    if (diffKeys.length) {
      const res = await syncPush('global', diffs, accountKey, creds.secret, creds.deviceKey, Date.now());
      saved = res && res.ok ? res.saved : 0;
    }

    await saveMeta({ rev: remote.rev, pushed: local });
    return {
      accountKey,
      pulled: metaKeys.length,
      pushed: saved,
      rev: remote.rev,
    };
  } catch {
    return null;
  } finally {
    running = false;
  }
}

let syncTimer = null;

/** Point d'entrée debouncé pour App.js (au login / retour au premier plan). */
export function autoSync(user) {
  if (!user) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    runSync(user).catch(() => {});
  }, 1500);
}