'use strict';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://acxbdhdpmdasrdxwllgi.supabase.co';
const KEY_ENV = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const API_KEY = KEY_ENV || process.env.SUPABASE_ANON_KEY || 'sb_publishable_gyQKxL1C-D6l-phEOD7d3g_A2Ac1sG4';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SQL = args.includes('--sql');
const SHOP = (args.find((a) => a.startsWith('--shop-slug=')) || '--shop-slug=demo-afrimarket').split('=')[1];

const SHOP_ROW = {
  slug: SHOP,
  nom: 'Boutique Démo AfriMarket',
  logo: null,
  banniere: null,
  histoire: 'Boutique de démonstration créée par seed-products.js pour valider le tunnel de paiement.',
  reseaux: {},
};

const PRODUCTS = [
  { title: 'Riz parfumé 25 kg', price: 12000, stock: 100, img: null },
  { title: 'Huile vegetale 5 L', price: 8500, stock: 80, img: null },
  { title: 'Sac de ciment 50 kg', price: 5500, stock: 200, img: null },
  { title: 'Savon de menage x3', price: 2000, stock: 150, img: null },
  { title: 'Telephone 128 Go', price: 85000, stock: 25, img: null },
];

function headers() {
  return {
    apikey: API_KEY,
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function rest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const message = body && body.message ? body.message : String(body);
    const err = new Error(`${options.method || 'GET'} ${path} -> HTTP ${res.status} : ${message}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function printSql() {
  const lines = [];
  lines.push(`-- Boutique (idempotent : aucune colonne ville/category, schema reel verifie)`);
  lines.push(`INSERT INTO boutiques (slug, nom, logo, banniere, histoire, reseaux)`);
  lines.push(`SELECT ${sqlString(SHOP_ROW.slug)}, ${sqlString(SHOP_ROW.nom)}, NULL, NULL, ${sqlString(SHOP_ROW.histoire)}, '{}'::jsonb`);
  lines.push(`WHERE NOT EXISTS (SELECT 1 FROM boutiques b WHERE b.slug = ${sqlString(SHOP)});`);
  lines.push('');
  for (const p of PRODUCTS) {
    lines.push(`INSERT INTO produits (boutique_id, title, price, img, old_price, stock, vendus, revenu)`);
    lines.push(`SELECT b.id, ${sqlString(p.title)}, ${p.price}, NULL, NULL, ${p.stock}, 0, 0`);
    lines.push(`FROM boutiques b WHERE b.slug = ${sqlString(SHOP)}`);
    lines.push(`AND NOT EXISTS (SELECT 1 FROM produits x WHERE x.boutique_id = b.id AND x.title = ${sqlString(p.title)});`);
  }
  lines.push('');
  lines.push(`-- Affiche les UUID et prix reels a utiliser pour tester le paiement`);
  lines.push(`SELECT p.id, p.title, p.price FROM produits p`);
  lines.push(`JOIN boutiques b ON b.id = p.boutique_id WHERE b.slug = ${sqlString(SHOP)} ORDER BY p.title;`);
  process.stdout.write(lines.join('\n') + '\n');
}

async function findShop() {
  const rows = await rest(`boutiques?select=*&slug=eq.${encodeURIComponent(SHOP)}&limit=1`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function upsertShop() {
  const existing = await findShop();
  if (existing) {
    if (!APPLY) return { shop: existing, created: false };
    const rows = await rest(`boutiques?id=eq.${existing.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ nom: SHOP_ROW.nom, histoire: SHOP_ROW.histoire }),
    });
    return { shop: Array.isArray(rows) && rows.length ? rows[0] : existing, created: false };
  }
  if (!APPLY) return { shop: { id: '(sera cree)', slug: SHOP }, created: true };
  const rows = await rest('boutiques', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(SHOP_ROW),
  });
  return { shop: Array.isArray(rows) && rows.length ? rows[0] : null, created: true };
}

