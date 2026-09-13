import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { FCFA, PREMIUM_PRICE } from "../data/seed";
import { Badge } from "../components/Common";

const TABS = [
  { key: "overview", label: "Vue d'ensemble", icon: "trending-up-outline" },
  { key: "users", label: "Utilisateurs", icon: "people-outline" },
  { key: "products", label: "Produits", icon: "cube-outline" },
  { key: "billing", label: "Abonnements", icon: "card-outline" },
];

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function AdminScreen({ users, products, isPremiumActive, onSetPremium, onToggleBan, onDeleteProduct }) {
  const [tab, setTab] = useState("overview");
  const premiumCount = users.filter((u) => isPremiumActive(u)).length;
  const revenue = premiumCount * PREMIUM_PRICE;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.h1Row}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        <Text style={styles.h1}>  Administration</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}>
            <Ionicons name={t.icon} size={14} color={tab === t.key ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>  {t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {tab === "overview" && (
          <View style={styles.statsGrid}>
            <StatCard label="Utilisateurs" value={users.length} />
            <StatCard label="Produits en ligne" value={products.length} />
            <StatCard label="Abonnés Premium" value={premiumCount} />
            <StatCard label="Revenus mensuels est." value={FCFA(revenue)} />
          </View>
        )}

        {tab === "users" && (
          <View style={styles.list}>
            {users.map((u) => (
              <View key={u.id} style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                    {isPremiumActive(u) ? <Badge tone="gold">Premium</Badge> : u.role === "vendor" ? <Badge tone="gray">Gratuit</Badge> : null}
                    {u.banned ? <Badge tone="orange">Suspendu</Badge> : <Badge tone="green">Actif</Badge>}
                  </View>
                </View>
                {u.role !== "admin" && (
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <TouchableOpacity onPress={() => onSetPremium(u.id, !isPremiumActive(u))}>
                      <Text style={styles.actionLink}>{isPremiumActive(u) ? "Retirer Premium" : "Accorder Premium"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onToggleBan(u.id)}>
                      <Text style={styles.actionLinkMuted}>{u.banned ? "Réactiver" : "Suspendre"}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {tab === "products" && (
          <View style={styles.list}>
            {products.map((p) => {
              const vendor = users.find((u) => u.id === p.vendorId);
              return (
                <View key={p.id} style={styles.prodRow}>
                  <Image source={{ uri: p.images[0] }} style={styles.prodImg} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.userName} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.userEmail}>{vendor?.name || "—"} · {FCFA(p.price)} · Stock {p.stock}</Text>
                  </View>
                  <TouchableOpacity onPress={() => onDeleteProduct(p.id)}>
                    <Text style={styles.deleteLink}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {tab === "billing" && (
          <View style={styles.list}>
            {users.filter((u) => u.role === "vendor").map((u) => (
              <View key={u.id} style={styles.prodRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>Renouvellement : {u.subscriptionExpiry || "—"}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {isPremiumActive(u) ? <Badge tone="gold">Premium</Badge> : <Badge tone="gray">Gratuit</Badge>}
                  <Text style={styles.userEmail}>{isPremiumActive(u) ? FCFA(PREMIUM_PRICE) : "—"}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1Row: { flexDirection: "row", alignItems: "center", padding: 14, paddingBottom: 6 },
  h1: { fontSize: 16, fontWeight: "600", color: colors.text },
  tabRow: { flexGrow: 0 },
  tabBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, marginRight: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 12, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: { width: "48%", backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12 },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 4 },
  list: { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  userRow: { flexDirection: "row", padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  userName: { fontSize: 13, fontWeight: "500", color: colors.text },
  userEmail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  actionLink: { fontSize: 11, color: colors.primary, textDecorationLine: "underline" },
  actionLinkMuted: { fontSize: 11, color: colors.textMuted, textDecorationLine: "underline" },
  prodRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  prodImg: { width: 40, height: 40, borderRadius: 6, backgroundColor: "#eee" },
  deleteLink: { fontSize: 11, color: colors.red, textDecorationLine: "underline" },
});
