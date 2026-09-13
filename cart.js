/* cart.js — panier partagé entre toutes les pages d'AfriMarket.
   Utilise le localStorage du navigateur : fonctionne une fois les fichiers
   ouverts dans un vrai navigateur ou hébergés, mais pas dans un aperçu
   sandboxé (comme certains outils d'IA). Inclure ce fichier sur CHAQUE page
   via <script src="cart.js"></script>, juste avant la fermeture de </body>. */

const CART_KEY = 'afrimarket_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, qty = 1, shopSlug = null) {
  const cart = getCart();
  const existing = cart.find((i) => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...product, qty, shopSlug });
  }
  saveCart(cart);
  showCartToast(`${product.title} ajouté au panier`);
}

function removeFromCart(id) {
  const cart = getCart().filter((i) => i.id !== id);
  saveCart(cart);
  if (typeof renderCartPage === 'function') renderCartPage();
}

function updateQty(id, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (item) {
    item.qty = Math.max(1, qty);
    saveCart(cart);
    if (typeof renderCartPage === 'function') renderCartPage();
  }
}

function clearCart() {
  saveCart([]);
  if (typeof renderCartPage === 'function') renderCartPage();
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function getCartTotal() {
  return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
}

function updateCartBadge() {
  document.querySelectorAll('.cart-count').forEach((el) => {
    const count = getCartCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* Petite notification en bas de l'écran quand un produit est ajouté */
function showCartToast(msg) {
  let toast = document.getElementById('cartToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cartToast';
    toast.style.cssText = [
      'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
      'background:#14132B', 'color:#fff', 'padding:12px 22px', 'border-radius:8px',
      'font-size:13px', 'font-weight:600', 'font-family:Inter,sans-serif',
      'z-index:999', 'opacity:0', 'transition:opacity .3s ease, transform .3s ease',
      'box-shadow:0 10px 30px rgba(0,0,0,0.25)', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(window._cartToastTimer);
  window._cartToastTimer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

document.addEventListener('DOMContentLoaded', updateCartBadge);