async function seedProducts(shop) {
  if (!APPLY && String(shop.id).startsWith('(')) {
    return PRODUCTS.map((p) => ({ id: '(sera cree)', title: p.title, price: p.price }));
  }
  const existing = await rest(`produits?select=id,title,price&boutique_id=eq.${shop.id}`);
  const byTitle = new Map((Array.isArray(existing) ? existing : []).map((r) => [String(r.title), r]));

  const result = [];
  for (const p of PRODUCTS) {
    const found = byTitle.get(p.title);
    if (found) {
      if (APPLY && Number(found.price) !== p.price) {
        const rows = await rest(`produits?id=eq.${found.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ price: p.price, stock: p.stock }),
        });
        result.push(Array.isArray(rows) && rows.length ? rows[0] : { ...found, price: p.price });
      } else {
        result.push(found);
      }
      continue;
    }
    if (!APPLY) {
      result.push({ id: '(sera cree)', title: p.title, price: p.price });
      continue;
    }
    const rows = await rest('produits', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        boutique_id: shop.id,
        title: p.title,
        price: p.price,
        img: p.img,
        old_price: null,
        stock: p.stock,
        vendus: 0,
        revenu: 0,
      }),
    });
    result.push(Array.isArray(rows) && rows.length ? rows[0] : { id: '(inconnu)', title: p.title, price: p.price });
  }
  return result;
}

function printReport(shop, products) {
  const mode = APPLY ? 'APPLY (ecritures reelles)' : 'DRY-RUN (aucune ecriture)';
  process.stdout.write(`\nMode      : ${mode}\n`);
  process.stdout.write(`Boutique  : ${shop.slug} (id=${shop.id})\n`);
  process.stdout.write(`Supabase  : ${SUPABASE_URL}\n`);
  process.stdout.write(`Cle       : ${KEY_ENV ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY (lecture/ecriture peut etre refusee par RLS)'}\n\n`);
  process.stdout.write('Produits :\n');
  for (const p of products) {
    process.stdout.write(`  - ${String(p.title).padEnd(26)} ${String(p.price).padStart(7)}   id=${p.id}\n`);
  }
  const first = products[0];
  if (first && String(first.id).startsWith('(')) {
    process.stdout.write('\nRelancez avec --apply pour ecrire ces produits.\n');
    return;
  }
  process.stdout.write('\nExemple de panier coherent (prix issu de la base) :\n');
  process.stdout.write(JSON.stringify({
    merchantTransactionId: `seed-test-${Date.now()}`,
    amount: first.price,
    currency: 'XOF',
    phone: '0700000000',
    items: [{ id: first.id, name: first.title, prixUnitaire: first.price, qte: 1 }],
  }, null, 2) + '\n');
  process.stdout.write('\nTest du refus de prix arbitraire (doit repondre 400) :\n');
  process.stdout.write(JSON.stringify({
    merchantTransactionId: `seed-bad-${Date.now()}`,
    amount: 1,
    currency: 'XOF',
    phone: '0700000000',
    items: [{ id: first.id, name: first.title, prixUnitaire: 1, qte: 1 }],
  }, null, 2) + '\n');
}

async function main() {
  if (SQL) {
    printSql();
    return;
  }
  if (KEY_ENV && !/service_role|eyJ/i.test(KEY_ENV) && !KEY_ENV.startsWith('sb_secret_')) {
    process.stderr.write('SUPABASE_SERVICE_ROLE_KEY ne ressemble pas a une cle service_role.\n');
    process.exitCode = 1;
    return;
  }
  let shopInfo;
  try {
    shopInfo = await upsertShop();
  } catch (e) {
    process.stderr.write(`\nECHEC : ${e.message}\n`);
    process.stderr.write("\nLa cle publique de l'app ne peut PAS ecrire (RLS). Pour semer :\n");
    process.stderr.write("  1) node scripts/seed-products.js --sql   puis coller le SQL dans Supabase > SQL Editor\n");
    process.stderr.write("  2) ou definir SUPABASE_SERVICE_ROLE_KEY (cle service_role, cote SERVEUR uniquement)\n");
    process.exitCode = 1;
    return;
  }
  const products = await seedProducts(shopInfo.shop);
  printReport(shopInfo.shop, products);
}

main().catch((e) => {
  process.stderr.write(`\nERREUR FATALE : ${e && e.message ? e.message : e}\n`);
  process.exitCode = 1;
});
