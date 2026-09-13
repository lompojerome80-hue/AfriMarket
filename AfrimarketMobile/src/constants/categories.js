export const CATEGORIES = [
  { name: 'Beauté', icon: '💄' },
  { name: 'Électronique', icon: '📱' },
  { name: 'Épicerie', icon: '🛒' },
  { name: 'Mode', icon: '👗' },
  { name: 'Maison', icon: '🏠' },
  { name: 'Sport', icon: '⚽' },
  { name: 'Art Local', icon: '🎨' },
  { name: 'Jouets', icon: '🧸' },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export function categoryIcon(name) {
  const c = CATEGORIES.find((x) => x.name === name);
  return c ? c.icon : '🛍️';
}