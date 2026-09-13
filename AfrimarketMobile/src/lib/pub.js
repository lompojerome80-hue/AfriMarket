import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { createCampaignWithImage } from './campaigns';
import fid from './fid';

const PUB_REQ_KEY = 'afrimarket_pub_requests';

const slugifyLocal = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export async function getSellerBoutiques(ownerKey) {
  const out = [];
  try {
    const owners = JSON.parse(await AsyncStorage.getItem('afrimarket_boutique_owners')) || {};
    const slugs = Object.keys(owners).filter((s) => owners[s] === ownerKey);
    const boutiques = JSON.parse(await AsyncStorage.getItem('afrimarket_boutiques')) || [];
    const seen = new Set();
    boutiques.forEach((b) => {
      const slug = b.slug || slugifyLocal(b.nom || b.name || '');
      if ((slugs.includes(b.slug || '') || slugs.includes(slug) || !slugs.length) && !seen.has(slug)) {
        seen.add(slug);
        out.push({ slug, nom: b.nom || b.name || slug });
      }
    });
    slugs.forEach((s) => {
      if (!seen.has(s)) out.push({ slug: s, nom: s.replace(/-/g, ' ') });
    });
  } catch {}
  return out;
}

export async function getPubRequests() {
  try {
    const list = JSON.parse(await AsyncStorage.getItem(PUB_REQ_KEY)) || [];
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

const persistMedia = async (media) => {
  if (!media) return null;
  try {
    const dir = FileSystem.documentDirectory + 'pub_requests/';
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const target = dir + 'pub_' + Date.now() + '.jpg';
    await FileSystem.copyAsync({ from: media, to: target });
    return target;
  } catch {
    return media;
  }
};

export async function savePubRequest({ sellerKey, sellerName, sellerPhone, boutique, boutiqueNom, media, title, theme, days }) {
  const list = await getPubRequests();
  const req = {
    id: fid('pub_'),
    sellerKey: sellerKey || '',
    sellerName: sellerName || '',
    sellerPhone: sellerPhone || '',
    boutique: boutique || '',
    boutiqueNom: boutiqueNom || '',
    mediaType: 'image',
    media: await persistMedia(media),
    title: title || '',
    theme: theme || '',
    days: Math.max(1, Number(days) || 1),
    status: 'en_attente',
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(PUB_REQ_KEY, JSON.stringify([req, ...list]));
  return req;
}

export async function deletePubRequest(id) {
  const list = (await getPubRequests()).filter((r) => r.id !== id);
  await AsyncStorage.setItem(PUB_REQ_KEY, JSON.stringify(list));
  return list;
}

export async function approvePubRequest(id) {
  const req = (await getPubRequests()).find((r) => r.id === id);
  if (!req) return { ok: false, error: 'Demande introuvable' };
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + req.days * 86400000).toISOString().slice(0, 10);
  const cam = await createCampaignWithImage({
    mode: 'special',
    emoji: '📣',
    image: req.media || null,
    theme: req.theme || '',
    title: req.title || `Pub ${req.boutiqueNom || 'boutique'}`,
    sub: `${req.sellerName || 'Vendeur'} · ${req.days} jour(s)`,
    startAt: today,
    endAt: end,
    actif: true,
    linkBoutique: req.boutique || '',
  });
  await deletePubRequest(id);
  return { ok: true, cam };
}