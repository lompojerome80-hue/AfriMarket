import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const USER_KEY = 'afrimarket_user';
const ACCOUNTS_KEY = 'afrimarket_accounts';
const OTP_KEY = 'afrimarket_otp';
const DOSSIERS_KEY = 'afrimarket_dossiers';

export const ROLES = ['Acheteur', 'Vendeur', 'Livreur'];
export const ROLE_ADMIN = 'Admin';

export const MOYENS_DEPLACEMENT = ['Moto', 'Vélo', 'Voiture', 'Vélo-taxi', 'À pied'];

export function validatePassword(pw) {
  const issues = [];
  if (!pw || pw.length < 8) issues.push('Au moins 8 caractères');
  if (!/[A-Z]/.test(pw)) issues.push('Une majuscule');
  if (!/[a-z]/.test(pw)) issues.push('Une minuscule');
  if (!/[0-9]/.test(pw)) issues.push('Un chiffre');
  return { ok: issues.length === 0, issues };
}

const HASH_ITERATIONS = 5000;

export async function hashPassword(password, salt) {
  let h = 'afrimarket::' + salt + '::' + (password || '');
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA512, h);
  }
  return h;
}

function legacyHashString(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'h' + (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function legacyHashPassword(password, salt) {
  return legacyHashString('afrimarket::' + salt + '::' + password + '::afrimarket');
}

const LEGACY_PREFIX = 'h';

export function isLegacyHash(hash) {
  return !!hash && hash.length === 18 && hash.startsWith(LEGACY_PREFIX);
}

export async function makeSalt() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function otpDigest(code, phone) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    'otp::' + String(code) + '::' + String(phone)
  );
}

async function getAccounts() {
  try {
    return JSON.parse(await AsyncStorage.getItem(ACCOUNTS_KEY)) || [];
  } catch {
    return [];
  }
}

