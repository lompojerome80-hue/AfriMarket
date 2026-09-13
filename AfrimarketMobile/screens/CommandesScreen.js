import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCurrentUser } from '../src/lib/auth';
import { getOrdersFor } from '../src/lib/orders';
import { maskPhone } from '../src/lib/privacy';
import { openDirections } from '../src/lib/location';
import { getAllCourses, speedUpCourse } from '../src/lib/deliveries';
import { fcfa } from '../src/lib/cart';
import AppBar from '../src/components/AppBar';
import EmptyState from '../src/components/EmptyState';
import QrDisplay from '../src/components/QrDisplay';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';

export default function CommandesScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [coursesById, setCoursesById] = useState({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const u = await getCurrentUser();
        setUser(u);
        setOrders(u ? await getOrdersFor(u) : []);
        const map = {};
        (await getAllCourses()).forEach((c) => { map[c.id] = c; });
        setCoursesById(map);
        setReady(true);
      })();
    }, [])
  );

  const handleSpeedUp = (item) => {
    Alert.alert('Accélérer la livraison', 'Envoyer un signal au livreur pour qu’il accélère sa course ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Envoyer',
        onPress: async () => {
          const res = await speedUpCourse(item.id, user);
          if (res.ok) {
            const map = { ...coursesById };
            map[res.course.id] = res.course;
            setCoursesById(map);
            Alert.alert('Signal envoyé ✓', 'Le livreur a été alerté pour accélérer la livraison.');
          } else {
            Alert.alert('Attention', res.message);
          }
        },
      },
    ]);
  };

  useEffect(() => { setReady(false); }, []);

  const renderCard = ({ item }) => {
    const isDone = item.status === 'livree';
    const course = item.courseId ? coursesById[item.courseId] : null;
    const canSpeedUp = course && course.status !== 'livree' && course.status !== 'annulee' && !!course.livreurKey;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.numero}>{item.numero}</Text>
          <View style={[styles.pill, isDone ? styles.pillDone : styles.pillWait]}>
            <Text style={[styles.pillText, isDone && styles.pillTextDone]}>
              {isDone ? 'Livrée ✓' : 'En cours'}
            </Text>
          </View>
        </View>

        <Text style={styles.client}>Client : {item.client?.name} {item.client?.phone ? `· 📵 ${maskPhone(item.client.phone)}` : ''}</Text>
        {item.buyerLat != null && item.buyerLng != null && (
          <TouchableOpacity style={styles.locBtn} onPress={() => openDirections(item.buyerLat, item.buyerLng)} activeOpacity={0.8}>
            <Text style={styles.locBtnText}>📍 Position de l'acheteur envoyée · Voir l'itinéraire</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.items} numberOfLines={2}>
          {item.items.map((i) => `${i.title} ×${i.qty}`).join(', ')}
        </Text>

        <View style={styles.codesRow}>
          {user?.role === 'Vendeur' && item.pickupCode ? (
            <View style={styles.codeChip}>
              <Text style={styles.codeChipLabel}>Récupération (vendeur)</Text>
              <Text style={styles.codeChipValue}>{item.pickupCode}</Text>
            </View>
          ) : null}
          {user?.role !== 'Vendeur' && item.deliveryCode ? (
            <View style={[styles.codeChip, styles.codeChipDelivery]}>
              <Text style={styles.codeChipLabel}>Livraison (client)</Text>
              <Text style={styles.codeChipDeliveryValue}>{item.deliveryCode}</Text>
            </View>
          ) : null}
        </View>

        {user?.role === 'Vendeur' && item.pickupCode ? (
          <View style={styles.pickupBox}>
            <QrDisplay value={item.pickupCode} size={120} />
            <View style={styles.pickupInfo}>
              <Text style={styles.pickupTitle}>Code de récupération</Text>
              <Text style={styles.pickupCode}>{item.pickupCode}</Text>
              <Text style={styles.pickupHint}>
                Faites scanner ce code par le livreur à la prise du colis.
              </Text>
            </View>
          </View>
        ) : null}

        {user?.role !== 'Vendeur' && item.deliveryCode ? (
          <View style={styles.pickupBox}>
            <QrDisplay value={item.deliveryCode} size={120} />
            <View style={styles.pickupInfo}>
              <Text style={styles.pickupTitle}>Code de livraison</Text>
              <Text style={styles.pickupCode}>{item.deliveryCode}</Text>
              <Text style={styles.pickupHint}>
                Faites scanner ce code par le livreur à la remise du colis.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.cardBottom}>
          <Text style={styles.total}>{fcfa(item.total)}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
        </View>

        {user?.role === 'Vendeur' && !item.courseId && (
          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CreateCourse', { orderId: item.id })}
          >
            <Text style={styles.ctaText}>🛵 Proposer une livraison</Text>
          </TouchableOpacity>
        )}

        {course && course.speedUps?.length > 0 && (
          <View style={styles.speedBanner}>
            <Text style={styles.speedBannerText}>
              ⏱️ Demande(s) d'accélération envoyée(s) au livreur ({course.speedUps.length})
            </Text>
          </View>
        )}
        {canSpeedUp && (
          <TouchableOpacity style={styles.speedBtn} onPress={() => handleSpeedUp(item)} activeOpacity={0.8}>
            <Text style={styles.speedBtnText}>🏁 Accélérer la livraison</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppBar title="Mes commandes" onBack={() => navigation.goBack()} />
      {ready && orders.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Aucune commande"
          subtitle="Vos commandes apparaîtront ici après votre premier achat."
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  list: { padding: SIZES.padding, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  numero: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 100 },
  pillWait: { backgroundColor: '#FDF1DF' },
  pillDone: { backgroundColor: COLORS.kola },
  pillText: { fontSize: 11, fontWeight: '700', color: COLORS.or },
  pillTextDone: { color: '#fff' },
  client: { fontSize: 13, color: COLORS.muted, marginBottom: 2 },
  locBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.kola,
    borderRadius: 100,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 10,
  },
  locBtnText: { color: COLORS.kola, fontSize: 12, fontWeight: '800' },
  items: { fontSize: 13, color: COLORS.ink, fontWeight: '500', marginBottom: 10 },
  codesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  codeChip: {
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  codeChipDelivery: { backgroundColor: COLORS.navDark, borderColor: COLORS.navDark },
  codeChipLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '600' },
  codeChipValue: { fontSize: 16, fontWeight: '800', color: COLORS.ink, letterSpacing: 2 },
  codeChipDeliveryValue: { color: COLORS.or },
  pickupBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navDark,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  pickupInfo: { flex: 1, marginLeft: 14 },
  pickupTitle: { color: COLORS.or, fontSize: 12, fontWeight: '700' },
  pickupCode: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 3, marginVertical: 4 },
  pickupHint: { color: '#9C99B6', fontSize: 11, lineHeight: 15 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  total: { fontSize: 16, fontWeight: '800', color: COLORS.piment },
  date: { fontSize: 12, color: COLORS.muted },
cta: {
    marginTop: 12,
    backgroundColor: COLORS.or,
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
  },
  speedBanner: {
    marginTop: 10,
    backgroundColor: '#FFF4E5',
    borderWidth: 1,
    borderColor: COLORS.or,
    borderRadius: 12,
    padding: 10,
  },
  speedBannerText: { fontSize: 12, fontWeight: '800', color: COLORS.or },
  speedBtn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FDECEA',
  },
  speedBtnText: { color: COLORS.piment, fontSize: 14, fontWeight: '800' },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});