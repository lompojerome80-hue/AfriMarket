import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { FCFA, isPremiumActive } from "../data/seed";
import { Stars, Badge } from "../components/Common";

export default function ProductScreen({ product, vendor, onBack, onAddToCart, onBuyNow }) {
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 12 }}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
        <Text style={styles.backText}>Retour à la boutique</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Image source={{ uri: product.images[activeImg] }} style={styles.mainImg} />
        <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
          {product.images.map((uri, i) => (
            <TouchableOpacity key={i} onPress={() => setActiveImg(i)} style={[styles.thumb, i === activeImg && styles.thumbActive]}>
              <Image source={{ uri }} style={styles.thumbImg} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.title}>{product.title}</Text>
        <View style={styles.rowCenter}>
          <Stars value={product.rating} />
          <Text style={styles.muted}>  {product.sold} vendus · Stock {product.stock}</Text>
        </View>
        <Text style={styles.price}>{FCFA(product.price)}</Text>
        <Text style={styles.desc}>{product.description}</Text>

        <View style={styles.rowCenter}>
          <Ionicons name="person-outline" size={15} color={colors.textMuted} />
          <Text style={styles.muted}>  Vendu par {vendor?.name}</Text>
          {isPremiumActive(vendor) && <View style={{ marginLeft: 6 }}><Badge tone="gold">★ Vérifié</Badge></View>}
        </View>

        <View style={styles.qtyRow}>
          <Text style={{ fontSize: 14, color: colors.text }}>Quantité :</Text>
          <View style={styles.qtyBox}>
            <TouchableOpacity onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity>
            <Text style={styles.qtyVal}>{qty}</Text>
            <TouchableOpacity onPress={() => setQty((q) => Math.min(product.stock, q + 1))} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => onAddToCart(product.id, qty)}>
            <Text style={styles.outlineBtnText}>Ajouter au panier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filledBtn} onPress={() => onBuyNow(product.id, qty)}>
            <Text style={styles.filledBtnText}>Acheter maintenant</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  backText: { color: colors.textMuted, fontSize: 13, marginLeft: 2 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  mainImg: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: "#eee" },
  thumb: { width: 52, height: 52, borderRadius: 6, marginRight: 8, borderWidth: 2, borderColor: "transparent", overflow: "hidden" },
  thumbActive: { borderColor: colors.primary },
  thumbImg: { width: "100%", height: "100%" },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
  rowCenter: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  muted: { fontSize: 12, color: colors.textMuted },
  price: { fontSize: 22, fontWeight: "700", color: colors.primary, marginTop: 8 },
  desc: { fontSize: 13, color: "#4B5563", marginTop: 8, lineHeight: 19 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  qtyBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  qtyBtnText: { fontSize: 16, color: colors.text },
  qtyVal: { paddingHorizontal: 8, fontSize: 14 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  outlineBtnText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  filledBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  filledBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
