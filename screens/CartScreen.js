import React from "react";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { FCFA } from "../data/seed";

export default function CartScreen({ items, total, onRemove, onCheckout, onBack }) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>Votre panier est vide.</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Retour à la boutique</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 12 }}>
      <Text style={styles.h1}>Votre panier</Text>
      <FlatList
        data={items}
        keyExtractor={(c) => c.productId}
        contentContainerStyle={styles.list}
        renderItem={({ item: c }) => (
          <View style={styles.row}>
            <Image source={{ uri: c.product.images[0] }} style={styles.thumb} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pName} numberOfLines={1}>{c.product.title}</Text>
              <Text style={styles.qty}>Qté : {c.qty}</Text>
            </View>
            <Text style={styles.price}>{FCFA(c.product.price * c.qty)}</Text>
            <TouchableOpacity onPress={() => onRemove(c.productId)} style={{ marginLeft: 10 }}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
      />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{FCFA(total)}</Text>
      </View>
      <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout}>
        <Text style={styles.checkoutText}>Valider la commande</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  h1: { fontSize: 16, fontWeight: "600", marginBottom: 10, color: colors.text },
  list: { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", padding: 10 },
  thumb: { width: 50, height: 50, borderRadius: 6, backgroundColor: "#eee" },
  pName: { fontSize: 13, color: colors.text },
  qty: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  price: { fontSize: 13, fontWeight: "600", color: colors.primary },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 12 },
  totalLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  totalValue: { fontSize: 18, fontWeight: "700", color: colors.primary },
  checkoutBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  checkoutText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
