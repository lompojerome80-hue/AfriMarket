import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getOrdersFor } from '../src/lib/orders';
import { getPaiementForOrder, confirmReception, openDispute } from '../src/lib/payments';
import { getCurrentUser, userKey } from '../src/lib/auth';
import { ensureThread } from '../src/lib/messaging';
import AppBar from '../src/components/AppBar';
import EmptyState from '../src/components/EmptyState';
import QrDisplay from '../src/components/QrDisplay';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function MesAchatsScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    const user = await getCurrentUser();
    const list = await getOrdersFor(user);
    const decorated = await Promise.all(
      list.map(async (o) => ({ ...o, paiement: await getPaiementForOrder(o.id) }))
    );
    setOrders(decorated);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleConfirm = async (order) => {
    Alert.alert('Confirmer la réception', `Confirmez-vous avoir reçu la commande ${order.numero} ?\nLes fonds seront libérés au vendeur.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer', style: 'destructive',
        onPress: async () => {
          await confirmReception(order.id);
          load();
        },
      },
    ]);
  };

  const handleDispute = (order) => {
    Alert.prompt(
      'Ouvrir un litige',
      'Décrivez le problème (commande non reçue, article endommagé…) :',
      async (reason) => {
        const user = await getCurrentUser();
        await openDispute(order.id, userKey(user), reason || '');
        load();
      },
      'plain-text'
    );
  };

  const handleContact = async (order) => {
    const user = await getCurrentUser();
    const item0 = order.items?.[0] || {};
    const sellerKey = item0.ownerKey || (item0.boutiqueName ? userKey({ name: item0.boutiqueName }) : 'vendeur');
    const threadId = await ensureThread(userKey(user), sellerKey, item0.boutiqueName || 'Vendeur', `Commande ${order.numero}`);
    if (threadId) navigation.navigate('Thread', { threadId });
  };

  const statusColor = (p) => {
    if (!p) return COLORS.muted;
    return {
      paye: COLORS.or,
      confirme: '#0E9F6E',
      dispute: COLORS.piment,
      rembourse: COLORS.muted,
      libere_admin: '#0E9F6E',
    }[p.status] || COLORS.muted;
  };
  const statusLabel = (p) => {
    if (!p) return 'Commandé';
    return {
      paye: 'Fonds sécurisés (escrow)',
      confirme: 'Reçu — fonds libérés',
      dispute: 'Litige ouvert',
      rembourse: 'Remboursé',
      libere_admin: 'Fonds libérés (admin)',
    }[p.status] || p.status;
  };

  return (
    <View style={styles.container}>
      <AppBar title="Mes achats" onBack={() => navigation.goBack()} />
      {orders.length === 0 ? (
        <EmptyState icon="📦" title="Aucun achat" subtitle="Vos commandes payées apparaîtront ici." />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {orders.map((order) => {
            const p = order.paiement;
            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.numero}>{order.numero}</Text>
                  <Text style={[styles.orderStatus, { color: statusColor(p) }]}>{statusLabel(p)}</Text>
                </View>
                {order.items.map((it) => (
                  <Text key={it.id} style={styles.itemLine}>• {it.title} × {it.qty}</Text>
                ))}
                <View style={styles.metaRow}>
                  <Text style={styles.metaTotal}>{order.total} FCFA</Text>
                  <Text style={styles.metaDate}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</Text>
                </View>

                {order.deliveryCode && (
                  <View style={styles.codeChip}>
                    <Text style={styles.codeLabel}>Code livraison — à présenter au livreur</Text>
                    <QrDisplay value={order.deliveryCode} size={150} />
                    <Text style={styles.codeValue}>{order.deliveryCode}</Text>
                  </View>
                )}

                <View style={styles.actions}>
                  {p && p.status === 'paye' && order.status === 'livree' && (
                    <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(order)}>
                      <Text style={styles.confirmBtnText}>✓ Confirmer la réception</Text>
                    </TouchableOpacity>
                  )}
                  {p && p.status === 'paye' && order.status !== 'livree' && (
                    <View style={styles.waitingHint}>
                      <Text style={styles.waitingHintText}>🚚 En attente de livraison — la confirmation sera disponible à la réception.</Text>
                    </View>
                  )}
                  {p && (p.status === 'paye' || p.status === 'confirme') && (
                    <TouchableOpacity style={styles.disputeBtn} onPress={() => handleDispute(order)}>
                      <Text style={styles.disputeBtnText}>⚠ Ouvrir un litige</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.contactBtn} onPress={() => handleContact(order)}>
                    <Text style={styles.contactBtnText}>💬 Contacter le vendeur</Text>
                  </TouchableOpacity>
                </View>

                {p && p.dispute && (
                  <Text style={styles.disputeInfo}>Litige : {p.dispute.reason}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  numero: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  orderStatus: { fontSize: 11, fontWeight: '700' },
  itemLine: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaTotal: { fontSize: 15, fontWeight: '800', color: COLORS.piment },
  metaDate: { fontSize: 12, color: COLORS.mutedSoft },
  codeChip: {
    marginTop: 10,
    backgroundColor: COLORS.navDark,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  codeLabel: { color: '#9C99B6', fontSize: 11, fontWeight: '600' },
  codeValue: { color: COLORS.or, fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  confirmBtn: {
    backgroundColor: '#0E9F6E',
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  confirmBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  disputeBtn: {
    backgroundColor: '#FFF3EF',
    borderWidth: 1,
    borderColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  disputeBtnText: { color: COLORS.piment, fontSize: 12, fontWeight: '700' },
  contactBtn: {
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  contactBtnText: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  waitingHint: {
    flexBasis: '100%',
    backgroundColor: '#FFF4E5',
    borderWidth: 1,
    borderColor: COLORS.or,
    borderRadius: 10,
    padding: 10,
  },
  waitingHintText: { fontSize: 12, fontWeight: '700', color: COLORS.or, lineHeight: 17 },
  disputeInfo: { marginTop: 10, fontSize: 12, color: COLORS.piment, fontWeight: '600' },
});