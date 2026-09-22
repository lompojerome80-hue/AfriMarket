'use strict';

/*
 * syncStore : miroir multi-appareils des buckets AsyncStorage.
 * Zéro dépendance, persisté en JSON (server/data/sync.json).
 *
 * Principe :
 *  - L'app stocke tout dans AsyncStorage (clés "afrimarket_*" notamment).
 *  - Chaque clé est répliquée ici sous forme de valeur opaque ("v"), avec un
 *    horodatage ("at"), l'appareil écrivain ("by") et une révision globale
 *    ("rev") qui sert au delta ("pull?since=").
 *  - Règlement des conflits : last-write-wins côté client (comparaison at).
 *
 * Espaces de noms :
 *  - "global"        : état partagé de la place de marché (boutiques, produits,
 *                      commandes, escrow, signalements, campagnes...).
 *  - "<accountKey>"  : données personnelles d'un compte (panier, notifications,
 *                      messages, suivi de localisation...).
 *
 * Sécurité :
 *  - Chaque compte se voit attribuer un secret à la création (renvoyé une seule
 *    fois). Il est stocké haché (SHA-256 + sel).
 *  - Buckets isolés par compte : "global" est partagé (place de marché), les
 *    buckets "<accountKey>" / "<accountKey>:*" ne sont accessibles qu'à leur
 *    propriétaire (vérifié côté routes, server/index.js).
 *  - Les clés sensibles (comptes, hashs, OTP, dossiers KYC) ne sont jamais
 *    répliquées : rejetées à l'écriture et purgées au chargement.
 *  - /api/sync/status exige le token admin (x-admin-token).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = process.env.AFRIMARKET_SYNC_FILE || path.join(__dirname, '..', 'data', 'sync.json');

function hashSecret(secret, salt) {
  return crypto.createHash('sha256').update(`${salt}:${secret}`).digest('hex');
}

/*
 * Clés AsyncStorage qui ne doivent JAMAIS être répliquées côté serveur
 * (hashs de mots de passe, comptes, OTP, dossiers KYC avec photos CNI).
 * Aligné sur SYNC_EXCLUDE côté client (src/lib/sync.js).
 */
const SENSITIVE_KEYS = [
  /^afrimarket_accounts$/,
  /^afrimarket_user($|_)/,
  /^afrimarket_otp($|_)/,
  /^afrimarket_dossiers($|_)/,
  /afrimarket_boutique_passwords/,
];

function isForbiddenEntry(key) {
  const k = String(key || '');
  return k === '__proto__' || k === 'constructor' || k === 'prototype'
    || SENSITIVE_KEYS.some((re) => re.test(k));
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const state = {
      rev: Number(raw.rev) || 0,
      accounts: raw.accounts || {},
      buckets: raw.buckets || {},
    };
    // Purge rétroactive : retire les clés sensibles et les noms interdits
    // déjà présents dans le fichier (s'exécute une seule fois en pratique).
    let touched = false;
    for (const b of Object.keys(state.buckets)) {
      if (isForbiddenEntry(b)) { delete state.buckets[b]; touched = true; continue; }
      const bucket = state.buckets[b];
      if (!bucket || typeof bucket !== 'object') continue;
      for (const k of Object.keys(bucket)) {
        if (isForbiddenEntry(k)) { delete bucket[k]; touched = true; }
      }
    }
    // Purge des comptes dont la clé est un nom réservé.
    for (const a of Object.keys(state.accounts)) {
      if (a === '__proto__' || a === 'constructor' || a === 'prototype') {
        delete state.accounts[a];
        touched = true;
      }
    }
    if (touched) save(state);
    return state;
  } catch {
    return { rev: 0, accounts: {}, buckets: {} };
  }
}

function save(state) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('[syncStore] save error', e.message);
  }
}

