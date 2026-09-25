import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import secure, { SECURE_KEYS } from './secure';
import fid from './fid';

const SETTINGS_KEY = 'afrimarket_platform_settings';
const ZONES_KEY = 'afrimarket_zones';
const ADMIN_SALT_KEY = 'afrimarket__admin_salt';

const DEFAULTS = { minOrder: 0, homeMessage: '', featuredCarousel: true, adminCodeSet: false, pubSellerEnabled: false, pubSellerMin: 50 };

const MIN_ADMIN_CODE_LENGTH = 6;

/* Code maître de la console admin : gravé en empreinte SHA-512 salée,
   le code lui-même n'apparaît jamais en clair dans le bundle. */
const MASTER_ADMIN_SALT = '084ad02faf9c447deaa160835e2937c1';
const MASTER_ADMIN_HASH = '158518fc5420a7ecced3d77d7c6b62a285fbbfffda7a58d5fcd75b1750164cda1c6ed6f3180e03c602a245a617fd24e97be8d9c622630e9c3577d4bedb9c6df2';

export async function verifyMasterAdminCode(code) {
  const digest = await adminCodeDigest(String(code || '').trim(), MASTER_ADMIN_SALT);
  return safeEqual(digest, MASTER_ADMIN_HASH);
}

async function getAdminSalt() {
  try {
    let salt = await secure.getItem(ADMIN_SALT_KEY);
    if (!salt) {
      const bytes = await Crypto.getRandomBytesAsync(16);
      salt = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      await secure.setItem(ADMIN_SALT_KEY, salt);
    }
    return salt;
  } catch {
    return '';
  }
}

async function adminCodeDigest(code, salt) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    'opencodeadmin::' + String(salt || '') + '::' + String(code || '')
  );
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readAdminCodeRecord() {
  try {
    const raw = await secure.getItem(SECURE_KEYS.adminCode);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.hash === 'string' && typeof parsed.salt === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export async function isAdminCodeSet() {
  return !!(await readAdminCodeRecord());
}

export async function verifyAdminCode(code) {
  if (await verifyMasterAdminCode(code)) return true;
  const rec = await readAdminCodeRecord();
  if (!rec || !rec.hash) return false;
  const digest = await adminCodeDigest(String(code || '').trim(), rec.salt);
  return safeEqual(digest, rec.hash);
}

export async function setPlatformAdminCode(input) {
  const code = String(input || '').trim();
  if (!code) {
    await secure.removeItem(SECURE_KEYS.adminCode);
    return { ok: true, set: false };
  }
  if (code.length < MIN_ADMIN_CODE_LENGTH) {
    return { ok: false, error: 'Code admin trop court (6 caractères minimum).' };
  }
  const salt = await getAdminSalt();
  if (!salt) return { ok: false, error: 'Stockage sécurisé indisponible sur cet appareil.' };
  const hash = await adminCodeDigest(code, salt);
  await secure.setItem(SECURE_KEYS.adminCode, JSON.stringify({ salt, hash }));
  return { ok: true, set: true };
}

async function migrateLegacyAdminCode(stored) {
  if (typeof stored.adminCode !== 'string' || !stored.adminCode.trim()) return false;
  const rec = await readAdminCodeRecord();
  if (rec) return false;
  const salt = await getAdminSalt();
  if (!salt) return false;
  const hash = await adminCodeDigest(stored.adminCode.trim(), salt);
  await secure.setItem(SECURE_KEYS.adminCode, JSON.stringify({ salt, hash }));
  return true;
}

function stripAdminFields(obj) {
  const out = { ...obj };
  delete out.adminCode;
  delete out.adminCodeSet;
  return out;
}

export async function getPlatformSettings() {
  let stored = {};
  try {
    stored = JSON.parse(await AsyncStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    stored = {};
  }
  if ('adminCode' in stored) {
    try {
      await migrateLegacyAdminCode(stored);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(stripAdminFields(stored)));
    } catch {
      // stockage sécurisé indisponible : on garde le comportement sans code plutôt qu'en clair
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(stripAdminFields(stored)));
    }
  }
  const flat = { ...DEFAULTS, ...stripAdminFields(stored) };
  flat.adminCode = '';
  flat.adminCodeSet = await isAdminCodeSet();
  return flat;
}

export async function savePlatformSettings(patch) {
  const cur = await getPlatformSettings();
  const next = stripAdminFields({ ...cur, ...patch });
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  const saved = { ...next, adminCode: '', adminCodeSet: await isAdminCodeSet() };
  return saved;
}

export async function getZones() {
  try { return JSON.parse(await AsyncStorage.getItem(ZONES_KEY)) || []; } catch { return []; }
}

export async function saveZones(list) {
  const clean = (Array.isArray(list) ? list : []).map((z) => ({
    id: z.id,
    ville: String(z.ville || '').trim(),
    frais: Math.max(0, Number(z.frais) || 0),
  }));
  await AsyncStorage.setItem(ZONES_KEY, JSON.stringify(clean));
  return clean;
}

export async function addZone({ ville, frais }) {
  const list = await getZones();
  const cleanVille = String(ville || '').trim();
  if (!cleanVille) return { ok: false, error: 'Ville requise.' };
  if (list.some((z) => z.ville.toLowerCase() === cleanVille.toLowerCase())) {
    return { ok: false, error: `La zone « ${cleanVille} » existe déjà.` };
  }
  const zone = {
    id: fid('zn_'),
    ville: cleanVille,
    frais: Math.max(0, Number(frais) || 0),
  };
  list.push(zone);
  await AsyncStorage.setItem(ZONES_KEY, JSON.stringify(list));
  return { ok: true, zone };
}

export async function deleteZone(id) {
  const list = (await getZones()).filter((z) => z.id !== id);
  await AsyncStorage.setItem(ZONES_KEY, JSON.stringify(list));
  return list;
}