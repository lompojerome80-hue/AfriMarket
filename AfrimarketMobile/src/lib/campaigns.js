import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const CAMPAGNES_KEY = 'afrimarket_campagnes';

export const CAMPAGNE_MODES = [
  { key: 'noel', label: 'Noël', emoji: '🎄', title: 'Vœux de Noël', sub: 'Promos de fin d’année sur toute la boutique 🎁' },
  { key: 'nouvelan', label: 'Nouvel An', emoji: '🎆', title: 'Bonne année', sub: 'Réveillon & cadeaux : offres spéciales ✨' },
  { key: 'ramadan', label: 'Ramadan', emoji: '🌙', title: 'Ramadan Moubarak', sub: 'Repas de rupture & offres du mois béni 🍽️' },
  { key: 'fetenat', label: 'Fête nationale', emoji: '🇧🇫', title: 'Fête nationale', sub: 'Toutes nos références en promotion 🎉' },
  { key: 'kouran', label: 'Fête du Mouton', emoji: '🐑', title: 'Tabaski béni', sub: 'Préparatifs : offres spéciales fêtes 🐐' },
  { key: 'special', label: 'Spécial', emoji: '⭐', title: '', sub: '' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

export const TARGET_OPTIONS = [
  { key: 'tous', label: 'Tout le monde' },
  { key: 'role', label: 'Par rôle' },
  { key: 'ville', label: 'Par ville' },
];

export const TARGET_ROLES = ['Acheteur', 'Vendeur', 'Livreur'];

const readLocal = async () => {
  try {
    return JSON.parse(await AsyncStorage.getItem(CAMPAGNES_KEY)) || [];
  } catch {
    return [];
  }
};

const writeLocal = async (list) => {
  try {
    await AsyncStorage.setItem(CAMPAGNES_KEY, JSON.stringify(list));
  } catch {}
};

const sortByUpdated = (list) => [...list].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

const toRow = (c) => ({
  id: c.id,
  mode: c.mode || 'special',
  emoji: c.emoji || '⭐',
  image: c.image || null,
  image_splash: c.imageSplash || null,
  theme: c.theme || '',
  target: c.target || 'tous',
  target_role: c.targetRole || '',
  target_ville: c.targetVille || '',
  link_boutique: c.linkBoutique || '',
  vues: c.vues || 0,
  title: c.title || '',
  sub: c.sub || '',
  start_at: c.startAt || '',
  end_at: c.endAt || '',
  actif: !!c.actif,
  created_at: c.createdAt || 0,
  updated_at: c.updatedAt || 0,
});

const fromRow = (r) => ({
  id: r.id,
  mode: r.mode || 'special',
  emoji: r.emoji || '⭐',
  image: r.image || null,
  imageSplash: r.image_splash || '',
  theme: r.theme || '',
  target: r.target || 'tous',
  targetRole: r.target_role || '',
  targetVille: r.target_ville || '',
  linkBoutique: r.link_boutique || '',
  vues: r.vues || 0,
  title: r.title || '',
  sub: r.sub || '',
  startAt: r.start_at || '',
  endAt: r.end_at || '',
  actif: !!r.actif,
  createdAt: r.created_at || 0,
  updatedAt: r.updated_at || r.created_at || 0,
});

const pullRemote = async () => {
  try {
    const { data, error } = await supabase.from('campagnes').select('*');
    if (!error && Array.isArray(data) && data.length) return data.map(fromRow);
  } catch {}
  return null;
};

const pushRemote = async (list) => {
  try {
    await supabase.from('campagnes').upsert(list.map(toRow));
  } catch {}
};

export const getCampaigns = async () => {
  const local = await readLocal();
  const remote = await pullRemote();
  if (remote && remote.length) {
    const map = {};
    remote.forEach((r) => { map[r.id] = r; });
    local.forEach((l) => { if (!map[l.id]) map[l.id] = l; });
    return sortByUpdated(Object.values(map));
  }
  return sortByUpdated(local);
};

export const getCampaignsLocal = async () => sortByUpdated(await readLocal());

export const campaignVisible = (cam) => {
  if (!cam || !cam.actif) return false;
  const t = todayStr();
  if (cam.startAt && cam.startAt > t) return false;
  if (cam.endAt && cam.endAt < t) return false;
  return true;
};

export const modeLabel = (key) => (CAMPAGNE_MODES.find((m) => m.key === key) || {}).label || key || '';

export const campaignHiddenReason = (cam) => {
  if (!cam) return 'inactive';
  if (!cam.actif) return 'inactive';
  const t = todayStr();
  if (cam.startAt && cam.startAt > t) return 'debut';
  if (cam.endAt && cam.endAt < t) return 'fin';
  return null;
};

export const campaignMatchesUser = (cam, user = {}) => {
  if (!cam || cam.target === 'tous') return true;
  if (cam.target === 'role') return !!cam.targetRole && user.role === cam.targetRole;
  if (cam.target === 'ville') {
    const ville = (user.courierDossier && user.courierDossier.localite) || user.localite || user.ville || '';
    return !!cam.targetVille && ville && ville.toLowerCase() === String(cam.targetVille).toLowerCase();
  }
  return true;
};

export const campaignThemeKeywords = (cam) =>
  String((cam && cam.theme) || '')
    .toLowerCase()
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

const profileText = (profile = {}) =>
  [...(profile.searches || []), ...(profile.boughtBoutiques || [])].join(' ').toLowerCase();

const themeBoost = (cam, profile) => {
  const kw = campaignThemeKeywords(cam);
  if (!kw.length) return 1;
  const text = profileText(profile);
  if (!text) return 0.5;
  let hits = 0;
  for (const k of kw) if (text.includes(k)) hits += 1;
  return hits ? 1 + Math.min(2, hits) : 0.5;
};

export const pickCampaignForUser = (cams = [], user = {}, profile = {}) => {
  const matches = cams.filter((c) => campaignVisible(c) && campaignMatchesUser(c, user));
  if (!matches.length) return null;
  const bought = (profile && profile.boughtBoutiques) || [];
  const scored = matches.map((c) => {
    let w = 1;
    if (c.linkBoutique && bought.includes(c.linkBoutique)) w = 4;
    else if (c.linkBoutique) w = 1.6;
    w *= themeBoost(c, profile);
    const total = (w * 1000) + Math.floor(Math.random() * 1000) / 10;
    return { c, total };
  });
  scored.sort((a, b) => b.total - a.total);
  const [first, second] = scored;
  if (!second) return first.c;
  const r = Math.random();
  return r < 0.72 ? first.c : second.c;
};

export const lastActiveCampaign = async () => {
  const cams = await getCampaigns();
  return cams.filter(campaignVisible)[0] || null;
};

const persistImage = async (uri) => {
  try {
    const dir = FileSystem.documentDirectory + 'campagnes/';
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const target = dir + 'camp_' + Date.now() + '.jpg';
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  } catch {
    return uri;
  }
};

export const saveCampaign = async (c) => {
  const cams = await readLocal();
  const cam = {
    id: String(Date.now()),
    mode: c.mode || 'special',
    emoji: c.emoji || '⭐',
    image: c.image || null,
    imageSplash: c.imageSplash || null,
    theme: c.theme || '',
    target: c.target || 'tous',
    targetRole: c.targetRole || '',
    targetVille: c.targetVille || '',
    linkBoutique: c.linkBoutique || '',
    vues: c.vues || 0,
    title: c.title || '',
    sub: c.sub || '',
    startAt: c.startAt || '',
    endAt: c.endAt || '',
    actif: c.actif !== false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const next = sortByUpdated([cam, ...cams]);
  await writeLocal(next);
  await pushRemote(next);
  return cam;
};

export const setCampaignActive = async (id, actif) => {
  const cams = await readLocal();
  const next = cams.map((c) => (c.id === id ? { ...c, actif: !!actif, updatedAt: Date.now() } : c));
  await writeLocal(next);
  await pushRemote(next);
  return next;
};

export const updateCampaign = async (cam) => {
  const cams = await readLocal();
  const next = cams.map((c) => {
    if (c.id !== cam.id) return c;
    return { ...c, ...cam, updatedAt: Date.now() };
  });
  await writeLocal(next);
  await pushRemote(next);
  return next;
};

export const deleteCampaign = async (id) => {
  const cams = await readLocal();
  const next = cams.filter((c) => c.id !== id);
  await writeLocal(next);
  try {
    await supabase.from('campagnes').delete().eq('id', id);
  } catch {}
  await pushRemote(next);
  return next;
};

export const incrementCampaignVues = async (id) => {
  const cams = await readLocal();
  const target = cams.find((c) => c.id === id);
  if (!target) return cams;
  const next = cams.map((c) => (c.id === id ? { ...c, vues: (c.vues || 0) + 1 } : c));
  await writeLocal(next);
  try {
    await supabase.from('campagnes').update({ vues: (target.vues || 0) + 1 }).eq('id', id);
  } catch {}
  return next;
};

export const createCampaignWithImage = async (c) => {
  const image = c.image ? await persistImage(c.image) : null;
  const imageSplash = c.imageSplash ? await persistImage(c.imageSplash) : null;
  return saveCampaign({ ...c, image, imageSplash });
};