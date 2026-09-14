'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const { loadLib } = require('./_loader.cjs');

const AUTH_CTX = path.join(__dirname, '..', 'src', 'context', 'AuthContext.js');
const AUTH_CTX_SRC = fs.readFileSync(AUTH_CTX, 'utf8');

test('AuthContext : chaque nom importé de ../lib/auth est un export réel de auth.js (même harnais que les 8/8, auth.js EXÉCUTÉ)', () => {
  const m = AUTH_CTX_SRC.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]\.\.\/lib\/auth['"]/);
  assert.ok(m, 'Le bloc import {..} from ../lib/auth doit exister dans AuthContext.js');
  const names = m[1]
    .split(',')
    .map((s) => s.replace(/\/\/.*$/, '').trim())
    .filter(Boolean)
    .map((s) => {
      const am = s.match(/^(\w+)\s+as\s+(\w+)$/);
      return am ? am[1] : s.split(/\s+/)[0];
    });
  assert.ok(names.length >= 9, 'Au moins 9 noms importés (trouvés: ' + names.length + ')');

  const auth = loadLib('auth.js');
  const missing = names.filter((n) => !(n in auth));
  assert.deepEqual(missing, [], 'Noms introuvables dans auth.js: ' + missing.join(', '));
});

test('AuthContext : le module transpile avec le MÊME preset exact (babel-preset-expo — celui qui a prouvé 8/8) et le code transpilé contient AuthProvider, useAuth, USER_STORAGE_KEY', () => {
  const out = babel.transformSync(AUTH_CTX_SRC, {
    filename: path.basename(AUTH_CTX),
    sourceType: 'module',
    babelrc: false,
    configFile: false,
    presets: [[require.resolve('babel-preset-expo'), { jsx: true }]],
  });
  assert.ok(out.code && out.code.length > 300, 'Le module doit transpiler (code > 300), trouvé: ' + (out.code || '').length);
  assert.match(out.code, /AuthProvider/, 'Le code transpilé doit contenir AuthProvider');
  assert.match(out.code, /useAuth/, 'Le code transpilé doit contenir useAuth');
  assert.match(out.code, /USER_STORAGE_KEY/, 'Le code transpilé doit contenir USER_STORAGE_KEY');
});
