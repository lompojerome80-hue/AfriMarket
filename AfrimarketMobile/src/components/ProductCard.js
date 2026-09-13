import React, { useState } from 'react';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { fcfa } from '../lib/cart';
import { productDiscount } from '../lib/products';

export default function ProductCard({ product, onAddToCart, onOpen, style }) {
  const [imgError, setImgError] = useState(false);
  const [added, setAdded] = useState(false);
  const imgUri = product.img || product.image;
  const promo = productDiscount(product);
  const outOfStock = product.stock === 0;
  const rating = typeof product.rating === 'number' ? product.rating : null;

  const handleAdd = () => {
    if (outOfStock) return;
    if (onAddToCart) onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const card = (
    <>
      <View style={styles.imgWrap}>
        {imgError || !imgUri ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📦</Text>
          </View>
        ) : (
          <Image source={{ uri: imgUri }} style={styles.img} resizeMode="cover" onError={() => setImgError(true)} />
        )}
        {promo.has && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>-{promo.pct}%</Text>
          </View>
        )}
        {outOfStock && (
          <View style={[styles.stockBadge, styles.stockBadgeOut]}>
            <Text style={styles.stockBadgeText}>ÉPUISÉ</Text>
          </View>
        )}
        {product.boutiqueName ? (
          <View style={styles.shopChip}>
            <Text style={styles.shopChipText} numberOfLines={1}>{product.boutiqueName}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
        {product.boutiqueName ? (
          <Text style={styles.loc} numberOfLines={1}>
            📍 {product.boutiqueVille || 'Burkina Faso'}
          </Text>
        ) : null}
        {rating ? (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
          </View>
        ) : null}
        <View style={styles.priceRow}>
          {promo.has ? (
            <>
              <Text style={styles.oldPrice}>{fcfa(promo.oldPrice)}</Text>
              <Text style={styles.price}>{fcfa(promo.price)}</Text>
            </>
          ) : (
            <Text style={styles.price}>{fcfa(product.price)}</Text>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.stockText, outOfStock && styles.stockTextOut]}>
            {outOfStock ? 'Rupture de stock' : `En stock : ${product.stock}`}
          </Text>
          {typeof product.vendus === 'number' && product.vendus > 0 && (
            <Text style={styles.sold}>{product.vendus} vendu(s)</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.btn, added && styles.btnAdded, outOfStock && styles.btnOut]}
          activeOpacity={0.75}
          disabled={outOfStock}
          onPress={handleAdd}
        >
          <Text style={[styles.btnText, added && styles.btnTextAdded]}>
            {outOfStock ? 'Épuisé' : added ? '✓ Ajouté' : 'Ajouter au panier'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (onOpen) {
    return (
      <TouchableOpacity style={[styles.card, style]} activeOpacity={0.92} onPress={() => onOpen(product)}>
        {card}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{card}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  imgWrap: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.paper2 },
  img: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paper2 },
  placeholderText: { fontSize: 36 },
  promoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.piment,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  promoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.navDark,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
  },
  stockBadgeOut: { backgroundColor: '#C0392B' },
  stockBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  shopChip: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(15,14,35,0.72)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 100,
  },
  shopChipText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  body: { padding: 14 },
  title: { fontSize: SIZES.base, fontWeight: '600', color: COLORS.ink, marginBottom: 6, lineHeight: 19 },
  loc: { fontSize: 11, color: COLORS.mutedSoft, marginBottom: 4, fontWeight: '500' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 3 },
  ratingStar: { color: COLORS.or, fontSize: 12 },
  ratingValue: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  oldPrice: { fontSize: 13, color: COLORS.mutedSoft, textDecorationLine: 'line-through' },
  price: { fontSize: 17, fontWeight: '800', color: COLORS.piment },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 10,
  },
  stockText: { fontSize: 11, fontWeight: '700', color: COLORS.kola },
  stockTextOut: { color: '#C0392B' },
  sold: { fontSize: 11, color: COLORS.muted },
  btn: {
    backgroundColor: COLORS.piment,
    borderRadius: SIZES.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnAdded: { backgroundColor: COLORS.kola },
  btnOut: { backgroundColor: COLORS.muted },
  btnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  btnTextAdded: { color: COLORS.white },
});