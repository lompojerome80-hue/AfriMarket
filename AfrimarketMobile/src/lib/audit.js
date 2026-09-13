import AsyncStorage from '@react-native-async-storage/async-storage';
import fid from './fid';

const AUDIT_KEY = 'afrimarket_audit_log';
const LIMIT = 400;

export async function getAuditLog() {
  try {
    const list = JSON.parse(await AsyncStorage.getItem(AUDIT_KEY)) || [];
    return list.sort((a, b) => (a.at < b.at ? 1 : -1));
  } catch {
    return [];
  }
}

export async function logAudit({ action, detail, by }) {
  const list = await getAuditLog();
  list.unshift({
    id: fid('au_'),
    action: String(action || 'Action'),
    detail: String(detail || ''),
    by: String(by || 'Administrateur'),
    at: new Date().toISOString(),
  });
  await AsyncStorage.setItem(AUDIT_KEY, JSON.stringify(list.slice(0, LIMIT)));
  return list;
}

export async function clearAuditLog() {
  await AsyncStorage.setItem(AUDIT_KEY, JSON.stringify([]));
  return [];
}