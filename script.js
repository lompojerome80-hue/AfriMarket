const nav = document.getElementById("menu");
const searchIcon = document.getElementById("searchIcon");
const navOpenBtn = document.getElementById("navOpenBtn");
const navCloseBtn = document.querySelector(".navCloseBtn");
const accessoriesList = document.getElementById("accessoriesList");
const clickToShowList = document.getElementById("clickToShowList");
const sidebar = document.getElementById("sidebar");
const openSidebarBtn = document.getElementById("navOpenPanier");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const overlay = document.getElementById("overlay");
const swiperContainerWrapper = document.querySelector(
  ".swiper-container-wrapper"
);
const removepro = document.querySelectorAll(".remove-pro");
const searchInput = document.getElementById("searchInput");
const languageSelect = document.getElementById("languageSelect");

const translations = {
  fr: {
    title: "AfriMarket",
    navSignIn: "Connexion",
    navCreateAccount: "Créer un compte",
    navCurrency: "XOF",
    searchPlaceholder: "Cherchez un produit, une marque ou catégorie...",
    buttonShowCategories: "Découvrir",
    buttonMoreDetails: "Détails",
    cartTotal: "Total :",
    category: [
      "Mode",
      "Électronique",
      "Maison",
      "Beauté",
      "Épicerie",
      "Art local",
      "Jouets",
      "Sport"
    ],
    promoTitle: "#Meilleures Remises",
    bestProductTitle: "#Produits Vedettes",
    descStartNow: "Découvrez maintenant",
    descPromo: "Offre spéciale du marché",
    sold: "vendu",
    footer: ["À propos", "Support", "Contact", "FAQ"]
  },
  en: {
    title: "AfriMarket",
    navSignIn: "Connexion",
    navCreateAccount: "Créer un compte",
    navCurrency: "XOF",
    searchPlaceholder: "Cherchez un produit, une marque ou catégorie...",
    buttonShowCategories: "Découvrir",
    buttonMoreDetails: "Détails",
    cartTotal: "Total:",
    category: [
      "Fashion",
      "Electronics",
      "Home",
      "Beauty",
      "Grocery",
      "Local Art",
      "Toys",
      "Sport"
    ],
    promoTitle: "#Best Deals",
    bestProductTitle: "#Featured Products",
    descStartNow: "Découvrez maintenant",
    descPromo: "Offre spéciale du marché",
    sold: "vendu",
    footer: ["À propos", "Support", "Contact", "FAQ"]
  }
};

function setLanguage(lang) {
  const locale = translations[lang] || translations.fr;
  document.title = locale.title;
  if (searchInput) {
    searchInput.placeholder = locale.searchPlaceholder;
  }
  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.innerText = value;
  };
  setText('[data-i18n="nav.signIn"]', locale.navSignIn);
  setText('[data-i18n="nav.createAccount"]', locale.navCreateAccount);
  setText('[data-i18n="nav.currency"]', locale.navCurrency);
  setText('[data-i18n="button.showCategories"]', locale.buttonShowCategories);
  setText('[data-i18n="button.moreDetails"]', locale.buttonMoreDetails);
  setText('[data-i18n="cart.total"]', locale.cartTotal);

  const categories = document.querySelectorAll('.category-link');
  categories.forEach((link, index) => {
    if (locale.category[index]) link.innerText = locale.category[index];
  });

  setText('#promoTitle', locale.promoTitle);
  setText('#bestProductTitle', locale.bestProductTitle);
  document.querySelectorAll('[data-i18n="desc.startNow"]').forEach(el => (el.innerText = locale.descStartNow));
  document.querySelectorAll('[data-i18n="desc.promo"]').forEach(el => (el.innerText = locale.descPromo));
  document.querySelectorAll('[data-i18n="sold"]').forEach(el => (el.innerText = locale.sold));
  document.querySelectorAll('[data-i18n="footer.about"]').forEach(el => el.innerText = locale.footer[0]);
  document.querySelectorAll('[data-i18n="footer.support"]').forEach(el => el.innerText = locale.footer[1]);
  document.querySelectorAll('[data-i18n="footer.contact"]').forEach(el => el.innerText = locale.footer[2]);
  document.querySelectorAll('[data-i18n="footer.faq"]').forEach(el => el.innerText = locale.footer[3]);
}

if (languageSelect) {
  languageSelect.addEventListener("change", (event) => {
    setLanguage(event.target.value);
  });
  setLanguage(languageSelect.value);
}

