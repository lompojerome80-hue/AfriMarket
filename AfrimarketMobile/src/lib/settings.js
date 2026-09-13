import AsyncStorage from '@react-native-async-storage/async-storage';
import fid from './fid';

const SETTINGS_KEY = 'afrimarket_platform_settings';
const ZONES_KEY = 'afrimarket_zones';

const DEFAULTS = { minOrder: 0, homeMessage: '', featuredCarousel: true, adminCode: '', pubSellerEnabled: false, pubSellerMin: 50 };

export async function getPlatformSettings() {
  try {
    const s = JSON.parse(await AsyncStorage.getItem(SETTINGS_KEY)) || {};
    return { ...DEFAULTS, ...s };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function savePlatformSettings(patch) {
  const cur = await getPlatformSettings();
  const next = { ...cur, ...patch };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function verifyAdminCode(code) {
  const s = await getPlatformSettings();
  if (!s.adminCode) return true;
  return String(s.adminCode).trim() === String(code || '').trim();
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