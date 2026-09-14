'use strict';

const nodeCrypto = require('node:crypto');

const _store = {};

const AsyncStorage = {
  _data: _store,
  _reset() {
    for (const k of Object.keys(_store)) delete _store[k];
    return _store;
  },
  async getItem(k) {
    return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null;
  },
  async setItem(k, v) { _store[k] = String(v); },
  async removeItem(k) { delete _store[k]; },
  async getAllKeys() { return Object.keys(_store); },
  async multiGet(keys) { return keys.map((k) => [k, Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null]); },
  async multiSet(pairs) { pairs.forEach(([k, v]) => { _store[k] = String(v); }); },
};

const ALGO = {
  'SHA-1': 'sha1', 'SHA-256': 'sha256', 'SHA-384': 'sha384', 'SHA-512': 'sha512',
};

const Crypto = {
  CryptoDigestAlgorithm: { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384', SHA512: 'SHA-512' },
  async digestStringAsync(algo, data) {
    const name = (typeof algo === 'string' ? algo : algo.name) || 'SHA-256';
    const nodeName = ALGO[name] || 'sha256';
    return nodeCrypto.createHash(nodeName).update(String(data)).digest('hex');
  },
  getRandomBytesAsync: async (n) => Buffer.from(nodeCrypto.randomBytes(n)),
  randomUUID: () => nodeCrypto.randomUUID(),
  getRandomValues: (arr) => {
    const b = nodeCrypto.randomBytes(arr.length);
    for (let i = 0; i < arr.length; i++) arr[i] = b[i];
    return arr;
  },
};

module.exports = { AsyncStorage, Crypto };