const productCounts = {
  1: 1,
  2: 1,
  3: 1,
};
const productPrices = {
  1: 12000,
  2: 8900,
  3: 6500,
};
function formatPrice(value) {
  return value.toLocaleString('fr-FR') + ' FCFA';
}
function updateProduct(product, increment) {
  if (productCounts[product] > 1 || (increment && productCounts[product] < 5)) {
    const countValueElement = document.getElementById(`countValue${product}`);
    const appliedCountElement = document.getElementById(
      `appliedCount${product}`
    );
    if (productCounts[product] === 0 && increment) {
      productCounts[product] = 1;
    } else if (increment) {
      if (productCounts[product] < 5) {
        productCounts[product]++;
      }
    } else {
      productCounts[product]--;
    }
    countValueElement.innerText = productCounts[product];
    const productPrice = productPrices[product];
    const newProductPrice = productCounts[product] * productPrice;
    appliedCountElement.innerText = formatPrice(newProductPrice);
    updateTotalPrice();
  }
}
document.querySelectorAll(".count").forEach((decrementButton) => {
  decrementButton.addEventListener("click", () => {
    const product = decrementButton.getAttribute("data-product");
    updateProduct(product, false);
  });
});
document.querySelectorAll(".count-2").forEach((incrementButton) => {
  incrementButton.addEventListener("click", () => {
    const product = incrementButton.getAttribute("data-product");
    updateProduct(product, true);
  });
});
function updateTotalPrice() {
  const totalElement = document.getElementById("total");
  const total = Object.keys(productCounts).reduce((acc, product) => {
    const productCount = productCounts[product];
    const productPrice = productPrices[product];
    const productTotal = productCount * productPrice;
    return acc + productTotal;
  }, 0);
  totalElement.innerText = formatPrice(total);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const totalItems = Object.values(productCounts).reduce((a,b)=>a+ (Number(b)||0), 0);
  badge.innerText = totalItems;
}
openSidebarBtn.addEventListener("click", () => {
  sidebar.style.display = "block";
  sidebar.style.right = "0";
  overlay.style.display = "block";
  document.body.classList.add("blurred");
  swiperContainerWrapper.classList.add("blurred-container");
});
closeSidebarBtn.addEventListener("click", () => {
  sidebar.style.right = "-100%";
  // hide after moving out to avoid layout issues
  setTimeout(() => { sidebar.style.display = 'none'; }, 250);
  overlay.style.display = "none";
  document.body.classList.remove("blurred");
  swiperContainerWrapper.classList.remove("blurred-container");
});
clickToShowList?.addEventListener("click", function () {
  if (
    accessoriesList.style.display === "none" ||
    accessoriesList.style.display === ""
  ) {
    accessoriesList.style.display = "block";
  } else {
    accessoriesList.style.display = "none";
  }
});

searchIcon.addEventListener("click", () => {
  nav.classList.toggle("openSearch");
  nav.classList.remove("openNav");
  if (nav.classList.contains("openSearch")) {
    searchIcon.classList.replace("uil-search", "uil-times");
  } else {
    searchIcon.classList.replace("uil-times", "uil-search");
  }
});

navOpenBtn.addEventListener("click", () => {
  nav.classList.add("openNav");
  nav.classList.remove("openSearch");
  searchIcon.classList.replace("uil-times", "uil-search");
});

navCloseBtn.addEventListener("click", () => {
  nav.classList.remove("openNav");
});
function removeProductElement(productElem) {
  // helper to remove product element and keep counts in sync
  const productIdEl = productElem.querySelector('[id^="countValue"]');
  const id = productIdEl ? productIdEl.getAttribute('data-product') : null;
  if (id && productCounts.hasOwnProperty(id)) {
    productCounts[id] = 0;
  }
  productElem.remove();
  updateTotalPrice();
  updateCartBadge();
}

removepro.forEach((button) => {
  button.addEventListener("click", () => {
    const product = button.closest(".pro-item");
    if (product) {
      // Attempt to remove with a short animation class, but ensure removal happens
      product.classList.add("removing");
      // If CSS transition exists, wait a short time then remove; otherwise remove immediately
      setTimeout(() => removeProductElement(product), 200);
    }
  });
});
const contactForm = document.getElementById("myForm");
if (contactForm) {
  contactForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const confirmEmail = document.getElementById("confirmEmail").value;
    const message = document.getElementById("message").value;
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    const nameRegex = /^[a-zA-Z ]{1,30}$/;
    if (fullName.trim() === "") {
      alert("Nom complet est requis");
      return;
    }
    if (!nameRegex.test(fullName)) {
      alert("Nom complet doit contenir au maximum 30 lettres.");
      return;
    }
    if (!email.match(emailRegex)) {
      alert("Adresse email invalide");
      return;
    }
    if (email !== confirmEmail) {
      alert("Les adresses email ne correspondent pas");
      return;
    }
    if (message.trim() === "" || message === "Message") {
      alert("Message est requis");
      return;
    }
    alert("Formulaire soumis avec succès!");
  });
}

// Initialize total on load to reflect current DOM/prices
document.addEventListener('DOMContentLoaded', () => {
  updateTotalPrice();
  updateCartBadge();
});

