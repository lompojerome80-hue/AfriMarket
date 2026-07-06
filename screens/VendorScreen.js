import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { FCFA, FREE_PRODUCT_LIMIT } from "../data/seed";
import { Badge } from "../components/Common";
import ProductForm from "../components/ProductForm";

export default function VendorScreen({ currentUser, products, isPremiumActive, onBecomeVendor, onAddProduct, onDeleteProduct, onGoSubscription }) {
  const [showForm, setShowForm] = useState(false);

  if (currentUser.role !== "vendor" && currentUser.role !== "admin") {
    return (
      <View style={styles.introWrap}>
        <Ionicons name="cube-outline" size={34} color={colors.primary} style={{ marginBottom: 10 }} />
        <Text style={styles.introTitle}>Devenez vendeur sur AfriMarket</Text>
        <Text style={styles.introText}>
          Créez votre boutique et commencez à vendre vos produits gratuitement (jusqu'à {FREE_PRODUCT_LIMIT} articles).
        </Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={onBecomeVendor}>
          <Text style={styles.ctaText}>Créer ma boutique gratuitement</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const atLimit = !isPremiumActive && products.length >= FREE_PRODUCT_LIMIT;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 12 }}>
      <View style={styles.headRow}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.h1}>Mes produits</Text>
            {isPremiumActive ? <Badge tone="gold">★ Premium</Badge> : <Badge tone="gray">Gratuit</Badge>}
          </View>
          <Text style={styles.subLabel}>{products.length}{!isPremiumActive ? ` / ${FREE_PRODUCT_LIMIT}` : ""} produits publiés</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => (atLimit ? onGoSubscription() : setShowForm(true))}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {atLimit && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitText}>Limite de {FREE_PRODUCT_LIMIT} produits atteinte.</Text>
          <TouchableOpacity onPress={onGoSubscription}><Text style={styles.limitLink}>Passer Premium →</Text></TouchableOpacity>
        </View>
      )}

      {showForm && (
        <ProductForm onCancel={() => setShowForm(false)} onSubmit={(data) => { onAddProduct(data); setShowForm(false); }} />
      )}

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item: p }) => (
          <View style={styles.card}>
            <Image source={{ uri: p.images[0] }} style={styles.img} />
            <View style={{ padding: 8 }}>
              <Text numberOfLines={2} style={styles.pTitle}>{p.title}</Text>
              <Text style={styles.pPrice}>{FCFA(p.price)}</Text>
              <Text style={styles.pStock}>Stock : {p.stock}</Text>
            </View>
            <TouchableOpacity style={styles.delBtn} onPress={() => onDeleteProduct(p.id)}>
              <Ionicons name="trash-outline" size={12} color={colors.red} />
              <Text style={styles.delText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  introWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, backgroundColor: colors.bg },
  introTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6, textAlign: "center", color: colors.text },
  introText: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginBottom: 16 },
  ctaBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  ctaText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  h1: { fontSize: 16, fontWeight: "600", color: colors.text },
  subLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  limitBanner: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
  limitText: { fontSize: 12, color: "#92400E" },
  limitLink: { fontSize: 12, color: "#92400E", fontWeight: "700" },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  img: { width: "100%", aspectRatio: 1, backgroundColor: "#eee" },
  pTitle: { fontSize: 12, color: colors.text, height: 32 },
  pPrice: { color: colors.primary, fontWeight: "700", fontSize: 13, marginTop: 4 },
  pStock: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  delBtn: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  delText: { fontSize: 11, color: colors.red },
});
