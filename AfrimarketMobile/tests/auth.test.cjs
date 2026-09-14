'use strict';

const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

const { loadLib, AsyncStorage, _restore } = require('./_loader.cjs');

const PHONE_1 = '0789123456';
const PHONE_2 = '0789654321';
const PASSWORD_OK = 'MotDePasse123';
const PASSWORD_WEAK = 'azerty';

let auth;

beforeEach(() => { AsyncStorage._reset(); auth = loadLib('auth.js'); });
after(() => _restore());

test('validatePassword : refuse les mots de passe faibles avec la liste des critères manquants', () => {
  const weak = auth.validatePassword(PASSWORD_WEAK);
  assert.equal(weak.ok, false);
  assert.ok(Array.isArray(weak.issues) && weak.issues.length >= 1);

  const good = auth.validatePassword(PASSWORD_OK);
  assert.equal(good.ok, true);
  assert.equal(good.issues.length, 0);
});

test('isLegacyHash : vrai uniquement pour le format legacy exact (18 chars, préfixe h) commençant par h', () => {
  assert.equal(auth.isLegacyHash('hA1b2c3d4e5f6g7h8'), false, '17 caractères seulement → pas 18');
  assert.equal(auth.isLegacyHash('UnHashBeaucoupTropLongPourEtreLegacy'), false);
  assert.equal(auth.isLegacyHash(''), false);
  assert.equal(auth.isLegacyHash(null), false);
});

test('registerUser : création compte + getAllAccounts + findAccount', async () => {
  const res = await auth.registerUser({ phone: PHONE_1, password: PASSWORD_OK, role: 'Vendeur', name: 'Awa Test' });
  assert.equal(res.ok, true);
  assert.ok(res.user);

  const all = await auth.getAllAccounts();
  assert.equal(all.length, 1);
  assert.equal(all[0].phone, PHONE_1);
  assert.equal(all[0].role, 'Vendeur');
  assert.equal(all[0].name, 'Awa Test');

  const found = await auth.findAccount(PHONE_1);
  assert.ok(found);
  assert.equal(found.role, 'Vendeur');

  const missing = await auth.findAccount('0799999999');
  assert.equal(missing, null);
});

test('registerUser : refuse un doublon de téléphone, un seul compte à la fin', async () => {
  await auth.registerUser({ phone: PHONE_1, password: PASSWORD_OK, role: 'Acheteur', name: 'Premier' });

  const dup = await auth.registerUser({ phone: PHONE_1, password: PASSWORD_OK, role: 'Vendeur', name: 'Deuxieme' });
  assert.equal(dup.ok, false);
  assert.ok(dup.error);

  const all = await auth.getAllAccounts();
  assert.equal(all.length, 1);
});

test('loginUser : bon mot de passe connecte, mauvais refuse', async () => {
  await auth.registerUser({ phone: PHONE_1, password: PASSWORD_OK, role: 'Acheteur', name: 'Awa Login' });

  const good = await auth.loginUser({ phone: PHONE_1, password: PASSWORD_OK });
  assert.equal(good.ok, true);
  assert.equal(good.user.phone, PHONE_1);
  assert.equal(good.user.role, 'Acheteur');

  const bad = await auth.loginUser({ phone: PHONE_1, password: 'mauvais-mdp' });
  assert.equal(bad.ok, false);
  assert.ok(bad.error);
});

test('SÉCURITÉ : aucun mot de passe stocké en clair dans AsyncStorage', async () => {
  await auth.registerUser({ phone: PHONE_2, password: PASSWORD_OK, role: 'Vendeur', name: 'Secu Test' });

  const keys = await AsyncStorage.getAllKeys();
  assert.ok(keys.length > 0);
  for (const k of keys) {
    const raw = await AsyncStorage.getItem(k);
    assert.ok(typeof raw === 'string');
    assert.ok(!raw.includes(PASSWORD_OK), 'le mot de passe ne doit jamais apparaître en clair');
  }
});

test('loginAdminSimulated : ouvre la session admin de démo', async () => {
  const res = await auth.loginAdminSimulated();
  assert.equal(res.ok, true);
  assert.ok(res.user);
  assert.equal(res.user.role, 'Admin');
  assert.ok(res.user.name);
});

test('getAccountRole : lit le rôle depuis un userKey', async () => {
  await auth.registerUser({ phone: PHONE_1, password: PASSWORD_OK, role: 'Livreur', name: 'Yao Role' });
  const all = await auth.getAllAccounts();
  const key = auth.userKey(all[0]);
  assert.equal(auth.getAccountRole(key, all), 'Livreur');
});