async function saveAccounts(list) {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

export async function getAllAccounts() {
  return getAccounts();
}

export async function setAccountClosed(key, reason) {
  const accounts = await getAccounts();
  const idx = accounts.findIndex((a) => a.key === key);
  if (idx === -1) return false;
  accounts[idx].accountStatus = 'ferme';
  accounts[idx].closureReason = reason || '';
  await saveAccounts(accounts);
  const current = await getCurrentUser();
  if (current && userKey(current) === key) {
    await saveUser({ ...current, accountStatus: 'ferme', closureReason: reason || '' });
  }
  return true;
}

export async function setAccountOpen(key) {
  const accounts = await getAccounts();
  const idx = accounts.findIndex((a) => a.key === key);
  if (idx === -1) return false;
  delete accounts[idx].accountStatus;
  delete accounts[idx].closureReason;
  await saveAccounts(accounts);
  const current = await getCurrentUser();
  if (current && userKey(current) === key) {
    const next = { ...current };
    delete next.accountStatus;
    delete next.closureReason;
    await saveUser(next);
  }
  return true;
}

export async function deleteAccountRecord(key) {
  const accounts = await getAccounts();
  const idx = accounts.findIndex((a) => a.key === key);
  if (idx === -1) return false;
  accounts.splice(idx, 1);
  await saveAccounts(accounts);
  const current = await getCurrentUser();
  if (current && userKey(current) === key) {
    await saveUser({ ...current, accountDeleted: true });
  }
  return true;
}

export function isClosedAccount(account) {
  return account?.accountStatus === 'ferme';
}

export async function getCurrentUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function updateUser(patch) {
  const user = (await getCurrentUser()) || {};
  const next = { ...user, ...patch };
  await saveUser(next);
  await upsertAccount(next);
  return next;
}

async function upsertAccount(user) {
  const accounts = await getAccounts();
  const idx = accounts.findIndex((a) => a.key === userKey(user));
  const rec = {
    key: userKey(user),
    phone: user.phone || null,
    name: user.name || '',
    role: user.role || ROLES[0],
    google: !!user.google,
    salt: user.salt || '',
    hash: user.hash || '',
    courierDossier: user.courierDossier || undefined,
    createdAt: user.createdAt || new Date().toISOString(),
  };
  if (idx >= 0) accounts[idx] = { ...accounts[idx], ...rec };
  else accounts.push(rec);
  await saveAccounts(accounts);
}

export async function findAccount(phone) {
  const normalized = String(phone || '').replace(/\s+/g, '');
  const accounts = await getAccounts();
  return accounts.find((a) => a.phone === normalized) || null;
}

function publicUser(account) {
  return {
    key: account.key,
    phone: account.phone || null,
    name: account.name || '',
    role: account.role,
    google: !!account.google,
    createdAt: account.createdAt,
    courierDossier: account.courierDossier || undefined,
  };
}

export async function registerUser({ phone, password, role, name, courierDossier }) {
  const normalized = String(phone || '').replace(/\s+/g, '');
  if (!normalized) return { ok: false, error: 'Numéro de téléphone requis' };
  const pw = validatePassword(password);
  if (!pw.ok) return { ok: false, error: 'Mot de passe faible: ' + pw.issues.join(', ') };
  const existing = await findAccount(normalized);
  if (existing) return { ok: false, error: 'Un compte existe déjà avec ce numéro' };

  const salt = await makeSalt();
  const user = {
    key: userKey({ phone: normalized }),
    phone: normalized,
    name: name || 'Client' + normalized.slice(-4),
    role: role || ROLES[0],
    salt,
    hash: await hashPassword(password, salt),
    google: false,
    createdAt: new Date().toISOString(),
    courierDossier: role === 'Livreur' ? courierDossier || {} : undefined,
  };
  await upsertAccount(user);
  await saveUser(user);
  return { ok: true, user };
}

export async function loginUser({ phone, password }) {
  const normalized = String(phone || '').replace(/\s+/g, '');
  const account = await findAccount(normalized);
  if (!account || !account.hash) return { ok: false, error: 'Aucun compte pour ce numéro' };
  if (isClosedAccount(account)) {
    return { ok: false, error: 'Compte fermé : ce compte a été fermé par un administrateur. Contactez le support.' };
  }
  const currentHash = account.hash;
  let match = false;
  let upgraded = false;
  if ((await hashPassword(password, account.salt || '')) === currentHash) {
    match = true;
  } else if (isLegacyHash(currentHash) && legacyHashPassword(password, account.salt || '') === currentHash) {
    match = true;
    upgraded = true;
  }
  if (!match) {
    return { ok: false, error: 'Mot de passe incorrect' };
  }
  if (upgraded) {
    account.hash = await hashPassword(password, account.salt || '');
    await upsertAccount(account);
  }
  const user = { ...publicUser(account), salt: account.salt, hash: account.hash };
  await saveUser(user);
  return { ok: true, user };
}

export async function resetPassword(phone, newPassword) {
  const normalized = String(phone || '').replace(/\s+/g, '');
  const account = await findAccount(normalized);
  if (!account) return { ok: false, error: 'Aucun compte pour ce numéro' };
  if (isClosedAccount(account)) {
    return { ok: false, error: 'Compte fermé : ce compte a été fermé par un administrateur. Contactez le support.' };
  }
  const pw = validatePassword(newPassword);
  if (!pw.ok) return { ok: false, error: 'Mot de passe faible: ' + pw.issues.join(', ') };
  const salt = await makeSalt();
  account.salt = salt;
  account.hash = await hashPassword(newPassword, salt);
  await upsertAccount(account);
  return { ok: true };
}

export async function sendWhatsappOtp(phone) {
  const normalized = String(phone || '').replace(/\s+/g, '');
  if (!normalized) return { ok: false, error: 'Numéro requis' };
  const buf = new Uint8Array(4);
  Crypto.getRandomValues(buf);
  const rand = ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 0;
  const otp = String(100000 + (rand % 900000));
  await AsyncStorage.setItem(
    OTP_KEY,
    JSON.stringify({
      phone: normalized,
      digest: await otpDigest(otp, normalized),
      expiry: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    })
  );
  return { ok: true, code: otp, simulated: true };
}

export async function verifyWhatsappOtp(phone, code) {
  const raw = await AsyncStorage.getItem(OTP_KEY);
  if (!raw) return { ok: false, error: 'Demander un code d\'abord' };
  const data = JSON.parse(raw);
  if (data.phone !== String(phone || '').replace(/\s+/g, '')) return { ok: false, error: 'Numéro différent' };
  if (Date.now() > data.expiry) return { ok: false, error: 'Code expiré' };
  if (!data.digest) return { ok: false, error: 'Demander un nouveau code' };
  if (data.attempts >= 5) return { ok: false, error: 'Trop de tentatives. Demandez un nouveau code.' };
  const digest = await otpDigest(String(code), data.phone);
  if (digest !== data.digest) {
    data.attempts = (data.attempts || 0) + 1;
    await AsyncStorage.setItem(OTP_KEY, JSON.stringify(data));
    return { ok: false, error: 'Code incorrect' };
  }
  return { ok: true };
}

export async function loginWithOtp({ phone, role, name, courierDossier }) {
  const normalized = String(phone || '').replace(/\s+/g, '');
  let account = await findAccount(normalized);
  if (account && isClosedAccount(account)) {
    return { ok: false, error: 'Compte fermé : ce compte a été fermé par un administrateur. Contactez le support.' };
  }
  let user;
  if (account) {
    user = { ...publicUser(account), salt: account.salt, hash: account.hash };
  } else {
    user = {
      key: userKey({ phone: normalized }),
      phone: normalized,
      name: name || 'Client' + normalized.slice(-4),
      role: role || ROLES[0],
      google: false,
      otp: true,
      createdAt: new Date().toISOString(),
      courierDossier: role === 'Livreur' ? courierDossier || {} : undefined,
    };
    await upsertAccount(user);
  }
  await saveUser(user);
  return { ok: true, user };
}

export async function loginGoogleSimulated(role) {
  const existing = await getCurrentUser();
  if (existing && existing.google) {
    return { ok: true, user: existing, simulated: true };
  }
  const user = {
    key: userKey({ email: 'demo-google' }),
    name: 'Compte Google démo',
    role: role || ROLES[0],
    google: true,
    createdAt: new Date().toISOString(),
    otp: false,
  };
  await upsertAccount(user);
  await saveUser(user);
  return { ok: true, user, simulated: true };
}

export async function loginAdminSimulated() {
  const user = {
    key: userKey({ name: 'admin' }),
    name: 'Administrateur',
    role: ROLE_ADMIN,
    google: false,
    adminDemo: true,
    createdAt: new Date().toISOString(),
  };
  await upsertAccount(user);
  await saveUser(user);
  return { ok: true, user, simulated: true };
}

export async function logout() {
  await AsyncStorage.removeItem(USER_KEY);
}

export async function updateDossier(dossier) {
  const user = (await getCurrentUser()) || {};
  user.role = 'Livreur';
  user.courierDossier = {
    ...(user.courierDossier || {}),
    ...dossier,
    docStatus: 'en_attente',
  };
  await saveUser(user);
  await upsertAccount(user);
  await saveDossierForVerification(user, user.courierDossier);
  return user;
}

async function getDossiers() {
  try {
    return JSON.parse(await AsyncStorage.getItem(DOSSIERS_KEY)) || {};
  } catch {
    return {};
  }
}

async function saveDossierForVerification(user, dossier) {
  const store = await getDossiers();
  store[userKey(user)] = {
    userKey: userKey(user),
    name: user.name || '',
    phone: user.phone,
    role: user.role,
    moyen: dossier.moyen,
    localite: dossier.localite,
    selfieUri: dossier.selfieUri,
    cniRectoUri: dossier.cniRectoUri,
    cniVersoUri: dossier.cniVersoUri,
    docStatus: dossier.docStatus || 'en_attente',
    submittedAt: dossier.submittedAt || new Date().toISOString(),
  };
  await AsyncStorage.setItem(DOSSIERS_KEY, JSON.stringify(store));
}

export async function getAllDossiers() {
  const store = await getDossiers();
  return Object.values(store).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
}

export async function removeDossierByKey(key) {
  const store = await getDossiers();
  if (store[key]) {
    delete store[key];
    await AsyncStorage.setItem(DOSSIERS_KEY, JSON.stringify(store));
  }
}

export async function setDossierStatus(key, status) {
  const store = await getDossiers();
  if (!store[key]) return { ok: false, error: 'Dossier introuvable' };
  store[key].docStatus = status;
  await AsyncStorage.setItem(DOSSIERS_KEY, JSON.stringify(store));
  const user = await getCurrentUser();
  if (user && userKey(user) === key && user.courierDossier) {
    user.courierDossier.docStatus = status;
    await saveUser(user);
    await upsertAccount(user);
  }
  return { ok: true };
}

export function getAccountRole(key, accounts = []) {
  const a = accounts.find((x) => x.key === key);
  return a ? a.role : null;
}

export function isDossierComplete(user) {
  const d = user?.courierDossier;
  if (!d) return false;
  return !!(
    d.localite && d.localite.trim() && d.moyen &&
    (d.photoOk || d.selfieUri) && (d.pieceOk || d.cniRectoUri)
  );
}

export function isDossierVerified(user) {
  return isDossierComplete(user) && user?.courierDossier?.docStatus === 'verifie';
}

export function userKey(user) {
  return (user?.phone || user?.email || user?.name || 'moi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}