import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppBar from '../src/components/AppBar';
import { getCurrentUser } from '../src/lib/auth';
import { getFeatured } from '../src/lib/admin';
import { COLORS, SHADOWS } from '../src/constants/theme';

const slugify = (n) => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const isFeatured = (b, slugs) => {
  const s = slugify(b.slug || b.nom || b.name || '');
  return slugs.includes(s) || slugs.includes(b.slug);
};

const BoutiqueCard = ({ boutique, onPress }) => {
  const nom = boutique.nom || boutique.name || 'Boutique';
  const produits = boutique.produits || boutique.products || [];
  const ville = boutique.ville || boutique.location || '';
  const featur = !!boutique.featured;
  return (
    <TouchableOpacity style={[styles.card, featur && styles.cardFeatured]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        {boutique.logo ? (
          <Image source={{ uri: boutique.logo }} style={styles.avatarImg} resizeMode="cover" />
        ) : (
          <Text style={styles.avatarText}>{nom.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName} numberOfLines={1}>{nom}</Text>
          {featur ? (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>⭐ Sélectionnée</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardCount}>
          {produits.length} produit{produits.length !== 1 ? 's' : ''}
        </Text>
        {ville ? (
          <Text style={styles.cardLoc}>📍 {ville}</Text>
        ) : null}
      </View>
      <View style={styles.voirBtn}>
        <Text style={styles.voirBtnText}>Voir</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function BoutiquesListScreen() {
  const navigation = useNavigation();
  const [boutiques, setBoutiques] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const u = await getCurrentUser();
          if (mounted) setCanCreate(u?.role === 'Vendeur');
        } catch { /* ignore */ }
      })();
      const loadBoutiques = async () => {
        try {
          const [raw, featured] = await Promise.all([
            AsyncStorage.getItem('afrimarket_boutiques'),
            getFeatured(),
          ]);
          const list = raw ? JSON.parse(raw) : [];
          const slugs = featured.boutiques || [];
          const enriched = [];
          for (const b of list) {
            const key = 'afrimarket_produits_' + (b.slug || slugify(b.nom || b.name || ''));
            const produits = JSON.parse(await AsyncStorage.getItem(key)) || [];
            enriched.push({ ...b, produits, count: produits.length, featured: isFeatured(b, slugs) });
          }
          enriched.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
          if (mounted) setBoutiques(enriched);
        } catch {
          if (mounted) setBoutiques([]);
        } finally {
          if (mounted) setLoading(false);
        }
      };
      loadBoutiques();
      return () => { mounted = false; };
    }, [])
  );

  const handlePress = (slug) => {
    navigation.navigate('BoutiqueDetail', { slug });
  };

  const renderItem = ({ item }) => (
    <BoutiqueCard
      boutique={item}
      onPress={() => handlePress(item.slug || slugify(item.nom || item.name || ''))}
    />
  );

  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = query.trim()
    ? boutiques.filter((b) => {
        const q = norm(query);
        return norm(b.nom || b.name).includes(q) || norm(b.ville || b.location).includes(q);
      })
    : boutiques;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🏪</Text>
      <Text style={styles.emptyTitle}>{query.trim() ? 'Aucun résultat' : 'Aucune boutique'}</Text>
      <Text style={styles.emptySubtitle}>
        {query.trim()
          ? `Aucune boutique ne correspond à « ${query.trim()} ».`
          : canCreate
            ? "Devenez le premier vendeur d'AfriMarket."
            : 'Aucune boutique n\'est encore disponible sur AfriMarket.'}
      </Text>
      {canCreate && (
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateBoutique')}
        >
          <Text style={styles.createBtnText}>Créer une boutique</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppBar
        title="Nos boutiques"
        right={
          canCreate ? (
            <TouchableOpacity
              style={styles.plusBtn}
              onPress={() => navigation.navigate('CreateBoutique')}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.plusBtnText}>+</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une boutique ou une ville..."
          placeholderTextColor={COLORS.mutedSoft}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {query.trim() && (
        <Text style={styles.resultCount}>
          {filtered.length} boutique{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}
        </Text>
      )}
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => item.slug || `boutique-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  plusBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.piment,
    alignItems: 'center', justifyContent: 'center',
  },
  plusBtnText: { color: '#fff', fontSize: 24, lineHeight: 26, marginTop: -2, fontWeight: '700' },
  list: { padding: 16 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    height: 46,
  },
  searchIcon: { fontSize: 15, marginRight: 8, color: COLORS.mutedSoft },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 16,
    color: COLORS.muted,
    paddingLeft: 6,
    fontWeight: '700',
  },
  resultCount: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 2,
  },
  emptyList: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.piment,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 22, fontWeight: '700', color: COLORS.paper },
  cardInfo: { flex: 1 },
  cardFeatured: { borderColor: COLORS.kola, borderWidth: 1.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '600', color: COLORS.ink, flexShrink: 1 },
  featuredBadge: {
    backgroundColor: '#FFF4D6',
    borderRadius: 100,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  featuredBadgeText: { fontSize: 10, fontWeight: '800', color: '#B7791F' },
  cardCount: { fontSize: 13, color: COLORS.muted },
  cardLoc: { fontSize: 11, color: COLORS.mutedSoft, marginTop: 2, fontWeight: '500' },
  voirBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 8, paddingHorizontal: 18,
  },
  voirBtnText: { color: COLORS.paper, fontWeight: '700', fontSize: 13 },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  createBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  createBtnText: { color: COLORS.paper, fontSize: 16, fontWeight: '700' },
});