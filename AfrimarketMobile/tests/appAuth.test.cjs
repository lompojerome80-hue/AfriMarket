'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const APP = path.join(__dirname, '..', 'App.js');
const APP_SRC = fs.readFileSync(APP, 'utf8');

const { loadLib } = require('./_loader.cjs');

test('App.js : la ligne d\'import EXACTE vers ./src/context/AuthContext (ligne unique, pas de blob multi-imports) DOIT contenir AuthProvider ET useAuth', () => {
  const line = APP_SRC
    .split('\n')
    .find((l) => /from\s*['"]\.\/src\/context\/AuthContext['"]/.test(l));
  assert.ok(line, 'App.js doit avoir une ligne "from ./src/context/AuthContext"');
  assert.match(line, /\bAuthProvider\b/, 'La ligne doit contenir AuthProvider');
  assert.match(line, /\buseAuth\b/, 'La ligne doit contenir useAuth');
});

test('App.js : transpile avec LE MÊME preset exact (babel-preset-expo — celui qui a prouvé les 10/10) et le code transpilé monte <AuthProvider> avec un composant AppContent qui appelle useAuth()', () => {
  const out = babel.transformSync(APP_SRC, {
    filename: 'App.js',
    sourceType: 'module',
    babelrc: false,
    configFile: false,
    presets: [[require.resolve('babel-preset-expo'), { jsx: true }]],
  });
  assert.ok(out.code && out.code.length > 800, 'Le code transpilé doit être > 800, trouvé: ' + (out.code || '').length);
  assert.match(out.code, /AuthContext\.AuthProvider/, 'Le code transpilé doit référencer AuthContext.AuthProvider');
  assert.match(out.code, /AuthContext\.useAuth/, 'Le code transpilé doit référencer AuthContext.useAuth');
  assert.match(out.code, /function AppContent/, 'Le code transpilé doit contenir AppContent');
  assert.match(out.code, /useAuth\)\(/, 'AppContent doit appeler useAuth()');
  assert.match(out.code, /applyUser/, 'useAuth doit exposer applyUser');
  assert.match(out.code, /reloadUser/, 'useAuth doit exposer reloadUser');
  assert.doesNotMatch(out.code, /setUser\(await getCurrentUser\(\)\)/, 'Plus aucune session locale fantôme setUser');
});