function registerAccount(accountKey, deviceKey) {
  const state = load();
  if (Object.prototype.hasOwnProperty.call(state.accounts, accountKey)) {
    const acc = state.accounts[accountKey];
    if (deviceKey && !acc.devices.includes(deviceKey)) acc.devices.push(deviceKey);
    save(state);
    return { first: false, secret: null };
  }
  const salt = crypto.randomBytes(8).toString('hex');
  const secret = crypto.randomBytes(9).toString('base64url');
  state.accounts[accountKey] = {
    salt,
    secretHash: hashSecret(secret, salt),
    devices: deviceKey ? [deviceKey] : [],
    createdAt: new Date().toISOString(),
  };
  save(state);
  return { first: true, secret };
}

function authAccount(accountKey, secret) {
  if (!accountKey || !secret) return false;
  const accountList = load().accounts;
  if (!Object.prototype.hasOwnProperty.call(accountList, accountKey)) return false;
  const acc = accountList[accountKey];
  if (!acc || !acc.salt || !acc.secretHash) return false;
  return hashSecret(String(secret), acc.salt) === acc.secretHash;
}

function putEntries(bucket, entries, by, clientTsOverride) {
  if (!entries || typeof entries !== 'object') return { rev: 0, saved: 0 };
  const b = String(bucket || '');
  if (isForbiddenEntry(b)) return { rev: 0, saved: 0 };
  const state = load();
  const target = state.buckets[b] || (state.buckets[b] = {});
  let saved = 0;
  const clientTs = Number(clientTsOverride) || Date.now();
  for (const key of Object.keys(entries)) {
    if (isForbiddenEntry(key)) continue;
    const value = entries[key];
    if (value === undefined || value === null) continue;
    const cur = target[key];
    const writer = String(by || '');
    if (cur && cur.at > clientTs && cur.by && cur.by !== writer) continue;
    target[key] = {
      v: typeof value === 'string' ? value : JSON.stringify(value),
      at: clientTs,
      by: writer,
      rev: ++state.rev,
    };
    saved += 1;
  }
  save(state);
  return { rev: state.rev, saved };
}

function pull(bucket, since) {
  const state = load();
  const bucketData = state.buckets[bucket] || {};
  const entries = {};
  const changed = [];
  const sinceRev = Number(since) || 0;
  for (const key of Object.keys(bucketData)) {
    const e = bucketData[key];
    if (e.rev > sinceRev) {
      entries[key] = { v: e.v, at: e.at, by: e.by };
      changed.push(key);
    }
  }
  return {
    rev: state.rev,
    changed,
    entries,
  };
}

/**
 * Supprime RÉELLEMENT un compte côté serveur : purge le registre d'accounts +
 * tous ses buckets personnels (clé exacte ou clés préfixées `<accountKey>:`).
 * Retourne { ok, buckets } : buckets=nombre de buckets purgés.
 * Best-effort : si le compte n'existe pas, retourne { ok: false }.
 */
function deleteAccountData(accountKey) {
  const state = load();
  if (!Object.prototype.hasOwnProperty.call(state.accounts, accountKey)) return { ok: false, buckets: 0 };
  delete state.accounts[accountKey];
  let buckets = 0;
  const prefix = String(accountKey) + ':';
  for (const k of Object.keys(state.buckets)) {
    if (k === String(accountKey) || k.indexOf(prefix) === 0) {
      delete state.buckets[k];
      buckets += 1;
    }
  }
  save(state);
  return { ok: true, buckets };
}

function resetSecret(accountKey) {
  const state = load();
  if (!state.accounts[accountKey]) return null;
  const salt = crypto.randomBytes(8).toString('hex');
  const secret = crypto.randomBytes(9).toString('base64url');
  state.accounts[accountKey].salt = salt;
  state.accounts[accountKey].secretHash = hashSecret(secret, salt);
  save(state);
  return secret;
}

function status() {
  const state = load();
  return {
    rev: state.rev,
    accounts: Object.keys(state.accounts).length,
    accountKeys: Object.keys(state.accounts),
    buckets: Object.keys(state.buckets),
    entries: Object.values(state.buckets).reduce((n, b) => n + Object.keys(b).length, 0),
  };
}

module.exports = { registerAccount, authAccount, putEntries, pull, resetSecret, status, deleteAccountData };