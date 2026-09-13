import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotification } from './notifications';
import fid from './fid';

const THREADS_PREFIX = 'afrimarket_threads_';
const MESSAGES_PREFIX = 'afrimarket_msgs_';
const INDEX_KEY = 'afrimarket_messaging_index';

async function threads(forKey) {
  try {
    return JSON.parse(await AsyncStorage.getItem(THREADS_PREFIX + (forKey || 'global'))) || [];
  } catch {
    return [];
  }
}

async function saveThreads(forKey, list) {
  await AsyncStorage.setItem(THREADS_PREFIX + (forKey || 'global'), JSON.stringify(list));
}

async function msgs(threadId) {
  try {
    return JSON.parse(await AsyncStorage.getItem(MESSAGES_PREFIX + threadId)) || [];
  } catch {
    return [];
  }
}

async function saveMsgs(threadId, list) {
  await AsyncStorage.setItem(MESSAGES_PREFIX + threadId, JSON.stringify(list));
}

export async function startThread(forKey, { participantKey, participantName, title }) {
  if (!forKey || !participantKey || forKey === participantKey) return null;
  for (const side of [forKey, participantKey]) {
    const list = await threads(side);
    const existing = list.find((t) => t.participants.includes(forKey) && t.participants.includes(participantKey));
    if (existing) return existing.id;
  }
  const id = fid('thr_');
  const thread = {
    id,
    participants: [forKey, participantKey].sort(),
    participantNames: { [forKey]: forKey, [participantKey]: participantName || participantKey },
    title: title || '',
    updatedAt: new Date().toISOString(),
    unreadBy: { [participantKey]: 1, [forKey]: 0 },
  };
  for (const side of [forKey, participantKey]) {
    const list = await threads(side);
    list.unshift(thread);
    await saveThreads(side, list);
  }
  const indexRaw = await AsyncStorage.getItem(INDEX_KEY);
  const index = indexRaw ? JSON.parse(indexRaw) : {};
  index[forKey] = 1;
  index[participantKey] = 1;
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
  await pushNotification(participantKey, {
    title: participantName || 'Nouvelle conversation',
    body: title || 'Nouveau fil de discussion',
    type: 'message',
  });
  return id;
}

export async function getThreads(forKey) {
  const list = await threads(forKey);
  return list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function getUnreadTotal(forKey) {
  const list = await threads(forKey);
  return list.reduce((sum, t) => sum + (t.unreadBy?.[forKey] || 0), 0);
}

export async function sendMessage(threadId, { from, text, audioUri }) {
  const message = {
    id: fid('m_'),
    from,
    text: text || null,
    audioUri: audioUri || null,
    read: false,
    deleted: false,
    createdAt: new Date().toISOString(),
  };
  const list = await msgs(threadId);
  list.push(message);
  await saveMsgs(threadId, list);

  // update thread
  const indexRaw = await AsyncStorage.getItem(INDEX_KEY);
  const index = indexRaw ? JSON.parse(indexRaw) : {};
  for (const forKey of Object.keys(index)) {
    const tList = await threads(forKey);
    const t = tList.find((x) => x.id === threadId);
    if (t) {
      t.updatedAt = message.createdAt;
      const otherKey = t.participants.find((p) => p !== from) || t.participants[0];
      t.unreadBy = t.unreadBy || {};
      t.unreadBy[from] = 0;
      t.unreadBy[otherKey] = (t.unreadBy[otherKey] || 0) + 1;
      await saveThreads(forKey, tList);
      if (otherKey !== from) {
        await pushNotification(otherKey, {
          title: t.participantNames?.[from] || 'Message',
          body: text ? (text.length > 80 ? text.slice(0, 80) + '...' : text) : 'Message vocal',
          type: 'message',
        });
      }
    }
  }
  return message;
}

export async function getMessages(threadId) {
  return (await msgs(threadId)).filter((m) => !m.deleted);
}

export async function markThreadRead(threadId, forKey) {
  const list = await threads(forKey);
  const t = list.find((x) => x.id === threadId);
  if (t) {
    t.unreadBy = t.unreadBy || {};
    t.unreadBy[forKey] = 0;
    await saveThreads(forKey, list);
  }
}

export async function deleteMessage(threadId, messageId) {
  const list = await msgs(threadId);
  const m = list.find((x) => x.id === messageId);
  if (m) m.deleted = true;
  await saveMsgs(threadId, list);
}

export async function registerThreadForKey(forKey, threadId) {
  const list = await threads(forKey);
  if (!list.find((t) => t.id === threadId)) {
    list.unshift({
      id: threadId,
      participants: [forKey],
      participantNames: {},
      title: '',
      updatedAt: new Date().toISOString(),
      unreadBy: { [forKey]: 0 },
    });
    await saveThreads(forKey, list);
  }
}

export async function ensureThread(forKey, participantKey, participantName, title) {
  const list = await threads(forKey);
  let t = list.find((x) => x.participants.includes(participantKey));
  if (!t) {
    await registerThreadForKey(forKey, await startThread(forKey, { participantKey, participantName, title }));
    t = (await threads(forKey)).find((x) => x.participants.includes(participantKey));
  }
  return t?.id || null;
}

export async function registerGlobalThreadParticipants(threadId, userKeys) {
  for (const key of userKeys) {
    await registerThreadForKey(key, threadId);
  }
}