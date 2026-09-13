import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getNotifications, markAllRead } from '../src/lib/notifications';
import { getCurrentUser } from '../src/lib/auth';
import AppBar from '../src/components/AppBar';
import EmptyState from '../src/components/EmptyState';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const user = await getCurrentUser();
    const list = await getNotifications(user?.key);
    setItems(list);
    setUnread(list.filter((n) => !n.read).length);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markReadAll = async () => {
    const user = await getCurrentUser();
    await markAllRead(user?.key);
    load();
  };

  const typeIcon = (t) => ({
    paiement: '💳', commande: '📦', livraison: '🛵', message: '💬',
    litige: '⚠️', escrow: '🔒', notif: '🔔', info: 'ℹ️',
    alerte: '🛡️', moderation: '🚫', compte: '🛡️', contrat: '📄', contrat_rappel: '📄',
    boutique: '🏪',
  }[t] || '🔔');

  return (
    <View style={styles.container}>
      <AppBar
        title="Notifications"
        onBack={() => navigation.goBack()}
        right={
          unread > 0 ? (
            <TouchableOpacity onPress={markReadAll} activeOpacity={0.7}>
              <Text style={styles.markRead}>Tout lire</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState icon="🔔" title="Aucune notification" subtitle="Vos alertes apparaîtront ici." />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {items.map((n) => {
            const targetSlug = n.data && n.data.slug ? n.data.slug : null;
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => {
                  if (targetSlug) navigation.navigate('BoutiqueDetail', { slug: targetSlug });
                }}
                activeOpacity={targetSlug ? 0.7 : 1}
              >
                <Text style={styles.icon}>{typeIcon(n.type)}</Text>
                <View style={styles.body}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.desc}>{n.body}</Text>
                  <Text style={styles.date}>{new Date(n.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}</Text>
                </View>
                {targetSlug && <Text style={styles.chevron}>›</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  markRead: { fontSize: 13, color: COLORS.or, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  cardUnread: { borderColor: COLORS.or, backgroundColor: '#FFF9F3' },
  icon: { fontSize: 22, marginRight: 12 },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  desc: { fontSize: 13, color: COLORS.muted, marginTop: 2, lineHeight: 18 },
  date: { fontSize: 11, color: COLORS.mutedSoft, marginTop: 4 },
  chevron: { fontSize: 22, color: COLORS.mutedSoft, marginLeft: 8, alignSelf: 'center' },
});