'use strict';

const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..');
const PRESET = require.resolve('babel-preset-expo');

const { loadLib, AsyncStorage, _restore } = require('./_loader.cjs');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function transpile(rel, jsx) {
  const src = read(rel);
  const out = babel.transformSync(src, {
    filename: rel,
    sourceType: 'module',
    babelrc: false,
    configFile: false,
    presets: [[PRESET, { jsx: jsx !== false }]],
  });
  assert.ok(out.code && out.code.length > 300, `transpile ${rel} doit produire du code, trouvé: ${(out.code || '').length}`);
  return out.code;
}

const APPJSON = JSON.parse(read('app.json'));
const SCREENS = fs.readdirSync(path.join(ROOT, 'screens')).filter((f) => f.endsWith('.js'));

let auth;

beforeEach(() => {
  AsyncStorage._reset();
  auth = loadLib('auth.js');
});
after(() => _restore());

test('④-1 app.json : identité store réelle (slug minuscule, ids uniques non-anonymous, versionCode entier, scheme, splash, newArchEnabled)', () => {
  const e = APPJSON.expo;
  assert.equal(e.name, 'AfriMarket');
  assert.equal(e.slug, 'afrimarket');
  assert.equal(e.ios.bundleIdentifier, 'com.afrimarket.mobile');
  assert.equal(e.android.package, 'com.afrimarket.mobile');
  assert.ok(!/anonymous/.test(e.android.package), 'package ne doit pas rester com.anonymous');
  assert.equal(typeof e.android.versionCode, 'number');
  assert.ok(e.android.versionCode >= 1);
  assert.ok(e.scheme && e.scheme.length > 0);
  assert.ok(e.splash && e.splash.image && e.splash.backgroundColor);
  assert.equal(e.newArchEnabled, true);
});

test('④-1 app.json : chemins des icônes/splash référencés existent sur disque avec des octets', () => {
  const e = APPJSON.expo;
  const refs = [
    e.icon, e.splash.image, e.web.favicon,
    e.android.adaptiveIcon.foregroundImage,
    e.android.adaptiveIcon.backgroundImage,
    e.android.adaptiveIcon.monochromeImage,
  ];
  for (const r of refs) {
    const p = path.join(ROOT, r);
    assert.ok(fs.existsSync(p), `ressource manquante: ${r}`);
    assert.ok(fs.statSync(p).size > 0, `ressource vide: ${r}`);
  }
});

test('④-1 app.json : permissions Android camera+audio+service + plugins caméra/photo/location/notifications + usage iOS', () => {
  const e = APPJSON.expo;
  assert.ok(e.android.permissions.includes('android.permission.CAMERA'), 'CAMERA requise (dossier livreur, QR)');
  assert.ok(e.android.permissions.includes('android.permission.RECORD_AUDIO'));
  assert.ok(e.android.permissions.includes('android.permission.FOREGROUND_SERVICE'));
  assert.ok(e.android.permissions.includes('android.permission.ACCESS_FINE_LOCATION'));
  for (const p of ['expo-audio', 'expo-camera', 'expo-image-picker', 'expo-location', 'expo-notifications']) {
    assert.ok(e.plugins.includes(p), `plugin manquant: ${p}`);
  }
  assert.ok(e.ios.infoPlist.NSCameraUsageDescription);
  assert.ok(e.ios.infoPlist.NSPhotoLibraryUsageDescription);
  assert.ok(e.ios.infoPlist.NSLocationWhenInUseUsageDescription);
});

