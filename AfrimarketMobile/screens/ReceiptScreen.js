import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { getOrderById } from '../src/lib/orders';
import { getPaiementForOrder, getProvider } from '../src/lib/payments';
import { fcfa } from '../src/lib/cart';
import QrDisplay from '../src/components/QrDisplay';
import AppBar from '../src/components/AppBar';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function ReceiptScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [paiement, setPaiement] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const o = await getOrderById(orderId);
        setOrder(o);
        setPaiement(o ? await getPaiementForOrder(o.id) : null);
      })();
    }, [orderId])
  );

  if (!order || !paiement) {
    return (
      <View style={styles.container}>
        <AppBar title="Reçu" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Chargement du reçu…</Text>
        </View>
      </View>
    );
  }

  const provider = getProvider(paiement.operatorKey);
  const escrowLabels = {
    paye: { txt: 'Fonds sécurisés (escrow) — en attente de confirmation', color: COLORS.or },
    confirme: { txt: 'Réception confirmée — fonds libérés au vendeur', color: '#0E9F6E' },
    dispute: { txt: 'Litige ouvert — fonds bloqués', color: COLORS.piment },
    rembourse: { txt: 'Litige résolu — remboursé', color: COLORS.muted },
    libere_admin: { txt: 'Litige résolu — fonds libérés au vendeur', color: '#0E9F6E' },
  }[paiement.status] || { txt: paiement.status, color: COLORS.muted };

  return (
    <View style={styles.container}>
      <AppBar title="Reçu de transaction" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>✅</Text>
          <Text style={styles.heroTitle}>Paiement enregistré</Text>
          <Text style={styles.heroRef}>Réf. {paiement.reference}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Commande</Text>
          <Text style={styles.cardValue}>{order.numero}</Text>
          <Text style={styles.cardLabel}>Opérateur</Text>
          <View style={styles.providerRow}>
            <Image source={provider.logo} style={styles.providerLogo} resizeMode="contain" />
            <Text style={styles.cardValue}>{provider.brand} · {paiement.phone}</Text>
          </View>
          <Text style={styles.cardLabel}>Articles</Text>
          {order.items.map((it) => (
            <Text key={it.id} style={styles.itemLine}>• {it.title} × {it.qty}</Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Code de livraison</Text>
          <Text style={styles.codeValue}>{order.deliveryCode}</Text>
          <QrDisplay value={order.deliveryCode} size={170} />
          <Text style={styles.hint}>Communiquez ce code au livreur à la remise du colis.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Détails du paiement</Text>
          <View style={styles.feeRow}><Text style={styles.feeLabel}>Sous-total</Text><Text style={styles.feeValue}>{fcfa(paiement.montant)}</Text></View>
          <View style={styles.feeRow}><Text style={styles.feeLabel}>Frais ({provider.feePct}%)</Text><Text style={styles.feeValue}>{fcfa(paiement.frais)}</Text></View>
          <View style={[styles.feeRow, styles.feeTotalRow]}><Text style={styles.feeTotalLabel}>Total payé</Text><Text style={styles.feeTotalValue}>{fcfa(paiement.total)}</Text></View>
        </View>

        <View style={[styles.statusChip, { backgroundColor: escrowLabels.color }]}>
          <Text style={styles.statusText}>{escrowLabels.txt}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.replace('MesAchats')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Confirmer la réception (Mes achats)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => {
          Alert.alert('Commande passée', `Suivez votre commande ${order.numero} et son mode de livraison.`, [
            { text: 'OK' },
          ]);
        }}>
          <Text style={styles.ghostBtnText}>Retour à l’accueil</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.muted, fontSize: 14 },
  content: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 18 },
  heroIcon: { fontSize: 48 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: COLORS.ink, marginTop: 6 },
  heroRef: { fontSize: 13, color: COLORS.muted, marginTop: 4, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: COLORS.mutedSoft, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 10 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
  providerLogo: { width: 34, height: 34 },
  cardValue: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginTop: 3 },
  itemLine: { fontSize: 13, color: COLORS.muted, marginTop: 3, lineHeight: 19 },
  codeValue: { fontSize: 32, fontWeight: '900', color: COLORS.piment, letterSpacing: 6, textAlign: 'center', marginTop: 4, marginBottom: 10 },
  hint: { fontSize: 11, color: COLORS.mutedSoft, textAlign: 'center', marginTop: 10, lineHeight: 15 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  feeLabel: { fontSize: 13, color: COLORS.muted },
  feeValue: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  feeTotalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line },
  feeTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  feeTotalValue: { fontSize: 18, fontWeight: '900', color: COLORS.piment },
  statusChip: { borderRadius: 100, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', marginBottom: 18 },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  primaryBtn: {
    backgroundColor: COLORS.piment, borderRadius: 100, paddingVertical: 15, alignItems: 'center', marginBottom: 10, ...SHADOWS.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  ghostBtn: { paddingVertical: 10, alignItems: 'center' },
  ghostBtnText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
});