import React from "react";
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, StyleSheet } from "react-native";
import { colors } from "../theme";
import { CATEGORIES, FCFA, isPremiumActive } from "../data/seed";
import { Stars, Badge } from "../components/Common";

export default function HomeScreen({ products, users, category, setCategory, onOpenProduct, onAddToCart }) {
  const findVendor = (id) => users.find((u) => u.id === id);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {["Toutes", ...CATEGORIES].map((c) => (
          <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.textMuted }}>Aucun produit ne correspond à votre recherche.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={{ padding: 8 }}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item: p }) => {
            const vendor = findVendor(p.vendorId);
            return (
              <View style={styles.card}>
                <TouchableOpacity onPress={() => onOpenProduct(p.id)}>
                  <View style={styles.imgWrap}>
                    <Image source={{ uri: p.images[0] }} style={styles.img} />
                    {isPremiumActive(vendor) && (
                      <View style={styles.badgeAbs}><Badge tone="gold">★ Vérifié</Badge></View>
                    )}
                  </View>
                  <View style={{ padding: 8 }}>
                    <Text numberOfLines={2} style={styles.pTitle}>{p.title}</Text>
                    <Text style={styles.pPrice}>{FCFA(p.price)}</Text>
                    <View style={styles.rowBetween}>
                      <Stars value={p.rating} />
                      <Text style={styles.sold}>{p.sold} vendus</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={() => onAddToCart(p.id)}>
                  <Text style={styles.addBtnText}>+ Ajouter au panier</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  catRow: { paddingVertical: 10, backgroundColor: colors.bg },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginRight: 6, backgroundColor: "#fff" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingVertical: 60 },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  imgWrap: { aspectRatio: 1, backgroundColor: "#eee" },
  img: { width: "100%", height: "100%" },
  badgeAbs: { position: "absolute", top: 6, left: 6 },
  pTitle: { fontSize: 12, color: colors.text, height: 32 },
  pPrice: { color: colors.primary, fontWeight: "700", fontSize: 13, marginTop: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sold: { fontSize: 10, color: colors.textMuted },
  addBtn: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 7, alignItems: "center" },
  addBtnText: { fontSize: 11, color: colors.primary, fontWeight: "600" },
});
