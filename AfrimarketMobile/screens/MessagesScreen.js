import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getThreads, getUnreadTotal } from '../src/lib/messaging';
import { getCurrentUser } from '../src/lib/auth';
import AppBar from '../src/components/AppBar';
import EmptyState from '../src/components/EmptyState';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function MessagesScreen() {
  const navigation = useNavigation();
  const [threads, setThreads] = useState([]);
  const [unread, setUnread] = useState(0);
  const [myKey, setMyKey] = useState(null);

  const load = useCallback(async () => {
    const user = await getCurrentUser();
    setMyKey(user?.key || null);
    const list = await getThreads(user?.key);
    setThreads(list);
    setUnread(await getUnreadTotal(user?.key));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderThread = ({ item }) => {
    const otherKey = (myKey && item.participants.find((p) => p !== myKey)) || myKey || item.participants[0];
    const name = item.participantNames?.[otherKey] || item.title || 'Conversation';
    const badge = (myKey && item.unreadBy?.[myKey]) || 0;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Thread', { threadId: item.id })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>
          <Text style={styles.meta}>{item.title || 'Pas encore de message'}</Text>
        </View>
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppBar title="Messages" onBack={() => navigation.goBack()} right={unread > 0 ? (
        <Text style={styles.unreadText}>{unread} non lu{unread > 1 ? 's' : ''}</Text>
      ) : null} />
      {threads.length === 0 ? (
        <EmptyState icon="💬" title="Aucune conversation" subtitle="Contactez un vendeur ou un livreur pour démarrer." />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          renderItem={renderThread}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.piment,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  badge: {
    backgroundColor: COLORS.piment,
    borderRadius: 10,
    minWidth: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  unreadText: { fontSize: 12, color: COLORS.or, fontWeight: '700' },
});