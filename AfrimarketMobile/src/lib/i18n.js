import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = 'afrimarket_lang';

export const LANGS = [
  { code: 'fr', label: 'Français' },
  { code: 'moore', label: 'Mooré' },
  { code: 'dioula', label: 'Dioula' },
];

/* Dictionnaire restreint pour l'essentiel de la navigation (démo i18n).
   À étendre progressivement : ajouter la clé dans chaque langue, fallback = clé. */
const dict = {
  fr: {
    welcome: 'Bienvenue sur AfriMarket',
    promo_subtitle: 'Découvrez les meilleurs produits du Burkina Faso',
    all_products: 'Tous les produits',
    categories: 'Catégories',
    mon_compte: 'Mon compte',
    mes_achats: 'Mes achats',
    notifications: 'Notifications',
    support: 'Service technique / Support',
    se_deconnecter: 'Se déconnecter',
    langue: 'Langue',
    ajouter_panier: 'Ajouter au panier',
    epuise: 'Épuisé',
  },
  moore: {
    welcome: 'Wɛlko ne yãmba AfriMarket',
    promo_subtitle: 'Bũmb sẽn tar pãng Burkina Faso wã',
    all_products: 'Bũmbu fãa',
    categories: 'Bũmbã zakã',
    mon_compte: 'Mam tãb-yõ',
    mes_achats: 'Mam ra-sãmds',
    notifications: 'Kɩr-kɩr kengse',
    support: 'Sõng-y tεεm tõn-kεgenga',
    se_deconnecter: 'Bas-y tẽngẽ',
    langue: 'Goama',
    ajouter_panier: 'Rẽ n kẽng pãoogo',
    epuise: 'Peke',
  },
  dioula: {
    welcome: 'Aw ni baara, AfriMarket',
    promo_subtitle: 'Sanya ni burkina Faso sana diya len na',
    all_products: 'Sana bɛɛ',
    categories: 'Sana gbɛ yɛlɛ',
    mon_compte: 'N ka gafedon',
    mes_achats: 'N ka sana',
    notifications: 'Kibaro',
    support: 'Dɛmɛ / Feresi',
    se_deconnecter: 'Mɔnse bɔ',
    langue: 'Kan',
    ajouter_panier: 'Don ni panier la',
    epuise: 'Ban',
  },
};

let lang = 'fr';

export async function initI18n() {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved && dict[saved]) lang = saved;
  } catch {}
  return lang;
}

export async function setLang(code) {
  if (!dict[code]) return;
  lang = code;
  try {
    await AsyncStorage.setItem(LANG_KEY, code);
  } catch {}
  return lang;
}

export function getLang() {
  return lang;
}

export function t(key) {
  const val = dict[lang] && dict[lang][key];
  if (val !== undefined && val !== '') return val;
  if (dict.fr[key]) return dict.fr[key];
  return key;
}