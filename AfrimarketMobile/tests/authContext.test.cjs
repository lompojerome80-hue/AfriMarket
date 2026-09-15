'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const { loadLib } = require('./_loader.cjs');

const APP = path.join(__dirname, '..', 'App.js');
const APP_SRC = fs.readFileSync(APP, 'utf8');
const AUTH_CTX = path.join(__dirname, '..', 'src', 'context', 'AuthContext.js');

test('App.js : la ligne d\'import vers ./src/context/AuthContext (ligne EXPLICITE, pas un blob multi-imports) contient AuthProvider ET useAuth', () => {
  const lines = APP_SRC.split('\n');
  const importLines = lines.filter((l) => /from\s*['"]\.\/src\/context\/AuthContext['"]/.test(l));
  assert.ok(importLines.length >= 1, 'App.js doit avoir au moins une ligne "from ./src/context/AuthContext"');
  const line = importLines[0];
  assert.match(line, /\bAuthProvider\b/, 'La ligne doit contenir AuthProvider');
  assert.match(line, /\buseAuth\b/, 'La ligne doit contenir useAuth');
});

test('AuthContext : le module transpile avec LE MÊME preset exact (babel-preset-expo — celui qui a prouvé les 10/10) et contient AuthProvider, useAuth, USER_STORAGE_KEY', () => {
  const src = fs.readFileSync(AUTH_CTX, 'utf8');
  const out = babel.transformSync(src, {
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
