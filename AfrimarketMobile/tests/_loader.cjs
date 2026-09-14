'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const { AsyncStorage, Crypto } = require('./_stubs.cjs');

const ORIGINAL_LOAD = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') return AsyncStorage;
  if (request === 'expo-crypto') return Crypto;
  return ORIGINAL_LOAD.call(this, request, parent, isMain);
};

module.exports._restore = () => { Module._load = ORIGINAL_LOAD; };

function transpile(fileRel) {
  const srcPath = path.join(__dirname, '..', 'src', 'lib', fileRel);
  const src = fs.readFileSync(srcPath, 'utf8');
  const out = babel.transformSync(src, {
    filename: srcPath,
    sourceType: 'module',
    presets: [[require.resolve('babel-preset-expo'), { jsx: false }]],
    babelrc: false,
    configFile: false,
  });
  return out.code;
}

function loadModule(code, srcPath) {
  const moduleObj = { exports: {} };
  const req = (id) => { const m = require.resolve(id); };

  const fn = new Function('exports', 'module', 'require', '__filename', '__dirname', code);
  const localResolve = (id) => {
    const dir = path.dirname(srcPath);
    let p = path.join(dir, id);
    if (fs.existsSync(p)) return p;
    const candidates = ['.js', '.index.js', path.join(dir, id + '.js'), path.join(dir, id, 'index.js')];
    for (const c of candidates) if (fs.existsSync(c)) return c;
    try { return require.resolve(id); } catch { throw new Error('cannot resolve ' + id); }
  };
  fn(moduleObj.exports, moduleObj, (id) => {
    if (id === '@react-native-async-storage/async-storage') return AsyncStorage;
    if (id === 'expo-crypto') return Crypto;
    return require(localResolve(id));
  }, srcPath, path.dirname(srcPath));
  return moduleObj.exports;
}

function loadLib(fileRel) {
  const srcPath = path.join(__dirname, '..', 'src', 'lib', fileRel);
  const code = transpile(fileRel);
  return loadModule(code, srcPath);
}

module.exports = { loadLib, AsyncStorage, Crypto, _restore: module.exports._restore };
