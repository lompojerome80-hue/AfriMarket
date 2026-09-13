import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACK_KEY = 'afrimarket_tracking';

const DEFAULT = { searches: [], boughtBoutiques: [], purchases: 0 };

export async function getTrackingProfile() {
  try {
    const t = JSON.parse(await AsyncStorage.getItem(TRACK_KEY)) || {};
    return { ...DEFAULT, ...t };
  } catch {
    return { ...DEFAULT };
  }
}

export async function trackSearch(term) {
  const q = String(term || '').trim().toLowerCase();
  if (!q) return;
  const t = await getTrackingProfile();
  const next = {
    ...t,
    searches: [q, ...(t.searches || [])].slice(0, 100),
  };
  try {
    await AsyncStorage.setItem(TRACK_KEY, JSON.stringify(next));
  } catch {}
}

export async function trackPurchase(boutiqueKeys = []) {
  const keys = (Array.isArray(boutiqueKeys) ? boutiqueKeys : []).filter(Boolean);
  if (!keys.length) return;
  const t = await getTrackingProfile();
  const next = {
    ...t,
    boughtBoutiques: [...new Set([...keys, ...(t.boughtBoutiques || [])])].slice(0, 50),
    purchases: (t.purchases || 0) + 1,
  };
  try {
    await AsyncStorage.setItem(TRACK_KEY, JSON.stringify(next));
  } catch {}
}