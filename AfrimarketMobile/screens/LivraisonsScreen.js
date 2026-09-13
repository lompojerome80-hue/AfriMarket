import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  getOpenCourses, getCoursesForLivreur, acceptCourse, pickupCourse, completeCourse,
  getLivreurDues, getLivreurCompletedCount, requestSettlement, courseStatusLabel,
  COURSES_FREE,
} from '../src/lib/deliveries';
import { getCurrentUser, isDossierComplete, isDossierVerified } from '../src/lib/auth';
import { getSettlementAccount, getAdminInfos } from '../src/lib/admin';
import { maskPhoneInText } from '../src/lib/privacy';
import { openDirections, getCurrentPosition, coordsLabel } from '../src/lib/location';
import { onScanResult } from '../src/lib/scanEvents';
import { fcfa } from '../src/lib/cart';
import AppBar from '../src/components/AppBar';
import EmptyState from '../src/components/EmptyState';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function LivraisonsScreen({ route }) {
  const section = route?.params?.section || 'all';
  const showDisponibles = section !== 'encours';
  const showEncours = section !== 'disponibles';
  const isTab = section !== 'all';
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState([]);
  const [mine, setMine] = useState([]);
  const [dues, setDues] = useState({ montant: 0, blocked: false });
  const [completed, setCompleted] = useState(0);

  const [codeModal, setCodeModal] = useState(null); // { courseId, mode }
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy] = useState(false);

  const [settleOpen, setSettleOpen] = useState(false);
  const [proofUri, setProofUri] = useState(null);
  const [settling, setSettling] = useState(false);

  const [infos, setInfos] = useState([]);
  const [settlementAccount, setSettlementAccount] = useState('06181574');

  const reload = useCallback(async () => {
    const u = await getCurrentUser();
    setUser(u);
    if (u) {
      setOpen(await getOpenCourses(u));
      setMine(await getCoursesForLivreur(u));
      setDues(await getLivreurDues(u));
      setCompleted(await getLivreurCompletedCount(u));
      setInfos(await getAdminInfos());
      setSettlementAccount(await getSettlementAccount());
    }
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  useEffect(() => {
    const sub = onScanResult((code) => {
      if (codeModal) submitCode(code);
    });
    return () => sub.remove();
  }, [codeModal]);

  if (!user || user.role !== 'Livreur') {
    return (
      <View style={styles.container}>
        <AppBar title="Livraisons" />
        <EmptyState
          icon="🛵"
          title="Profil livreur requis"
          subtitle="Créez un compte livreur puis complétez votre dossier pour accepter des courses."
          actionLabel="Retour"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const dossierComplete = isDossierComplete(user);
  const dossierOk = isDossierVerified(user);

  const alertResult = (res, successMsg) => {
    if (res.ok) {
      Alert.alert('Succès ✓', successMsg);
    } else if (res.error === 'deja') {
      Alert.alert('Une course en cours', res.message);
    } else if (res.error === 'bloque') {
      Alert.alert('Compte bloqué', res.message);
    } else if (res.error === 'dossier') {
      Alert.alert('Dossier non validé', res.message);
    } else {
      Alert.alert('Attention', res.message);
    }
  };

  const handleAccept = async (courseId) => {
    const res = await acceptCourse(courseId, user);
    alertResult(res, 'Course acceptée. Colis récupéré ?');
    reload();
  };

  const handleNav = async (destLat, destLng) => {
    if (destLat == null || destLng == null) return;
    const pos = await getCurrentPosition();
    await openDirections(destLat, destLng, pos?.lat, pos?.lng);
  };

  const openCode = (courseId, mode) => {
    setCodeInput('');
    setCodeModal({ courseId, mode });
  };

  const submitCode = async (codeOverride) => {
    if (!codeModal) return;
    setBusy(true);
    const { courseId, mode } = codeModal;
    const code = codeOverride !== undefined ? codeOverride : codeInput;
    const res = mode === 'pickup'
      ? await pickupCourse(courseId, code, user)
      : await completeCourse(courseId, code, user);
    setBusy(false);
    setCodeModal(null);
    setCodeInput('');
    if (res.ok) {
      if (mode === 'pickup') {
        Alert.alert('Colis récupéré ✓', 'Le code de livraison vous a été communiqué. À la remise, saisissez le code donné par le client.');
      } else {
        Alert.alert(
          'Livraison terminée ✓',
          `Vous encaissez ${fcfa(res.course.prixFcfa)} en espèces. ` +
            (res.freeCourse
              ? `🎁 Course ${res.course.freeCourseIndex}/${COURSES_FREE} offerte : commission ${fcfa(res.commission)} non due.`
              : `Commission AfriMarket : ${fcfa(res.commission)} ajoutée à votre dû — à régler avant 0h.`)
        );
      }
    } else {
      alertResult(res, '');
    }
    reload();
  };

  const pickProof = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (!r.canceled && r.assets?.[0]?.uri) setProofUri(r.assets[0].uri);
    } catch {}
  };

  const submitSettle = async () => {
    if (!proofUri) {
      Alert.alert('Preuve manquante', 'Choisissez la capture d’écran de votre paiement avant d’envoyer.');
      return;
    }
    setSettling(true);
    const res = await requestSettlement(user, { proof: proofUri, moyen: '*144# USSD' });
    setSettling(false);
    if (res.ok) {
      setSettleOpen(false);
      setProofUri(null);
      Alert.alert('En attente ✓', 'Votre preuve de paiement sera vérifiée par l’administrateur.');
    } else {
      Alert.alert('Attention', res.message);
    }
    setDues(await getLivreurDues(user));
  };

  const openCourseCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadLeft}>
          <Text style={styles.courseTitre}>{item.titre}</Text>
          <Text style={styles.courseMeta}>📍 {maskPhoneInText(item.destination)}</Text>
          {item.sellerLat != null && (
            <Text style={styles.courseMeta}>
              🏪 Récupération : {coordsLabel({ lat: item.sellerLat, lng: item.sellerLng }) || '—'}
            </Text>
          )}
          {item.distanceKm != null && (
            <Text style={styles.courseMeta}>📏 {item.distanceKm} km · prix auto {fcfa(item.prixAuto || 0)} (1000/10 km)</Text>
          )}
        </View>
        <Text style={styles.coursePrix}>{fcfa(item.prixFcfa)}</Text>
      </View>
      <Text style={styles.courseSeller}>Partenaire : {item.sellerNom}</Text>
      <TouchableOpacity
        style={[styles.primaryBtn, (!dossierOk || dues.blocked) && styles.primaryDisabled]}
        disabled={!dossierOk || dues.blocked}
        onPress={() => handleAccept(item.id)}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryBtnText}>
          {!dossierComplete
            ? 'Dossier incomplet'
            : !dossierOk
              ? 'Dossier en attente de validation'
              : dues.blocked
                ? 'Compte bloqué'
                : 'Accepter la course'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const myCourseCard = ({ item }) => {
    const canPickup = item.status === 'acceptee';
    const canDeliver = item.status === 'recupere';
    const hasPickup = item.sellerLat != null && item.sellerLng != null;
    const hasBuyer = item.buyerLat != null && item.buyerLng != null;
    return (
      <View style={[styles.card, item.status === 'livree' && styles.cardDone]}>
        <View style={styles.cardHead}>
          <View style={styles.cardHeadLeft}>
            <Text style={styles.courseTitre}>{item.titre}</Text>
            <Text style={styles.courseMeta}>📍 {item.destination}</Text>
            <Text style={styles.courseSeller}>📞 Vendeur : {item.sellerNom} · {item.sellerPhone || 'pas de numéro'}</Text>
            <Text style={[styles.statusPill, item.status === 'livree' && styles.statusPillDone]}>
              {courseStatusLabel(item.status)}
            </Text>
          </View>
          <Text style={styles.coursePrix}>{fcfa(item.prixFcfa)}</Text>
        </View>

        {item.speedUps?.length > 0 && item.status !== 'livree' && (
          <View style={styles.speedAlert}>
            <Text style={styles.speedAlertText}>
              ⏱️ L'acheteur souhaite accélérer la livraison{item.speedUps.length > 1 ? ` (${item.speedUps.length})` : ''}
            </Text>
          </View>
        )}

        {hasPickup && (
          <Text style={styles.courseMeta}>🏪 Récupération : {coordsLabel({ lat: item.sellerLat, lng: item.sellerLng })}</Text>
        )}
        {hasBuyer && (
          <Text style={styles.courseMeta}>📦 Livraison : {coordsLabel({ lat: item.buyerLat, lng: item.buyerLng })}</Text>
        )}

        {item.status === 'acceptee' && (
          <Text style={styles.courseHint}>
            Code de livraison (à la remise) : <Text style={styles.courseCode}>{item.deliveryCode}</Text>
          </Text>
        )}
        {item.status === 'recupere' && (
          <Text style={styles.courseHint}>
            Demandez le code de livraison au client.
          </Text>
        )}
        {item.status === 'livree' && (
          <Text style={styles.courseHint}>
            {item.freeCourse
              ? `🎁 Course ${item.freeCourseIndex}/${COURSES_FREE} offerte : encaissée ${fcfa(item.prixFcfa)}, commission ${fcfa(item.commission || 0)} non due.`
              : `Gain encaissé : ${fcfa(item.prixFcfa)} · Commission AfriMarket : ${fcfa(item.commission || 0)} ajoutée au dû.`}
          </Text>
        )}

        {(item.status === 'acceptee' || item.status === 'recupere') && hasPickup && (
          <TouchableOpacity
            style={[styles.ghostBtn, { marginBottom: 8 }]}
            onPress={() => handleNav(item.sellerLat, item.sellerLng)}
            activeOpacity={0.8}
          >
            <Text style={styles.ghostBtnText}>🧭 Naviguer vers la récupération du colis</Text>
          </TouchableOpacity>
        )}
        {canDeliver && hasBuyer && (
          <TouchableOpacity style={[styles.ghostBtn, { marginBottom: 8 }]} onPress={() => handleNav(item.buyerLat, item.buyerLng)} activeOpacity={0.8}>
            <Text style={styles.ghostBtnText}>🧭 Naviguer vers la livraison</Text>
          </TouchableOpacity>
        )}

        {canPickup && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openCode(item.id, 'pickup')} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Saisir le code de récupération</Text>
          </TouchableOpacity>
        )}
        {canDeliver && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openCode(item.id, 'delivery')} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Saisir le code de livraison</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppBar
        title={isTab ? (section === 'disponibles' ? 'Courses disponibles 🛵' : 'Courses en cours 📦') : 'Livraisons 🛵'}
        onBack={isTab ? undefined : () => navigation.goBack()}
      />

      <View style={[styles.duesBar, dues.blocked && styles.duesBarBlocked]}>
        <View style={styles.duesInfo}>
          <Text style={styles.duesLabel}>Mon dû AfriMarket</Text>
          <Text style={[styles.duesValue, dues.blocked && styles.duesValueBlocked]}>{fcfa(dues.montant)}</Text>
        </View>
        {dues.montant > 0 ? (
          <TouchableOpacity style={styles.duesBtn} onPress={() => setSettleOpen(true)}>
            <Text style={styles.duesBtnText}>Régler mon dû</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.duesOk}>À jour ✓</Text>
        )}
      </View>
      {!dues.blocked && dues.montant > 0 && !dues.regle && (
        <Text style={styles.blockedNote}>
          ⏰ Dû à régler au plus tard avant 0h aujourd'hui — sinon vos courses seront bloquées. Code : *144*10*{settlementAccount}*{dues.montant}#
        </Text>
      )}
      {dues.blocked && (
        <Text style={styles.blockedNote}>
          🚫 Dû impayé des jours précédents : le compte est bloqué jusqu'au règlement (avant 00H chaque soir).
        </Text>
      )}
      {completed < COURSES_FREE ? (
        <Text style={styles.freeNote}>
          🎁 Vous êtes dans vos {COURSES_FREE} premières courses offertes ({completed}/{COURSES_FREE} effectuées) : aucun dû.
        </Text>
      ) : (
        <Text style={styles.freeNote}>
          📊 {COURSES_FREE} premières courses terminées : le dû AfriMarket (10 % de la course) s'active maintenant.
        </Text>
      )}
      {!dossierOk && (
        <Text style={styles.blockedNote}>
          ⚠️ Dossier livreur incomplet ou en attente de validation par l'administrateur.
        </Text>
      )}
      {infos.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>📢 Informations plateforme</Text>
          {infos.map((i) => (
            <View key={i.id} style={styles.infoRow}>
              <Text style={styles.infoTitre}>{i.titre}</Text>
              <Text style={styles.infoValeur}>{i.valeur}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {showDisponibles &&
          (dossierOk ? (
            <>
              <Text style={styles.sectionTitle}>Disponibles près de vous ({open.length})</Text>
              {open.length === 0 ? (
                <Text style={styles.emptySmall}>Aucune course ouverte pour le moment.</Text>
              ) : null}
              {open.map((c) => <View key={c.id}>{openCourseCard({ item: c })}</View>)}
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.courseTitre}>🔒 Courses non disponibles</Text>
              <Text style={styles.courseMeta}>
                Votre dossier doit être validé par un administrateur pour voir et accepter des courses.
                Complétez-le depuis votre compte.
              </Text>
            </View>
          ))}

        {showEncours && (
          <>
            <Text style={[styles.sectionTitle, showDisponibles && { marginTop: 24 }]}>Mes courses ({mine.length})</Text>
            {mine.length === 0 ? (
              <Text style={styles.emptySmall}>Vous n'avez pas encore de course.</Text>
            ) : null}
            {mine.map((c) => <View key={c.id}>{myCourseCard({ item: c })}</View>)}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal
        visible={!!codeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCodeModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {codeModal?.mode === 'pickup' ? 'Code de récupération' : 'Code de livraison'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {codeModal?.mode === 'pickup'
                ? 'Saisissez le code lu au vendeur.'
                : 'Saisissez le code donné par l’acheteur à la remise.'}
            </Text>
            <TextInput
              style={styles.codeInput}
              value={codeInput}
              onChangeText={setCodeInput}
              keyboardType="default"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={4}
              placeholder="A4B2"
              placeholderTextColor={COLORS.mutedSoft}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalGhost]} onPress={() => setCodeModal(null)}>
                <Text style={[styles.modalBtnText, styles.modalGhostText]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalGhost]}
                onPress={() => navigation.navigate('QrScan')}
              >
                <Text style={[styles.modalBtnText, styles.modalGhostText]}>📷 Scanner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, busy && styles.modalDisabled]}
                disabled={busy}
                onPress={() => submitCode()}
              >
                <Text style={styles.modalBtnText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={settleOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSettleOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Régler mon dû AfriMarket</Text>
            <Text style={styles.modalSubtitle}>
              Dû actuel : <Text style={{ fontWeight: '800', color: COLORS.piment }}>{fcfa(dues.montant)}</Text> — à régler
              au plus tard avant 0h.
            </Text>

            <View style={styles.ussdCard}>
              <Text style={styles.ussdLabel}>1. Composez sur votre téléphone :</Text>
              <Text style={styles.ussdCode}>*144*10*{settlementAccount}*{dues.montant}#</Text>
              <Text style={styles.ussdHint}>Remplacez « {dues.montant} » par le montant exact de votre dû.</Text>
            </View>

            <Text style={styles.ussdLabel}>2. Envoyez la capture d'écran de votre paiement :</Text>
            {proofUri ? (
              <TouchableOpacity onPress={pickProof} activeOpacity={0.8} style={{ marginBottom: 8 }}>
                <Image source={{ uri: proofUri }} style={styles.proofThumb} resizeMode="cover" />
                <Text style={styles.proofChange}>Changer l'image</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.proofBtn} onPress={pickProof} activeOpacity={0.8}>
                <Text style={styles.proofBtnText}>📷 Choisir la capture d'écran</Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalGhost]} onPress={() => setSettleOpen(false)}>
                <Text style={[styles.modalBtnText, styles.modalGhostText]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, settling && styles.modalDisabled]}
                disabled={settling}
                onPress={submitSettle}
              >
                <Text style={styles.modalBtnText}>{settling ? 'Envoi…' : 'Envoyer le règlement'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  duesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.navDark,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 14,
  },
  duesBarBlocked: { backgroundColor: '#7A1F12' },
  duesInfo: {},
  duesLabel: { color: COLORS.or, fontSize: 12, fontWeight: '700' },
  duesValue: { color: '#fff', fontSize: 26, fontWeight: '800' },
  duesValueBlocked: { color: '#FFD9D1' },
  duesBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  duesBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  duesOk: { color: '#9C99B6', fontSize: 14, fontWeight: '700' },
  blockedNote: {
    marginHorizontal: 16,
    marginTop: 10,
    color: COLORS.piment,
    fontSize: 13,
    fontWeight: '600',
    padding: 12,
    backgroundColor: '#FFF1EC',
    borderRadius: 12,
  },
  freeNote: {
    marginHorizontal: 16,
    marginTop: 10,
    color: COLORS.kola,
    fontSize: 13,
    fontWeight: '700',
    padding: 12,
    backgroundColor: '#EFF8EF',
    borderRadius: 12,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  infoCardTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginBottom: 8 },
  infoRow: { marginBottom: 6 },
  infoTitre: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  infoValeur: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginTop: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginHorizontal: 16, marginTop: 18, marginBottom: 10 },
  emptySmall: { marginHorizontal: 16, color: COLORS.muted, fontSize: 13 },
  scrollBody: { paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  cardDone: { opacity: 0.75 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeadLeft: { flex: 1, marginRight: 10 },
  courseTitre: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 2 },
  courseMeta: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  coursePrix: { fontSize: 15, fontWeight: '800', color: COLORS.piment },
  courseSeller: { fontSize: 12, color: COLORS.muted, marginBottom: 10 },
  statusPill: { alignSelf: 'flex-start', backgroundColor: '#FDF1DF', color: COLORS.or, fontSize: 11, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 100, overflow: 'hidden' },
  statusPillDone: { backgroundColor: COLORS.kola, color: '#fff' },
  courseHint: { fontSize: 13, color: COLORS.ink, marginBottom: 10, lineHeight: 18 },
  courseCode: { fontWeight: '800', color: COLORS.piment, letterSpacing: 1.5 },
  primaryBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryDisabled: { backgroundColor: COLORS.muted },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ghostBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.or,
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  ghostBtnText: { color: COLORS.or, fontSize: 14, fontWeight: '800' },
  speedAlert: {
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: COLORS.piment,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  speedAlertText: { fontSize: 13, fontWeight: '800', color: COLORS.piment },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,14,35,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.paper, borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  modalSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 6, marginBottom: 14 },
  codeInput: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: COLORS.ink,
    marginBottom: 16,
    backgroundColor: COLORS.paper2,
  },
  modalBtnRow: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, backgroundColor: COLORS.piment, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalGhost: { backgroundColor: COLORS.paper2, borderWidth: 1, borderColor: COLORS.line },
  modalDisabled: { opacity: 0.6 },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalGhostText: { color: COLORS.ink },
  ussdCard: {
    backgroundColor: COLORS.navDark,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  ussdLabel: { fontSize: 13, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  ussdCode: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.or,
    letterSpacing: 1,
    marginBottom: 6,
  },
  ussdHint: { fontSize: 12, color: '#9C99B6' },
  proofBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.or,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFF9F3',
  },
  proofBtnText: { color: COLORS.or, fontSize: 14, fontWeight: '800' },
  proofThumb: {
    width: 150,
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignSelf: 'center',
    marginTop: 4,
  },
  proofChange: {
    textAlign: 'center',
    color: COLORS.or,
    fontSize: 12,
    fontWeight: '700',
    marginVertical: 8,
  },
});