test('④-3 AuthContext : importe AsyncStorage (bug runtime de session corrigé) et transpile', () => {
  const src = read('src/context/AuthContext.js');
  assert.match(src, /import\s+AsyncStorage\s+from\s+['"]@react-native-async-storage\/async-storage['"]/);
  const code = transpile('src/context/AuthContext.js');
  assert.match(code, /async-storage/);
});

test('④-3 auth.js : deleteAccount() supprime réellement le compte en exécution', async () => {
  const res = await auth.registerUser({ phone: '0723456789', password: 'MotDePasse123', role: 'Livreur', name: 'Zara Suppression', courierDossier: {} });
  assert.equal(res.ok, true);
  const user = res.user;
  const key = auth.userKey(user);
  await AsyncStorage.setItem('afrimarket_dossiers', JSON.stringify({ [key]: { userKey: key, docStatus: 'en_attente' } }));

  const ok = await auth.deleteAccount(user);
  assert.equal(ok, true);

  assert.equal((await auth.getAllAccounts()).length, 0, 'compte retiré de la liste des comptes');
  assert.equal(await auth.findAccount('0723456789'), null, 'compte introuvable après suppression');
  assert.equal(await AsyncStorage.getItem('afrimarket_user'), null, 'session USER_KEY purgée');
  assert.equal(await AsyncStorage.getItem('afrimarket_user_v1'), null, 'session contexte (v1) purgée');
  assert.equal(await AsyncStorage.getItem('afrimarket_dossiers'), null, 'dossier livreur purgé');
});

test('④-3 AccountScreen : importe deleteAccount + bouton "Supprimer mon compte" présent', () => {
  const src = read('screens/AccountScreen.js');
  const importLine = src.split('\n').find((l) => /from\s*['"]\.\.\/src\/lib\/auth['"]/.test(l));
  const idx = src.indexOf("from '../src/lib/auth'");
  const importBlock = idx >= 0 ? src.slice(Math.max(0, idx - 400), idx) : src;
  assert.ok(importLine && /\bdeleteAccount\b/.test(importBlock), 'deleteAccount doit être importé depuis ../src/lib/auth');
  assert.match(src, /Supprimer mon compte/, 'le bouton Supprimer mon compte doit exister');
});

test('④-3 AccountScreen : transpile MÊME preset, consomme useAuth() (AuthContext.useAuth)), aucune session fantôme', () => {
  const code = transpile('screens/AccountScreen.js');
  assert.match(code, /AuthContext\.useAuth\s*\)\s*\(/, 'la forme transpilée AuthContext.useAuth() doit être appelée');
  assert.match(code, /applyUser/, 'useAuth doit exposer applyUser');
  assert.match(code, /reloadUser/, 'useAuth doit exposer reloadUser');
  assert.ok(!/setUser\s*\(\s*await\s+getCurrentUser\s*\(\)\s*\)/.test(code), 'plus de session locale fantôme setUser(await getCurrentUser())');
  assert.ok(!/getCurrentUser\s*\(\)/.test(code), 'plus d’appel getCurrentUser() direct dans AccountScreen');
});

test('④-5 Aucun écran de screens/ ne reconstruit une session locale fantôme ni un user useState local', () => {
  for (const f of SCREENS) {
    const code = transpile(path.join('screens', f));
    assert.ok(!/setUser\s*\(\s*await\s+getCurrentUser\s*\(\)\s*\)/.test(code), `${f} : session fantôme setUser(await getCurrentUser())`);
    assert.ok(!/const\s+\[user,\s*setUser\]\s*=\s*useState\(\s*null\s*\)/.test(code), `${f} : user localStorage useState`);
  }
});

test('④-4 Interface : aucun écran transpilé ne contient d’encodage cassé (é mojibake, \\xA9, \\u{ mal échappé)', () => {
  const BROKEN_MOJIB = /[\u00c3][\u00a9\u00a8\u00b4\u00b8\u00a0]|[\u00c2][\u00a9\u00ab\u00bb]|â€™|â€[œœ"]/;
  for (const f of SCREENS) {
    const code = transpile(path.join('screens', f));
    assert.ok(!BROKEN_MOJIB.test(code), `${f} : séquence mojibake (accent cassé)`);
    assert.ok(!/\\x[aA]9/.test(code), `${f} : \\xA9 é cassé`);
    assert.ok(!/\\u\{\s*\}/.test(code), `${f} : \\u{} vide`);
    assert.ok(!/\\u\{[^0-9a-fA-F}]/.test(code), `${f} : \\u{ mal échappé`);
  }
});

test('④-6 eas.json : présent, JSON valide, profils development/preview/production prêts', () => {
  const eas = JSON.parse(read('eas.json'));
  assert.ok(eas.build && eas.build.production, 'profil production requis');
  assert.ok(eas.build.development, 'profil development requis');
  assert.ok(eas.build.preview, 'profil preview requis');
});