import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { FCFA, PREMIUM_PRICE } from "../data/seed";
import { Badge } from "../components/Common";

const Feature = ({ label }) => (
  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
    <Ionicons name="checkmark-circle" size={16} color={colors.green} />
    <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6 }}>{label}</Text>
  </View>
);

export default function SubscriptionScreen({ currentUser, isPremiumActive, onSubscribe, onCancel }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <View style={styles.h1Row}>
        <Ionicons name="ribbon-outline" size={20} color={colors.amber} />
        <Text style={styles.h1}>  Abonnement Vendeur Premium</Text>
      </View>

      {isPremiumActive ? (
        <View style={styles.card}>
          <Badge tone="gold">★ Premium actif</Badge>
          <Text style={styles.expiry}>
            Votre abonnement est actif jusqu'au <Text style={{ fontWeight: "700" }}>{currentUser.subscriptionExpiry}</Text>.
          </Text>
          <Feature label="Produits illimités" />
          <Feature label='Badge "Vérifié" sur votre boutique' />
          <Feature label="Mise en avant dans les résultats" />
          <TouchableOpacity onPress={onCancel} style={{ marginTop: 16 }}>
            <Text style={styles.cancelLink}>Annuler l'abonnement</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.priceText}>{FCFA(PREMIUM_PRICE)}<Text style={styles.perMonth}> / mois</Text></Text>
          <Feature label="Publiez un nombre illimité de produits" />
          <Feature label='Badge "Vérifié" affiché sur vos annonces' />
          <Feature label="Meilleure visibilité dans le catalogue" />
          <Feature label="Support vendeur prioritaire" />
          <TouchableOpacity style={styles.subscribeBtn} onPress={onSubscribe}>
            <Text style={styles.subscribeText}>S'abonner maintenant</Text>
          </TouchableOpacity>
          <Text style={styles.note}>
            Paiement simulé pour cette version MVP (à brancher sur Mobile Money / Orange Money / carte bancaire).
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  h1Row: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  h1: { fontSize: 16, fontWeight: "600", color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: colors.border },
  expiry: { fontSize: 13, color: colors.textMuted, marginTop: 10 },
  cancelLink: { color: colors.red, fontSize: 13, textDecorationLine: "underline" },
  priceText: { fontSize: 28, fontWeight: "700", color: colors.primary },
  perMonth: { fontSize: 13, color: colors.textMuted, fontWeight: "400" },
  subscribeBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 13, alignItems: "center", marginTop: 18 },
  subscribeText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  note: { fontSize: 11, color: colors.textMuted, textAlign: "center", marginTop: 8 },
});
