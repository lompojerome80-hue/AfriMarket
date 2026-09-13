'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'push-registry.json');

let reg = {};

try {
  if (fs.existsSync(FILE)) {
    reg = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {};
  }
} catch {
  reg = {};
}

function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(reg, null, 2));
  } catch (e) {
    console.error('[push-store] sauvegarde impossible:', e.message);
  }
}

function register(key, token) {
  if (!key || !token) return false;
  reg[String(key)] = { token: String(token), at: new Date().toISOString() };
  save();
  return true;
}

function unregister(key) {
  if (reg[String(key)]) {
    delete reg[String(key)];
    save();
  }
}

function tokensFor(keys) {
  const toks = [];
  for (const k of keys || []) {
    if (reg[String(k)] && reg[String(k)].token) toks.push(reg[String(k)].token);
  }
  return [...new Set(toks)];
}

function all() {
  return reg;
}

module.exports = { register, unregister, tokensFor, all };