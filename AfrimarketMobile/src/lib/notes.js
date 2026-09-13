import AsyncStorage from '@react-native-async-storage/async-storage';
import fid from './fid';

const NOTES_KEY = 'afrimarket_account_notes';

export async function getAccountNotes() {
  try { return JSON.parse(await AsyncStorage.getItem(NOTES_KEY)) || []; } catch { return []; }
}

export async function getNotesForAccount(accountKey) {
  const all = await getAccountNotes();
  return all
    .filter((n) => n.accountKey === accountKey)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function addAccountNote({ accountKey, text, by }) {
  const all = await getAccountNotes();
  all.push({
    id: fid('nt_'),
    accountKey,
    text: String(text || '').trim(),
    by: String(by || 'Admin'),
    at: new Date().toISOString(),
  });
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(all));
  return getNotesForAccount(accountKey);
}