import { COLORS } from '../constants/theme';

export const SECTIONS = [
  { key: 'apercu', label: 'Vue d\'ensemble', icon: '🏠' },
  { key: 'dossiers', label: 'Dossiers', icon: '🪪' },
  { key: 'reglements', label: 'Règlements', icon: '💸' },
  { key: 'litiges', label: 'Litiges', icon: '⚖️' },
  { key: 'tickets', label: 'Support', icon: '🎫' },
  { key: 'commandes', label: 'Commandes', icon: '🧾' },
  { key: 'produits', label: 'Produits', icon: '🛍️' },
  { key: 'signalements', label: 'Signalements', icon: '🚨' },
  { key: 'comptes', label: 'Comptes', icon: '👥' },
  { key: 'dus', label: 'Dûs livreurs', icon: '🚛' },
  { key: 'diffusion', label: 'Diffusion', icon: '📣' },
  { key: 'avant', label: 'En avant', icon: '⭐' },
  { key: 'campagnes', label: 'Campagnes', icon: '🎪' },
  { key: 'coupons', label: 'Coupons', icon: '🎫' },
  { key: 'operateurs', label: 'Opérateurs', icon: '🔌' },
  { key: 'livraisons', label: 'Livraisons', icon: '📍' },
  { key: 'avis', label: 'Avis clients', icon: '🗣️' },
  { key: 'parametres', label: 'Paramètres', icon: '🎚️' },
  { key: 'audit', label: 'Journal', icon: '📒' },
  { key: 'rapports', label: 'Rapports', icon: '📊' },
  { key: 'infos', label: 'Infos app', icon: '📢' },
  { key: 'compta', label: 'Comptabilité', icon: '💰' },
  { key: 'contrats', label: 'Contrats', icon: '📄' },
  { key: 'outils', label: 'Outils', icon: '🧰' },
];

export const STATUS_CHIP_OK = { dot: COLORS.kola, label: 'Résolu' };
export const STATUS_CHIP_WARN = { dot: COLORS.or, label: 'En cours' };
export const STATUS_CHIP_ERR = { dot: COLORS.piment, label: 'Bloqué' };

export function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}