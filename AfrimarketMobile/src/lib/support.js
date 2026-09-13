import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotification } from './notifications';

const TICKETS_KEY = 'afrimarket_support_tickets';

export const SUJETS_SUPPORT = ['Commande', 'Paiement', 'Livraison', 'Dossier livreur', 'Boutique', 'Autre'];

async function getTickets() {
  try {
    return JSON.parse(await AsyncStorage.getItem(TICKETS_KEY)) || [];
  } catch {
    return [];
  }
}

async function saveTickets(list) {
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(list));
}

export async function createTicket({ sujet, message, userKey, userName }) {
  if (!sujet || !message.trim()) return { ok: false, error: 'Sujet et message requis.' };
  const list = await getTickets();
  const ticket = {
    id: 'TKT-' + Date.now().toString(36).toUpperCase(),
    sujet,
    message: message.trim(),
    userKey: userKey || 'anonyme',
    userName: userName || 'Anonyme',
    status: 'ouvert',
    at: new Date().toISOString(),
    reponse: null,
  };
  list.push(ticket);
  await saveTickets(list);
  await pushNotification('admin', {
    title: 'Nouveau ticket support',
    body: `${ticket.id} · ${ticket.sujet} — ${ticket.userName}`,
    type: 'support',
  });
  return { ok: true, ticket };
}

export async function getMyTickets(userKeyVal) {
  const list = await getTickets();
  return list.filter((t) => t.userKey === userKeyVal).sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function getAllTickets() {
  return (await getTickets()).sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function closeTicket(id, reponse) {
  const list = await getTickets();
  const t = list.find((x) => x.id === id);
  if (!t) return { ok: false, error: 'Ticket introuvable' };
  t.status = 'resolu';
  t.reponse = reponse || 'Réponse envoyée au client.';
  await saveTickets(list);
  await pushNotification(t.userKey, {
    title: 'Ticket résolu',
    body: `${t.id} : ${t.reponse}`,
    type: 'support',
  });
  return { ok: true };
}