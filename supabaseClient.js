/* supabaseClient.js — connexion à votre projet Supabase.
   Si le CDN Supabase ne charge pas ou la clé est invalide, `sb` sera
   un objet factice qui renvoie des erreurs gérées par boutique.js
   (le fallback localStorage prendra le relais). */

const SUPABASE_URL = 'https://djqtznsfjgolnifbjovn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gyQKxL1C-D6l-phEOD7d3g_A2Ac1sG4';

const _dummyResp = { data: null, error: { message: 'Supabase indisponible', code: 'ERR_OFFLINE' } };
const _dummyChain = {
  select: () => _dummyChain,
  insert: () => _dummyChain,
  eq: () => _dummyChain,
  order: () => _dummyChain,
  limit: () => _dummyChain,
  maybeSingle: () => Promise.resolve(_dummyResp),
  single: () => Promise.resolve(_dummyResp),
};
const _dummySb = {
  from: () => _dummyChain,
  rpc: () => Promise.resolve(_dummyResp),
};

let sb;
try {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('Supabase CDN non chargé — mode hors-ligne activé.');
    sb = _dummySb;
  }
} catch (e) {
  console.warn('Erreur initialisation Supabase:', e, '— mode hors-ligne.');
  sb = _dummySb;
}
