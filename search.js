/* search.js — recherche partagée entre toutes les pages d'AfriMarket.
   Inclure sur CHAQUE page via <script src="search.js"></script>,
   après cart.js et avant la fermeture de </body>.

   - La recherche texte filtre le catalogue sur index.html (redirige vers
     index.html?q=... si on est sur une autre page).
   - La recherche image ouvre une fenêtre de démonstration : elle simule
     une analyse et propose des produits suggérés. Une vraie recherche par
     image nécessiterait un service de reconnaissance visuelle côté serveur
     (ex. Google Vision API, AWS Rekognition, ou l'API Claude avec vision)
     connecté à l'ensemble du catalogue — pas seulement les quelques
     produits de démonstration listés ici. */

/* Catalogue dupliqué ici en miniature pour permettre à la recherche par
   image de proposer des résultats même depuis une page qui n'a pas le
   catalogue complet dans son HTML (contact, vendeurs, panier). */
const SEARCH_PRODUCTS = [
  { id: 'p1', title: 'Écouteurs sans fil Bluetooth 5.3', price: 12500, img: 'https://picsum.photos/seed/earbuds1/400/400' },
  { id: 'p2', title: 'Robe wax imprimée tissée main', price: 18900, img: 'https://picsum.photos/seed/dress1/400/400' },
  { id: 'p3', title: 'Coque de protection pour smartphone', price: 3500, img: 'https://picsum.photos/seed/case1/400/400' },
  { id: 'p4', title: 'Mixeur électrique 3 vitesses', price: 22000, img: 'https://picsum.photos/seed/blender1/400/400' },
  { id: 'p5', title: 'Sandales en cuir artisanal', price: 9800, img: 'https://picsum.photos/seed/sandal1/400/400' },
  { id: 'p6', title: 'Crème hydratante karité bio', price: 4200, img: 'https://picsum.photos/seed/cream1/400/400' },
  { id: 'p7', title: 'Miel pur artisanal (500g)', price: 3800, img: 'https://picsum.photos/seed/honey1/400/400' },
  { id: 'p8', title: 'Jouet éducatif en bois', price: 6500, img: 'https://picsum.photos/seed/toy1/400/400' },
  { id: 's2', title: 'Batterie externe solaire 10000mAh', price: 14000, img: 'https://picsum.photos/seed/spons2/400/400' },
];

function normalizeText(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* ================= RECHERCHE TEXTE ================= */

function performTextSearch(query) {
  query = (query || '').trim();
  if (!query) return;

  if (!document.getElementById('catalogueGrid')) {
    window.location.href = 'index.html?q=' + encodeURIComponent(query);
    return;
  }
  applySearchFilter(query);
}

function applySearchFilter(query) {
  const q = normalizeText(query);
  const cards = document.querySelectorAll('#catalogueGrid .product-card');
  let count = 0;

  cards.forEach((card) => {
    const title = card.querySelector('.p-title').textContent;
    const match = normalizeText(title).includes(q);
    card.style.display = match ? '' : 'none';
    if (match) count++;
  });

  document.querySelectorAll('.cat-pill').forEach((p) => p.classList.remove('active'));

  const heading = document.querySelector('#catalogue .row-head h2');
  const clearBtn = document.getElementById('clearSearchBtn');
  if (heading) {
    heading.textContent = count > 0 ? `Résultats pour "${query}" (${count})` : `Aucun résultat pour "${query}"`;
  }
  if (clearBtn) clearBtn.style.display = 'inline';

  const emptyMsg = document.getElementById('catEmpty');
  if (emptyMsg) emptyMsg.style.display = count === 0 ? 'block' : 'none';

  const target = document.getElementById('catalogue');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearSearch() {
  document.querySelectorAll('.search input[type="text"]').forEach((inp) => (inp.value = ''));
  const heading = document.querySelector('#catalogue .row-head h2');
  if (heading) heading.textContent = 'Toutes les catégories';
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  if (typeof filterCatalogue === 'function') filterCatalogue('Toutes');
}

/* Si on arrive sur index.html avec ?q=..., lance la recherche automatiquement */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q && document.getElementById('catalogueGrid')) {
    document.querySelectorAll('.search input[type="text"]').forEach((inp) => (inp.value = q));
    setTimeout(() => applySearchFilter(q), 150);
  }
});

