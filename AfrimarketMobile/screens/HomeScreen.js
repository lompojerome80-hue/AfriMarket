import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, Image,
  TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ProductCard from '../src/components/ProductCard';
import AppBar from '../src/components/AppBar';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';
import { CATEGORIES } from '../src/constants/categories';
import { addToCart } from '../src/lib/cart';
import { getAllProducts, productDiscount } from '../src/lib/products';
import { getFeatured, getBoutiquesForAdmin } from '../src/lib/admin';
import { getPlatformSettings } from '../src/lib/settings';
import { getCampaigns, modeLabel, campaignVisible } from '../src/lib/campaigns';
import { t, initI18n, getLang } from '../src/lib/i18n';

const { width } = Dimensions.get('window');

function Logo({ size = 22 }) {
  return (
    <View style={styles.logoRow}>
      <Image source={require('../assets/logo.png')} style={[styles.logoImg, { width: size + 8, height: size + 8 }]} resizeMode="contain" />
      <Text style={[styles.logoText, { fontSize: size }]}>
        Afri<Text style={styles.logoAccent}>Market</Text>
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [toast, setToast] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [featuredData, setFeaturedData] = useState({ boutiques: [], produits: [] });
  const [boutiquesSel, setBoutiquesSel] = useState([]);
  const [homeSettings, setHomeSettings] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [, forceLang] = useState(getLang());
  const promosRef = React.useRef(null);
  const promoPos = React.useRef(0);

  const loadHome = React.useCallback(async () => {
    const [prods, feat, bts, st, cams] = await Promise.all([
      getAllProducts(),
      getFeatured(),
      getBoutiquesForAdmin(),
      getPlatformSettings(),
      getCampaigns(),
    ]);
    setAllProducts(prods);
    setFeaturedData(feat);
    setBoutiquesSel((bts || []).filter((b) => b.featured));
    setHomeSettings(st || {});
    setCampaigns((cams || []).filter(campaignVisible).slice(0, 3));
  }, []);

  React.useEffect(() => { loadHome(); }, [loadHome]);

  const autoScrollPromos = () => {
    const list = promosRef.current;
    const count = promos.length;
    if (!list || count === 0) return;
    const step = width * 0.42 + 12;
    const max = step * count - width;
    promoPos.current += step;
    if (promoPos.current >= max) {
      promoPos.current = 0;
      list.scrollToOffset({ offset: 0, animated: false });
    } else {
      list.scrollToOffset({ offset: promoPos.current, animated: true });
    }
  };

  React.useEffect(() => {
    const t = setInterval(autoScrollPromos, 2600);
    return () => clearInterval(t);
  }, [allProducts]);

  useFocusEffect(
    useCallback(() => {
      initI18n().then(() => forceLang(getLang()));
      loadHome();
    }, [loadHome])
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleAddToCart = async (product) => {
    const res = await addToCart(product);
    showToast(res.ok ? `${product.title} ajouté au panier` : `⚠️ ${res.message}`);
  };

  const handleOpenProduct = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const promos = allProducts.filter((p) => productDiscount(p).has);
  const featured = [...allProducts]
    .sort((a, b) => (b.weeklySales || 0) - (a.weeklySales || 0) || (b.rating || 0) - (a.rating || 0))
    .slice(0, 8);
  const selector = homeSettings.featuredCarousel !== false
    ? allProducts.filter((p) => featuredData.produits.includes(String(p.id))).slice(0, 8)
    : [];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* ── Header (fixe) ── */}
      <AppBar flush title={<Logo size={20} />}>
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => navigation.navigate('Search')}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Rechercher un produit, une boutique...</Text>
        </TouchableOpacity>
      </AppBar>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Promo Banner ── */}
        <View style={styles.promoBanner}>
          <View style={styles.promoTextWrap}>
            <Text style={styles.promoTitle}>{t('welcome')}</Text>
            <Text style={styles.promoSubtitle}>{t('promo_subtitle')}</Text>
          </View>
          <Text style={styles.promoEmoji}>🇧🇫</Text>
        </View>

        {homeSettings.homeMessage ? (
          <View style={styles.homeMsgBanner}>
            <Text style={styles.homeMsgIcon}>📢</Text>
            <Text style={styles.homeMsgText}>{homeSettings.homeMessage}</Text>
          </View>
        ) : null}

        {/* ── Campagne saisonnière (administrée) ── */}
        {campaigns.map((cam) => {
          const body = (
            <>
              {cam.image ? (
                <Image source={{ uri: cam.image }} style={styles.campHeroImg} resizeMode="cover" />
              ) : (
                <View style={styles.campHeroNoImg}>
                  <Text style={styles.campHeroBigEmoji}>{cam.emoji}</Text>
                </View>
              )}
              <View style={styles.campHeroOverlay}>
                <View style={styles.campHeroBadge}>
                  <Text style={styles.campHeroBadgeText}>{cam.emoji} {modeLabel(cam.mode)}</Text>
                </View>
                {cam.title ? (
                  <Text style={styles.campHeroTitle}>{cam.title}</Text>
                ) : null}
                {cam.sub ? (
                  <Text style={styles.campHeroSub} numberOfLines={2}>{cam.sub}</Text>
                ) : null}
                {cam.endAt ? (
                  <Text style={styles.campHeroMeta}>⏳ Jusqu'au {cam.endAt}</Text>
                ) : null}
              </View>
            </>
          );
          return cam.linkBoutique ? (
            <TouchableOpacity
              key={cam.id}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('BoutiqueDetail', { slug: cam.linkBoutique })}
            >
              {body}
              <View style={styles.campHeroShop}>
                <Text style={styles.campHeroShopText}>🛍️ Voir la boutique</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View key={cam.id} style={styles.campHero}>
              {body}
            </View>
          );
        })}

        {/* ── Catégories ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('categories')}</Text>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Search', { category: item.name })}
              >
                <View style={styles.categoryIconWrap}>
                  <Text style={styles.categoryIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.categoryName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* ── PROMOTIONS (Jumia) ── */}
        {promos.length > 0 && (
          <View style={styles.promoSection}>
            <View style={styles.sectionRow}>
              <View style={styles.promoTitleWrap}>
                <Text style={styles.promoTag}>🔥</Text>
                <Text style={styles.promoSectionTitle}>PROMOTIONS DU JOUR</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Text style={styles.seeAll}>Tout voir →</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.promoSectionSub}>Jusqu'à -{Math.max(...promos.map((p) => productDiscount(p).pct))}% de remise</Text>
            <FlatList
              ref={promosRef}
              data={promos}
              horizontal
              style={{ height: 384 }}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => String(item.id) + '_' + i}
              contentContainerStyle={styles.productsList}
              renderItem={({ item }) => (
                <View style={styles.productWrapper}>
                  <ProductCard product={item} onAddToCart={() => handleAddToCart(item)} onOpen={handleOpenProduct} />
                </View>
              )}
            />
          </View>
        )}

        {/* ── Sélection AfriMarket (choisie par l'admin) ── */}
        {selector.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <View style={styles.sectionHead}>
                <Text style={styles.promoSectionTitle}>⭐ Sélection du marché</Text>
                <Text style={styles.sectionHeadSub}>Les produits mis en avant par AfriMarket</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Text style={styles.seeAll}>Tout voir →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={selector}
              horizontal
              style={{ height: 384 }}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => 'sel_' + String(item.id)}
              contentContainerStyle={styles.productsList}
              renderItem={({ item }) => (
                <View style={styles.productWrapper}>
                  <ProductCard product={item} onAddToCart={() => handleAddToCart(item)} onOpen={handleOpenProduct} />
                </View>
              )}
            />
          </View>
        )}

        {/* ── Produits en vedette ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeadTitle}>Produits en vedette</Text>
              <Text style={styles.sectionHeadSub}>🔥 Les plus commandés de la semaine</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.seeAll}>Tout voir →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featured}
            horizontal
            style={{ height: 384 }}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.productsList}
            renderItem={({ item }) => (
              <View style={styles.productWrapper}>
                <ProductCard product={item} onAddToCart={() => handleAddToCart(item)} onOpen={handleOpenProduct} />
              </View>
            )}
          />
        </View>

        {/* ── Grille produits ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 16 }]}>{t('all_products')}</Text>
          <View style={styles.grid}>
            {allProducts.map((item) => (
              <View key={item.id} style={styles.gridItem}>
                <ProductCard product={item} onAddToCart={() => handleAddToCart(item)} onOpen={handleOpenProduct} />
              </View>
            ))}
          </View>
        </View>

        {/* ── Boutiques sélectionnées ── */}
        {boutiquesSel.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionHeadTitle}>Boutiques sélectionnées ⭐</Text>
                <Text style={styles.sectionHeadSub}>Mises en avant par la plateforme</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('BoutiquesTab')} style={styles.seeAllBtn}>
                <Text style={styles.seeAllBtnText}>Voir toutes</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.vendorsRow}>
              {boutiquesSel.slice(0, 5).map((b, i) => (
                <TouchableOpacity
                  key={b.slug || b.nom}
                  style={styles.vendorCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('BoutiqueDetail', { slug: b.slug || b.nom.toLowerCase().replace(/\s+/g, '-') })}
                >
                  <View style={[styles.vendorAvatar, { backgroundColor: [COLORS.or, COLORS.kola, COLORS.piment][i % 3] }]}>
                    <Text style={styles.vendorLetter}>{b.nom[0]}</Text>
                  </View>
                  <Text style={styles.vendorName} numberOfLines={1}>{b.nom}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Nos vendeurs ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Nos vendeurs</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BoutiquesTab')} style={styles.seeAllBtn}>
              <Text style={styles.seeAllBtnText}>Voir toutes</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.vendorsRow}>
            {['Boutique Fatima', 'Artisan Bissa', 'Cuisine Ouaga'].map((name, i) => (
              <TouchableOpacity
                key={i}
                style={styles.vendorCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('BoutiqueDetail', { slug: name.toLowerCase().replace(/\s+/g, '-') })}
              >
                <View style={[styles.vendorAvatar, { backgroundColor: [COLORS.piment, COLORS.kola, COLORS.or][i] }]}>
                  <Text style={styles.vendorLetter}>{name[0]}</Text>
                </View>
                <Text style={styles.vendorName} numberOfLines={1}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

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
  scrollContent: { paddingBottom: 20 },

  /* Header */
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { borderRadius: 6 },
  logoText: { color: '#fff', fontWeight: '800' },
  logoAccent: { color: COLORS.or },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    marginTop: 8,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.line,
    ...SHADOWS.md,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchPlaceholder: { fontSize: 14, color: COLORS.mutedSoft, flex: 1 },

  /* Promo */
  promoSection: {
    marginTop: 26,
    paddingBottom: 4,
    marginBottom: 4,
  },
  promoTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoTag: { fontSize: 18 },
  promoSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.piment,
    letterSpacing: 0.3,
  },
  promoSectionSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginHorizontal: 16,
    marginBottom: 12,
    fontWeight: '600',
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.navDark,
  },
  promoTextWrap: { flex: 1, marginRight: 12 },
  promoTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  promoSubtitle: { color: '#9C99B6', fontSize: 13, fontWeight: '500' },
  promoEmoji: { fontSize: 42 },

  /* Sections */
  section: { marginTop: 26 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHead: { flex: 1 },
  sectionHeadTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
  sectionHeadSub: { fontSize: 12, color: COLORS.muted, marginTop: 3, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, paddingHorizontal: 16, marginBottom: 12 },
  seeAll: { color: COLORS.piment, fontSize: 13, fontWeight: '600' },

  /* Message de la plateforme */
  homeMsgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#F3DFAC',
  },
  homeMsgIcon: { fontSize: 18 },
  homeMsgText: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.ink, lineHeight: 18 },

  /* Campagne saisonnière */
  campHero: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  campHeroImg: { width: '100%', height: 210 },
  campHeroNoImg: {
    width: '100%', height: 210,
    backgroundColor: COLORS.navDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campHeroBigEmoji: { fontSize: 96 },
  campHeroOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 16,
    backgroundColor: 'rgba(10,10,24,0.55)',
  },
  campHeroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.or,
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  campHeroBadgeText: { color: COLORS.navDark, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  campHeroTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  campHeroSub: { color: '#E7E4F5', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  campHeroMeta: { color: '#CDC8E8', fontSize: 11, fontWeight: '600', marginTop: 8 },
  campHeroShop: {
    position: 'absolute', bottom: 14, right: 14,
    backgroundColor: '#E62E04',
    borderRadius: 100,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  campHeroShopText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  seeAllBtn: {
    backgroundColor: COLORS.piment,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 100,
  },
  seeAllBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* Categories */
  categoriesList: { paddingHorizontal: 16, gap: 10 },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    width: 78,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  categoryIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.paper2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryIcon: { fontSize: 22 },
  categoryName: { fontSize: 11, fontWeight: '600', color: COLORS.ink, textAlign: 'center' },

  /* Products */
  productsList: { paddingHorizontal: 16, gap: 12 },
  productWrapper: { width: width * 0.42, marginBottom: 6 },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 0,
  },
  gridItem: { width: '50%', padding: 4 },

  /* Vendors */
  vendorsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  vendorCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  vendorAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  vendorLetter: { fontSize: 22, fontWeight: '700', color: '#fff' },
  vendorName: { fontSize: 11, fontWeight: '600', color: COLORS.ink, textAlign: 'center' },

  toast: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    backgroundColor: COLORS.navDark, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 100, ...SHADOWS.lg,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
