export const CATEGORIES = [
  "Électronique", "Mode Femme", "Mode Homme", "Maison & Cuisine",
  "Téléphones", "Beauté & Santé", "Alimentation", "Enfants",
];

const seedImg = (seed) => `https://picsum.photos/seed/${seed}/500/500`;

export const INITIAL_USERS = [
  { id: "u-admin", name: "Admin AfriMarket", email: "admin@afrimarket.africa", role: "admin", subscription: null, subscriptionExpiry: null, banned: false },
  { id: "u-1", name: "Aïcha Diallo", email: "aicha@shop.africa", role: "vendor", subscription: "premium", subscriptionExpiry: "2026-08-05", banned: false },
  { id: "u-2", name: "Koffi Boutique", email: "koffi@shop.africa", role: "vendor", subscription: "free", subscriptionExpiry: null, banned: false },
  { id: "u-3", name: "Fatou Ndiaye", email: "fatou@mail.africa", role: "buyer", subscription: null, subscriptionExpiry: null, banned: false },
];

export const INITIAL_PRODUCTS = [
  { id: "p1", vendorId: "u-1", title: "Écouteurs sans fil Bluetooth 5.3", price: 12500, stock: 40, category: "Électronique", description: "Autonomie 30h, réduction de bruit, résistant à l'eau IPX5.", images: [seedImg("earbuds1"), seedImg("earbuds2")], sold: 214, rating: 4.6 },
  { id: "p2", vendorId: "u-1", title: "Robe wax imprimée tissée main", price: 18900, stock: 15, category: "Mode Femme", description: "Tissu wax 100% coton, coupe ajustée, tailles S à XL.", images: [seedImg("dress1")], sold: 89, rating: 4.8 },
  { id: "p3", vendorId: "u-2", title: "Coque de protection pour smartphone", price: 3500, stock: 120, category: "Téléphones", description: "Silicone renforcé anti-choc, compatible avec la plupart des modèles.", images: [seedImg("case1")], sold: 542, rating: 4.3 },
  { id: "p4", vendorId: "u-2", title: "Mixeur électrique 3 vitesses", price: 22000, stock: 22, category: "Maison & Cuisine", description: "Bol 1.5L, lames en acier inoxydable, garantie 1 an.", images: [seedImg("blender1")], sold: 63, rating: 4.5 },
  { id: "p5", vendorId: "u-1", title: "Sandales en cuir artisanal", price: 9800, stock: 30, category: "Mode Homme", description: "Cuir véritable, semelle confort, fabrication locale.", images: [seedImg("sandal1")], sold: 128, rating: 4.7 },
  { id: "p6", vendorId: "u-2", title: "Crème hydratante karité bio", price: 4200, stock: 80, category: "Beauté & Santé", description: "100% naturelle, beurre de karité pur, sans paraben.", images: [seedImg("cream1")], sold: 301, rating: 4.9 },
];

export const FCFA = (n) => n.toLocaleString("fr-FR") + " FCFA";
export const PREMIUM_PRICE = 5000;
export const FREE_PRODUCT_LIMIT = 3;

export const isPremiumActive = (u) =>
  !!u && u.subscription === "premium" && (!u.subscriptionExpiry || new Date(u.subscriptionExpiry) >= new Date());
