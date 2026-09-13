import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getCart, removeFromCart, updateQty, clearCart, getCartTotal, getCartCount, fcfa } from '../src/lib/cart';
import { getCurrentUser } from '../src/lib/auth';
import EmptyState from '../src/components/EmptyState';
import AppBar from '../src/components/AppBar';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function CartScreen() {
  const navigation = useNavigation();
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);

  const refreshCart = useCallback(async () => {
    const items = await getCart();
    setCartItems(items);
    setTotal(await getCartTotal());
    setCount(await getCartCount());
  }, []);

  useFocusEffect(useCallback(() => { refreshCart(); }, [refreshCart]));

  const handleRemove = async (id, title) => {
    Alert.alert('Retirer', `Retirer "${title}" du panier ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: async () => { await removeFromCart(id); refreshCart(); } },
    ]);
  };

  const handleUpdateQty = async (id, newQty) => {
    if (newQty < 1) return handleRemove(id, '');
    await updateQty(id, newQty);
    refreshCart();
  };

  const handleCheckout = async () => {
    const user = await getCurrentUser();
    if (!user) {
      Alert.alert(
        'Compte requis',
        'Créez un compte dans l’onglet Compte avant de passer commande.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Créer un compte', onPress: () => navigation.navigate('MainTabs', { screen: 'Compte' }) },
        ]
      );
      return;
    }
    navigation.navigate('Pay', { items: cartItems, total });
  };

  return (
    <View style={styles.container}>
      <AppBar
        title="Mon panier"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        right={cartItems.length > 0 ? (
          <Text style={styles.headerCount}>{count} article{count > 1 ? 's' : ''}</Text>
        ) : undefined}
      />

      {cartItems.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="Votre panier est vide"
          subtitle="Ajoutez des produits depuis la page d'accueil ou une boutique."
        />
      ) : (
        <>
        <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const lineTotal = item.price * item.qty;
          return (
            <View style={styles.card}>
              {item.img ? (
                <Image source={{ uri: item.img }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imgPlaceholder]}>
                  <Text style={styles.imgPlaceholderText}>📦</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.price}>{fcfa(item.price)}</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(item.id, item.qty - 1)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{item.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(item.id, item.qty + 1)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.lineTotal}>{fcfa(lineTotal)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleRemove(item.id, item.title)}>
                <Text style={styles.delBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.clearBtn} onPress={() => {
          Alert.alert('Vider le panier', 'Tout supprimer ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Vider', style: 'destructive', onPress: async () => { await clearCart(); refreshCart(); } },
          ]);
        }}>
          <Text style={styles.clearBtnText}>Vider le panier</Text>
        </TouchableOpacity>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total ({count} article{count > 1 ? 's' : ''})</Text>
            <Text style={styles.totalPrice}>{fcfa(total)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} activeOpacity={0.8}>
            <Text style={styles.checkoutBtnText}>Commander</Text>
          </TouchableOpacity>
        </View>
        </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },

  headerCount: {
    fontSize: 13,
    color: COLORS.or,
    fontWeight: '700',
    marginRight: 4,
  },

  list: { padding: 16, paddingBottom: 200 },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  image: {
    width: 88, height: 88, borderRadius: 10,
    backgroundColor: COLORS.paper2,
  },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imgPlaceholderText: { fontSize: 26 },
  info: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.ink, lineHeight: 19 },
  price: { fontSize: 13, fontWeight: '500', color: COLORS.muted, marginTop: 2 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.paper2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.line,
  },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.ink },
  qtyVal: { fontSize: 15, fontWeight: '600', color: COLORS.ink, minWidth: 20, textAlign: 'center' },
  lineTotal: { fontSize: 14, fontWeight: '700', color: COLORS.piment, marginLeft: 'auto' },

  delBtn: { justifyContent: 'flex-start', paddingLeft: 6, paddingTop: 2 },
  delBtnText: { fontSize: 16, color: COLORS.mutedSoft },

  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.paper,
    borderTopWidth: 1, borderTopColor: COLORS.line,
    paddingTop: 12, paddingHorizontal: 16, paddingBottom: 100,
    ...SHADOWS.md,
  },
  clearBtn: {
    alignSelf: 'center', marginBottom: 12,
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1, borderColor: COLORS.line,
  },
  clearBtnText: { fontSize: 12, color: COLORS.muted, fontWeight: '500' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 2 },
  totalPrice: { fontSize: 22, fontWeight: '800', color: COLORS.ink },
  checkoutBtn: {
    backgroundColor: COLORS.piment,
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 100,
    ...SHADOWS.sm,
  },
  checkoutBtnText: { color: COLORS.paper, fontSize: 15, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,14,35,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.paper,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  modalIcon: { fontSize: 56, marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: COLORS.ink },
  modalRef: { fontSize: 13, color: COLORS.muted, fontWeight: '600', marginTop: 4, marginBottom: 16 },
  codeBox: {
    width: '100%',
    backgroundColor: COLORS.navDark,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: { color: '#9C99B6', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  codeValue: { color: COLORS.or, fontSize: 40, fontWeight: '900', letterSpacing: 4 },
  codeHint: { color: '#9C99B6', fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 15 },
  modalSub: { fontSize: 13, color: COLORS.muted, marginBottom: 18 },
  modalBtn: {
    width: '100%',
    backgroundColor: COLORS.piment,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
  },
  modalBtnText: { color: COLORS.paper, fontSize: 15, fontWeight: '700' },
  modalClose: { marginTop: 12, padding: 8 },
  modalCloseText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
});
