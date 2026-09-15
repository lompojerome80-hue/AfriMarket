'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const SCREENS_DIR = path.join(__dirname, '..', 'screens');
const ACCOUNT = path.join(SCREENS_DIR, 'AccountScreen.js');
const ONBOARD = path.join(SCREENS_DIR, 'OnboardingScreen.js');
const ACCOUNT_SRC = fs.readFileSync(ACCOUNT, 'utf8');
const ONBOARD_SRC = fs.readFileSync(ONBOARD, 'utf8');
const PRESET = require.resolve('babel-preset-expo');

function transpileScreen(file, src, name) {
  const out = babel.transformSync(src, {
    filename: file,
    sourceType: 'module',
    babelrc: false,
    configFile: false,
    presets: [[PRESET, { jsx: true }]],
  });
  assert.ok(out.code && out.code.length > 500, `transpile ${name} doit produire du code (trouvé: ${(out.code || '').length})`);
  return out.code;
}

test('AccountScreen.js : ligne d\'import EXACTE vers ../src/context/AuthContext contenant useAuth (session contexte, pas de session locale)', () => {
  const line = ACCOUNT_SRC.split('\n').find((l) => /from\s*['"]\.\.\/src\/context\/AuthContext['"]/.test(l));
  assert.ok(line, 'AccountScreen doit importer depuis ../src/context/AuthContext');
  assert.match(line, /\buseAuth\b/, 'La ligne doit contenir useAuth');
});

test('AccountScreen.js : AUCUNE session locale fantôme — getCurrentUser/setUser(await getCurrentUser()) ABSENTS du code transpilé', () => {
  const code = transpileScreen(ACCOUNT, ACCOUNT_SRC, 'AccountScreen');
  assert.ok(!/getCurrentUser\s*\(\)/.test(code), 'getCurrentUser() ne doit plus être appelé directement');
  assert.ok(!/setUser\s*\(\s*await\s+getCurrentUser\s*\(\)\s*\)/.test(code), 'plus de setUser(await getCurrentUser())');
  assert.ok(!/useState\s*\(\s*null\s*\)\s*;\s*const \[user,\s*setUser[^\]]*\]/.test(code.replace(/\n/g, ' ')), 'le user doit venir de useAuth(), pas d\'un useState local');
  assert.ok(/applyUser|reloadUser/.test(code), 'le code transpilé doit exposer applyUser/reloadUser via useAuth');
});

test('AccountScreen.js : transpile avec LE MÊME preset (babel-preset-expo) et le composant consomme useAuth()', () => {
  const code = transpileScreen(ACCOUNT, ACCOUNT_SRC, 'AccountScreen');
  assert.match(code, /AuthContext\.useAuth\s*\)\s*\(/, 'Le code transpilé doit appeler AuthContext.useAuth() (forme transpilée)');
});

test('OnboardingScreen.js : ligne d\'import EXACTE vers ../src/context/AuthContext contenant useAuth + transpile MÊME preset, 0 session locale', () => {
  const line = ONBOARD_SRC.split('\n').find((l) => /from\s*['"]\.\.\/src\/context\/AuthContext['"]/.test(l));
  assert.ok(line, 'OnboardingScreen doit importer depuis ../src/context/AuthContext');
  assert.match(line, /\buseAuth\b/, 'La ligne doit contenir useAuth');
  const code = transpileScreen(ONBOARD, ONBOARD_SRC, 'OnboardingScreen');
  assert.match(code, /AuthContext\.useAuth\s*\)\s*\(/, 'Le code transpilé doit appeler AuthContext.useAuth() (forme transpilée)');
  assert.ok(!/getCurrentUser\s*\(\)/.test(code), 'getCurrentUser() ne doit plus être appelé directement');
});
