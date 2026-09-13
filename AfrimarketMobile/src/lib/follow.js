import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotification } from './notifications';

const FOLLOWED_KEY = 'afrimarket_boutiques_suivies';
const OWNERS_KEY = 'afrimarket_boutique_owners';

async function getMap() {
  try { return JSON.parse(await AsyncStorage.getItem(FOLLOWED_KEY)) || {}; } catch { return {}; }
}

function normSlug(value) {
  return String(value || '').toLowerCase().trim();
}

async function ownerOf(slug) {
  try {
    const owners = JSON.parse(await AsyncStorage.getItem(OWNERS_KEY)) || {};
    return owners[slug] || null;
  } catch { return null; }
}

export async function getFollowedSlugs(userKeyValue) {
  if (!userKeyValue) return [];
  const map = await getMap();
  return Array.isArray(map[userKeyValue]) ? map[userKeyValue] : [];
}

export async function isFollowing(userKeyValue, slug) {
  if (!userKeyValue || !slug) return false;
  return (await getFollowedSlugs(userKeyValue)).includes(slug);
}

export async function toggleFollow(userKeyValue, slug, followerName) {
  if (!userKeyValue || !slug) return { ok: false, following: false };
  const map = await getMap();
  const list = Array.isArray(map[userKeyValue]) ? map[userKeyValue] : [];
  const has = list.some((s) => normSlug(s) === normSlug(slug));
  if (has) {
    map[userKeyValue] = list.filter((s) => normSlug(s) !== normSlug(slug));
    await AsyncStorage.setItem(FOLLOWED_KEY, JSON.stringify(map));
    return { ok: true, following: false };
  }
  map[userKeyValue] = [...list, slug];
  await AsyncStorage.setItem(FOLLOWED_KEY, JSON.stringify(map));
  const owner = await ownerOf(slug);
  if (owner && String(owner) !== String(userKeyValue)) {
    await pushNotification(owner, {
      title: '👥 Nouvel abonné',
      body: `${followerName || 'Un client'} suit votre boutique.`,
      type: 'boutique',
      data: { slug: normSlug(slug) },
    });
  }
  return { ok: true, following: true };
}

export async function getFollowersOf(slug) {
  const target = normSlug(slug);
  const map = await getMap();
  const followers = [];
  for (const [uk, list] of Object.entries(map)) {
    if (Array.isArray(list) && list.some((s) => normSlug(s) === target)) followers.push(uk);
  }
  return followers;
}

export async function getFollowerCount(slug) {
  return (await getFollowersOf(slug)).length;
}

export async function notifyFollowersNewProduct(slug, productTitle) {
  const followers = await getFollowersOf(slug);
  if (!followers.length) return;
  let boutiqueName = slug;
  try {
    const boutiques = JSON.parse(await AsyncStorage.getItem('afrimarket_boutiques')) || [];
    const b = boutiques.find((x) => normSlug(x.slug || x.nom) === normSlug(slug));
    if (b) boutiqueName = b.nom || b.name || boutiqueName;
  } catch {}
  for (const fk of followers) {
    await pushNotification(fk, {
      title: '🆕 Nouveau produit',
      body: `${boutiqueName} a ajouté « ${productTitle} ». Cliquez pour voir.`,
      type: 'boutique',
      data: { slug: normSlug(slug) },
    });
  }
}

export async function getFollowedBoutiques(userKeyValue) {
  const slugs = await getFollowedSlugs(userKeyValue);
  if (!slugs.length) return [];
  try {
    const boutiques = JSON.parse(await AsyncStorage.getItem('afrimarket_boutiques')) || [];
    return boutiques
      .filter((b) => slugs.includes(b.slug || b.nom))
      .map((b) => ({ ...b, slug: b.slug || b.nom }));
  } catch { return []; }
}