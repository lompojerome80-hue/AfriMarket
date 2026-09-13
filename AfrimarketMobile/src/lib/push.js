import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAYMENT_API_BASE } from '../services/paymentApi';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TOKENS_KEY = 'afrimarket_push_tokens';

let cachedToken = null;
let channelReady = false;

async function getTokenMap() {
  try { return JSON.parse(await AsyncStorage.getItem(TOKENS_KEY)) || {}; } catch { return {}; }
}

async function saveTokenMap(map) {
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(map));
}

async function ensureChannel() {
  if (channelReady) return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'AfriMarket',
      importance: Notifications.AndroidImportance?.HIGH || 4,
    });
  } catch {}
  channelReady = true;
}

export async function ensurePushReady() {
  try {
    const perms = await Notifications.getPermissionsAsync();
    let granted = perms.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return false;
    await ensureChannel();
    if (!cachedToken) {
      try {
        cachedToken = (await Notifications.getExpoPushTokenAsync()).data;
      } catch (e) {
        console.warn('[push] ExpoPushToken indisponible (EAS projectId manquant) :', e && e.message);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function registerAccountForPush(accountKey) {
  if (!accountKey) return;
  try {
    await ensurePushReady();
    if (!cachedToken) return;
    const map = await getTokenMap();
    map[accountKey] = cachedToken;
    await saveTokenMap(map);
    const res = await fetch(`${PAYMENT_API_BASE}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-push-key': 'afrimarket-demo-push' },
      body: JSON.stringify({ token: cachedToken, key: accountKey }),
    });
    if (!res.ok) console.warn('[push] register serveur:', res.status);
  } catch (e) {
    console.warn('[push] enregistrement:', e && e.message);
  }
}

async function scheduleLocal(title, body, data) {
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title: title || 'AfriMarket', body: body || '', data: data || null, sound: 'default' },
      trigger: null,
    });
  } catch (e) {
    console.warn('[push] notification locale:', e && e.message);
  }
}

export async function notifyPush(forKey, { title, body, data } = {}) {
  if (!forKey) return;
  try {
    const map = await getTokenMap();
    const targetToken = map[forKey];
    if (targetToken && targetToken === cachedToken) {
      await scheduleLocal(title, body, data);
      return;
    }
    const res = await fetch(`${PAYMENT_API_BASE}/api/push/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-push-key': 'afrimarket-demo-push' },
      body: JSON.stringify({ keys: [forKey], title, body, data: data || null }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !(payload && payload.recipients)) {
      await scheduleLocal(title, body, data);
    }
  } catch {
    await scheduleLocal(title, body, data);
  }
}