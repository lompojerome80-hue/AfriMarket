import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCurrentUser } from '../src/lib/auth';
import { getOrderById } from '../src/lib/orders';
import { createCourse } from '../src/lib/deliveries';
import { getCurrentPosition, haversineKm, deliveryPrice, coordsLabel } from '../src/lib/location';
import { fcfa } from '../src/lib/cart';
import AppBar from '../src/components/AppBar';
import QrDisplay from '../src/components/QrDisplay';
import { COLORS, SIZES } from '../src/constants/theme';

export default function CreateCourseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.orderId;

  const [titre, setTitre] = useState('');
  const [destination, setDestination] = useState('');
  const [prixFcfa, setPrixFcfa] = useState('');
  const [note, setNote] = useState('');
  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdCourse, setCreatedCourse] = useState(null);
  const [sellerPos, setSellerPos] = useState(null);
  const [buyerPos, setBuyerPos] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [autoPrice, setAutoPrice] = useState(null);
  const [locWarn, setLocWarn] = useState(false);

  useEffect(() => {
    (async () => {
      const pos = await getCurrentPosition();
      if (!pos) setLocWarn(true);
      setSellerPos(pos);
      let bp = null;
      if (orderId) {
        const o = await getOrderById(orderId);
        setOrderInfo(o);
        if (o) {
          setTitre(o.items?.length ? o.items[0].title : 'Colis ' + o.numero);
          setDestination(o.client?.name ? 'Client : ' + o.client.name : 'Colis ' + o.numero);
          if (o.buyerLat != null && o.buyerLng != null) {
            bp = { lat: o.buyerLat, lng: o.buyerLng };
            setBuyerPos(bp);
          }
        }
      }
      if (pos && bp) {
        const km = haversineKm(pos, bp);
        const price = deliveryPrice(km);
        setDistanceKm(km);
        setAutoPrice(price);
        setPrixFcfa(price ? String(price) : '');
      }
      setLoading(false);
    })();
  }, [orderId]);

  const handleCreate = async () => {
    if (!titre.trim()) { Alert.alert('Erreur', 'Intitulé de la course requis.'); return; }
    if (!destination.trim()) { Alert.alert('Erreur', 'Destination requise.'); return; }
    if (!autoPrice) {
      Alert.alert(
        'Prix indisponible',
        'Le prix se calcule automatiquement d\'après la distance. Autorisez la localisation et assurez-vous que l\'acheteur a partagé sa position, puis réessayez.'
      );
      return;
    }

    const user = await getCurrentUser();
    setSaving(true);
    try {
      const course = await createCourse({
        seller: user,
        titre: titre.trim(),
        destination: destination.trim(),
        prixFcfa: autoPrice,
        orderId: orderId || null,
        clientNote: note.trim(),
        sellerLocation: sellerPos,
      });
      setCreatedCourse(course);
    } catch {
      Alert.alert('Erreur', 'Échec de la création de la course.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppBar title="Proposer une livraison" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.piment} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {orderInfo ? (
            <View style={styles.orderRef}>
              <Text style={styles.orderRefTitle}>Commande {orderInfo.numero}</Text>
              <Text style={styles.orderRefSub}>{orderInfo.items?.length || 0} article(s) — {fcfa(orderInfo.total)}</Text>
            </View>
          ) : null}

          {createdCourse ? (
            <View style={styles.successPanel}>
              <Text style={styles.successCheck}>✓</Text>
              <Text style={styles.successTitle}>Course publiée 🛵</Text>
              <Text style={styles.successSub}>
                Montrez ce code QR au livreur : il devra le scanner (ou le saisir) pour récupérer le colis chez vous.
              </Text>
              <View style={styles.qrWrap}>
                <QrDisplay value={createdCourse.pickupCode} size={170} />
              </View>
              <Text style={styles.successCode}>{createdCourse.pickupCode}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Intitulé de la course *</Text>
          <TextInput
            style={styles.input}
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex : Colis parfum artisanal"
            placeholderTextColor={COLORS.muted}
          />

          <Text style={styles.label}>Destination *</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="Adresse, quartier ou ville"
            placeholderTextColor={COLORS.muted}
          />

          <View style={styles.locCard}>
            <Text style={styles.locTitle}>📍 Localisation & prix automatique</Text>
            <Text style={styles.locLine}>
              🏪 Récupération (votre position) : {coordsLabel(sellerPos) || 'non disponible'}
            </Text>
            <Text style={styles.locLine}>
              📦 Livraison (position de l'acheteur) : {coordsLabel(buyerPos) || 'non disponible'}
            </Text>
            {distanceKm != null ? (
              <Text style={styles.locDist}>
                Distance : {distanceKm.toFixed(1)} km · Prix auto : {fcfa(autoPrice || 0)}
              </Text>
            ) : (
              <Text style={styles.locWarn}>
                Partager votre position pour un calcul automatique (règle : 1000 FCFA / 10 km, minimum 1000 FCFA).
              </Text>
            )}
            {locWarn && !sellerPos && (
              <Text style={styles.locWarn}>
                ⚠️ Position impossible à obtenir (permission GPS refusée ou indisponible) : le prix ne peut pas être
                calculé automatiquement.
              </Text>
            )}
          </View>

          <Text style={styles.label}>Prix de la course (FCFA) *</Text>
          <TextInput
            style={styles.input}
            value={prixFcfa}
            onChangeText={setPrixFcfa}
            editable={false}
            placeholder="Ex : 2000"
            placeholderTextColor={COLORS.muted}
            keyboardType="numeric"
          />
          <Text style={styles.priceLocked}>
            🔒 Prix calculé automatiquement d'après la distance ({autoPrice ? fcfa(autoPrice) : 'non calculé'}) — il
            n'est pas modifiable.
          </Text>
          <Text style={styles.commissionHint}>
            Commission AfriMarket : 10 % du livreur sur cette course ({prixFcfa ? fcfa(Math.round((parseInt(prixFcfa.replace(/\s/g, ''), 10) || 0) * 0.1)) : '—'}).
          </Text>
          <Text style={[styles.commissionHint, { marginTop: 6, color: COLORS.muted }]}>
            ℹ️ Règle : 1000 FCFA minimum, +1000 FCFA par tranche de 10 km. Cette course sera visible uniquement par les
            livreurs dont le dossier a été vérifié par l'administrateur.
          </Text>

          <Text style={styles.label}>Note au livreur (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            placeholder="Précisions utiles..."
            placeholderTextColor={COLORS.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {createdCourse ? (
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: COLORS.kola }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>Terminer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, saving && styles.submitDisabled]}
              onPress={handleCreate}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.paper} />
              ) : (
                <Text style={styles.submitText}>Publier la course</Text>
              )}
            </TouchableOpacity>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SIZES.padding },
  orderRef: {
    backgroundColor: COLORS.navDark,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  orderRefTitle: { color: COLORS.or, fontSize: 15, fontWeight: '800' },
  orderRefSub: { color: '#9C99B6', fontSize: 13, marginTop: 4 },
  successPanel: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.kola,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  successCheck: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: COLORS.kola,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
    fontSize: 20,
    fontWeight: '800',
    overflow: 'hidden',
    marginBottom: 8,
  },
  successTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginBottom: 6 },
  successSub: { fontSize: 12, color: COLORS.muted, textAlign: 'center', lineHeight: 16, marginBottom: 12 },
  qrWrap: { backgroundColor: '#fff', borderRadius: 12, padding: 6 },
  successCode: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
    color: COLORS.piment,
    marginTop: 12,
  },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.ink, marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.ink,
  },
  textArea: { minHeight: 90, paddingTop: 12 },
  commissionHint: { fontSize: 12, color: COLORS.muted, marginTop: 8 },
  priceLocked: {
    fontSize: 12,
    color: COLORS.piment,
    marginTop: 8,
    fontWeight: '700',
  },
  locCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  locTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginBottom: 8 },
  locLine: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  locDist: { fontSize: 13, fontWeight: '800', color: COLORS.piment, marginTop: 8 },
  locWarn: { fontSize: 11, color: COLORS.or, marginTop: 8, lineHeight: 16 },
  submitBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});