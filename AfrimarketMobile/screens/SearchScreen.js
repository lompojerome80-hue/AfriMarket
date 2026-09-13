import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, ActivityIndicator,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import ProductCard from '../src/components/ProductCard';
import AppBar from '../src/components/AppBar';
import { addToCart } from '../src/lib/cart';
import { getAllProducts, productDiscount } from '../src/lib/products';
import { CATEGORIES } from '../src/constants/categories';
import { trackSearch } from '../src/lib/tracking';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';

const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function SearchScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tous');
  const [rail, setRail] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const handleAddToCart = async (product) => {
    const res = await addToCart(product);
    setToast(res.ok ? `${product.title} ajouté au panier` : `⚠️ ${res.message}`);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  useFocusEffect(
    useCallback(() => {
      const cat = route.params?.category;
      if (cat) setCategory(cat);
      setRail(route.params?.rail || null);
      getAllProducts()
        .then(setAllProducts)
        .finally(() => setLoading(false));
    }, [route.params?.category, route.params?.rail])
  );

  const q = normalize(query.trim());
  const isRailMode = rail === 'promos' || rail === 'featured';
  const base = rail === 'featured'
    ? [...allProducts].sort((a, b) => (b.weeklySales || 0) - (a.weeklySales || 0) || (b.rating || 0) - (a.rating || 0))
    : allProducts;
  const filtered = base.filter((p) => {
    if (rail === 'promos' && !productDiscount(p).has) return false;
    const matchesCat = category === 'Tous' || (p.category || 'Autre') === category;
    const haystack = normalize((p.title || p.name || '') + ' ' + (p.boutiqueName || '') + ' ' + (p.category || ''));
    const matchesQuery = !q || haystack.includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <View style={styles.container}>
      <AppBar
        title={rail === 'promos' ? 'Promotions du jour' : rail === 'featured' ? 'Produits en vedette' : 'Recherche'}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={() => (query.trim() ? setQuery('') : navigation.goBack())}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelText}>{query.trim() ? 'Effacer' : 'Annuler'}</Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Rechercher un produit, une boutique..."
            placeholderTextColor={COLORS.mutedSoft}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => trackSearch(query)}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </AppBar>

      {!loading && (
        <View style={styles.chipsWrap}>
          <FlatList
            data={[{ name: 'Tous', icon: '🛍️' }, ...CATEGORIES]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.chipsContent}
            renderItem={({ item }) => {
              const active = category === item.name;
              return (
                <TouchableOpacity
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.7}
                  onPress={() => setCategory(item.name)}
                >
                  <Text style={styles.chipIcon}>{item.icon}</Text>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {!query.trim() && !loading && (
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>
            {isRailMode
              ? `${filtered.length} produit${filtered.length > 1 ? 's' : ''} ${rail === 'promos' ? 'en promotion' : 'en vedette'}`
              : category === 'Tous'
                ? `Parcourez les ${allProducts.length} produits disponibles`
                : `${filtered.length} produit${filtered.length > 1 ? 's' : ''} dans « ${category} »`}
          </Text>
        </View>
      )}

      {query.trim() && !loading && (
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>
            {filtered.length > 0
              ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} pour « ${query.trim()} »`
              : `Aucun résultat pour « ${query.trim()} »`}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.piment} />
          <Text style={styles.loadingText}>Chargement des produits...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Aucun produit trouvé</Text>
          <Text style={styles.emptySubtitle}>
            Aucun produit dans « {category} » pour cette recherche.
          </Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => { setQuery(''); setCategory('Tous'); }}
          >
            <Text style={styles.resetBtnText}>Voir tous les produits</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <ProductCard
                product={item}
                onAddToCart={() => handleAddToCart(item)}
                onOpen={(p) => navigation.navigate('ProductDetail', { product: p })}
              />
            </View>
          )}
        />
      )}

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ {toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  cancelText: { color: COLORS.or, fontSize: 14, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    marginTop: 8,
    ...SHADOWS.md,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.ink,
    paddingVertical: 10,
    paddingRight: 6,
  },
  clearIcon: { fontSize: 15, color: COLORS.mutedSoft, padding: 4 },
  chipsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    backgroundColor: COLORS.paper,
  },
  chipsContent: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 100,
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  chipActive: {
    backgroundColor: COLORS.navDark,
    borderColor: COLORS.navDark,
  },
  chipIcon: { fontSize: 14, marginRight: 6 },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  chipTextActive: { color: '#fff' },
  hintRow: {
    paddingVertical: 12,
    paddingHorizontal: SIZES.padding + 4,
  },
  hintText: { fontSize: 13, color: COLORS.muted, fontWeight: '500' },
  list: { paddingHorizontal: SIZES.padding, paddingBottom: 24 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  cell: { width: '48.5%' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: { fontSize: 13, color: COLORS.muted, marginTop: 14 },
  emptyIcon: { fontSize: 56, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 6 },
  emptySubtitle: {
    fontSize: 13, color: COLORS.muted, textAlign: 'center',
    lineHeight: 19, marginBottom: 20,
  },
  resetBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 26,
  },
  resetBtnText: { color: COLORS.paper, fontSize: 14, fontWeight: '700' },
  toast: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    backgroundColor: COLORS.navDark, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 100, ...SHADOWS.lg,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});