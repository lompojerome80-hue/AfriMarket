'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'transactions.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) || [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('[store] save error', e.message);
  }
}

function upsert(tx) {
  const list = load();
  const i = list.findIndex((x) => x.merchantTransactionId === tx.merchantTransactionId);
  if (i >= 0) list[i] = tx;
  else list.push(tx);
  save(list);
  return tx;
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

module.exports = { upsert, getByMerchant, getByCinetpay, all };