/* ================= RECHERCHE PAR IMAGE (démonstration) ================= */

function triggerImageSearch() {
  const input = document.getElementById('imgSearchInput');
  if (input) input.click();
}

function handleImageSearchFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => openImageSearchModal(ev.target.result);
  reader.readAsDataURL(file);
  input.value = '';
}

function pickRandomProducts(n) {
  const shuffled = [...SEARCH_PRODUCTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function fcfaFmt(n) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

function openImageSearchModal(imageDataUrl) {
  closeImageSearchModal();

  const overlay = document.createElement('div');
  overlay.id = 'imgSearchOverlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(20,19,43,0.65);z-index:1000;' +
    'display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif;';
  overlay.onclick = (e) => { if (e.target === overlay) closeImageSearchModal(); };

  const box = document.createElement('div');
  box.style.cssText =
    'background:#fff;border-radius:12px;max-width:520px;width:100%;padding:26px;' +
    'box-shadow:0 30px 60px rgba(0,0,0,0.3);max-height:85vh;overflow-y:auto;';

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="margin:0;font-size:17px;color:#1A1A1A;">Recherche par image</h3>
      <button onclick="closeImageSearchModal()" style="background:none;border:none;cursor:pointer;font-size:20px;color:#62606F;line-height:1;">&times;</button>
    </div>
    <img src="${imageDataUrl}" style="width:100%;max-height:220px;object-fit:contain;border-radius:8px;background:#F3F3F3;margin-bottom:14px;" />
    <div id="imgSearchStatus" style="font-size:13.5px;color:#62606F;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
      <span class="img-search-spinner" style="width:14px;height:14px;border:2px solid #E7E4EE;border-top-color:#E62E04;border-radius:50%;display:inline-block;animation:imgSearchSpin .7s linear infinite;"></span>
      Analyse de l'image en cours...
    </div>
    <div id="imgSearchResults"></div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  if (!document.getElementById('imgSearchSpinStyle')) {
    const style = document.createElement('style');
    style.id = 'imgSearchSpinStyle';
    style.textContent = '@keyframes imgSearchSpin{to{transform:rotate(360deg);}}';
    document.head.appendChild(style);
  }

  setTimeout(() => {
    const status = document.getElementById('imgSearchStatus');
    const results = document.getElementById('imgSearchResults');
    if (!status || !results) return;

    status.innerHTML = '';
    const suggestions = pickRandomProducts(3);

    results.innerHTML = `
      <p style="font-size:12.5px;color:#62606F;margin:0 0 12px;">
        <strong style="color:#1A1A1A;">Produits suggérés</strong> — les plus proches visuellement dans notre catalogue de démonstration :
      </p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
        ${suggestions.map((p) => `
          <div style="border:1px solid #E7E4EE;border-radius:8px;padding:8px;text-align:center;">
            <img src="${p.img}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;margin-bottom:6px;background:#eee;" />
            <p style="font-size:10.5px;margin:0 0 4px;color:#1A1A1A;line-height:1.3;">${p.title}</p>
            <p style="font-size:11.5px;font-weight:700;color:#E62E04;margin:0 0 6px;">${fcfaFmt(p.price)}</p>
            <button onclick="addToCart({id:'${p.id}', title:'${p.title.replace(/'/g, "\\'")}', price:${p.price}, img:'${p.img}'}); closeImageSearchModal();"
              style="width:100%;background:#E62E04;color:#fff;border:none;border-radius:5px;padding:5px;font-size:10px;font-weight:600;cursor:pointer;">
              Ajouter
            </button>
          </div>
        `).join('')}
      </div>
      <div style="background:#FFF4F0;border-radius:8px;padding:12px 14px;font-size:11.5px;color:#7A3A2A;">
        <strong>Démonstration :</strong> ces suggestions sont choisies au hasard, pas analysées depuis votre photo.
        Une vraie recherche par image nécessite un service de reconnaissance visuelle
        (ex. Google Vision, AWS Rekognition, ou une IA avec vision) connecté à l'ensemble du catalogue.
      </div>
    `;
  }, 1300);
}

function closeImageSearchModal() {
  const overlay = document.getElementById('imgSearchOverlay');
  if (overlay) overlay.remove();
}