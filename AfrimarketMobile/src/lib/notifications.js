import AsyncStorage from '@react-native-async-storage/async-storage';
import fid from './fid';
import { getCurrentUser, userKey } from './auth';
import { notifyPush } from './push';

function notifKey(forKey) {
  return 'afrimarket_notifications_' + (forKey || 'global');
}

export async function pushNotification(forKey, { title, body, type, data }) {
  try {
    const key = notifKey(forKey);
    const list = JSON.parse(await AsyncStorage.getItem(key)) || [];
    list.unshift({
      id: fid('n_'),
      title: title || '',
      body: body || '',
      type: type || 'info',
      data: data || null,
      read: false,
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {}
  try {
    const me = await getCurrentUser();
    if (forKey && me && userKey(me) !== forKey) {
      notifyPush(forKey, { title, body, data }).catch(() => {});
    }
  } catch {}
}

export async function getNotifications(forKey) {
  try {
    return JSON.parse(await AsyncStorage.getItem(notifKey(forKey))) || [];
  } catch {
    return [];
  }
}

export async function countUnread(forKey) {
  const list = await getNotifications(forKey);
  return list.filter((n) => !n.read).length;
}

export async function markAllRead(forKey) {
  try {
    const key = notifKey(forKey);
    const list = await getNotifications(forKey);
    list.forEach((n) => { n.read = true; });
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

export async function markRead(forKey, id) {
  try {
    const key = notifKey(forKey);
    const list = await getNotifications(forKey);
    const n = list.find((x) => x.id === id);
    if (n) n.read = true;
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {}
}