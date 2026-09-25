'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'transactions.json');
const LOCK = `${FILE}.lock`;
const LOCK_STALE_MS = 30000;
const RETRY_MS = 20;
const RETRY_MAX_MS = 20000;
const HELD_CODES = new Set(['EEXIST', 'EPERM', 'EACCES', 'EBUSY']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomToken = () => `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/*
 * Verrou inter-processus.
 *
 * Le store est un fichier JSON partagé : sans verrou, deux serveurs lancés en
 * parallèle (ou deux workers) font chacun load() -> modification -> save() et le
 * second écrase le premier, perdant des transactions. Un simple verrou en
 * mémoire ne suffirait pas car chaque processus a son propre event loop.
 *
 * L'ouverture 'wx' est atomique. Sous Windows, un fichier déjà ouvert peut
 * renvoyer EPERM/EACCES au lieu de EEXIST : ces codes sont donc tous traités
 * comme « verrou déjà pris » et non comme une erreur fatale.
 *
 * Chaque acquéreur écrit un jeton unique et ne relâche que si le jeton est
 * encore le sien, pour ne pas supprimer le verrou d'un autre processus après
 * expiration. Un verrou trop vieux est considéré comme abandonné (crash) et
 * retiré, pour ne pas rester bloqué indéfiniment.
 */
async function acquireLock() {
  const deadline = Date.now() + RETRY_MAX_MS;
  const token = randomToken();
  for (;;) {
    try {
      const fd = fs.openSync(LOCK, 'wx');
      fs.writeSync(fd, token);
      fs.closeSync(fd);
      return token;
    } catch (e) {
      if (!e || !HELD_CODES.has(e.code)) throw e;
      let held = '';
      try {
        held = fs.readFileSync(LOCK, 'utf8');
      } catch {
        await sleep(RETRY_MS);
        continue;
      }
      const stamp = Number(String(held).split('-')[1] || 0);
      if (stamp && Date.now() - stamp > LOCK_STALE_MS) {
        try {
          fs.unlinkSync(LOCK);
        } catch {
          /* un autre processus l'a déjà repris */
        }
        continue;
      }
      if (Date.now() > deadline) {
        throw new Error('Verrou du store indisponible (transaction concurrente trop longue).');
      }
      await sleep(RETRY_MS);
    }
  }
}

function releaseLock(token) {
  try {
    if (fs.readFileSync(LOCK, 'utf8') === token) fs.unlinkSync(LOCK);
  } catch {
    /* déjà libéré ou remplacé */
  }
}

/*
 * Écriture atomique : on écrit un fichier temporaire puis on le renomme. Un
 * crash en cours d'écriture ne peut donc pas laisser un transactions.json
 * tronqué ou illisible.
 */
function save(list) {
  const dir = path.dirname(FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8');
  fs.renameSync(tmp, FILE);
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) || [];
  } catch {
    return [];
  }
}

/*
 * Toute opération en lecture-modification-écriture passe par le verrou, donc
 * deux écritures concurrentes ne peuvent plus se perdre. Le callback reçoit
 * un jeu de données relu à l'intérieur du verrou, jamais une copie antérieure.
 */
async function withLock(fn) {
  const token = await acquireLock();
  try {
    return fn(load());
  } finally {
    releaseLock(token);
  }
}

async function upsert(tx) {
  if (!tx || !tx.merchantTransactionId) return tx;
  return withLock((list) => {
    const i = list.findIndex((x) => x.merchantTransactionId === tx.merchantTransactionId);
    if (i >= 0) list[i] = tx;
    else list.push(tx);
    save(list);
    return tx;
  });
}

/*
 * Mise à jour partielle : relit la transaction dans le verrou et n'en modifie
 * que les champs fournis, pour ne pas écraser les champs écrits entre-temps
 * (verifiedAt, couponConsumedAt, status...).
 */
async function patch(merchantTransactionId, fields) {
  return withLock((list) => {
    const i = list.findIndex((x) => x.merchantTransactionId === merchantTransactionId);
    if (i < 0) return null;
    list[i] = { ...list[i], ...fields };
    save(list);
    return list[i];
  });
}

function getByMerchant(merchantTransactionId) {
  return load().find((x) => x.merchantTransactionId === merchantTransactionId) || null;
}

function getByCinetpay(transactionId) {
  return load().find((x) => x.transactionId === transactionId) || null;
}

function all() {
  return load().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

module.exports = { upsert, patch, getByMerchant, getByCinetpay, all };
