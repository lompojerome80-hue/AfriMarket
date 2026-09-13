import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getCurrentUser, userKey } from '../src/lib/auth';
import { addToCart, fcfa } from '../src/lib/cart';
import { productDiscount, getProductReviews, addProductReview, refreshStockForProduct } from '../src/lib/products';
import { sendProductReport } from '../src/lib/admin';
import { ensureThread } from '../src/lib/messaging';
import AppBar from '../src/components/AppBar';
import { COLORS, SHADOWS } from '../src/constants/theme';

function StarRow({ rating, size = 15, interactive = false, onChange }) {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} disabled={!interactive} onPress={() => interactive && onChange && onChange(i)}>
          <Text style={[styles.star, { fontSize: size }, i <= Math.round(rating) && styles.starOn]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const product = route.params?.product || {};
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [stock, setStock] = useState(typeof product.stock === 'number' ? product.stock : 0);

  const [reviews, setReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [revNote, setRevNote] = useState(0);
  const [revComment, setRevComment] = useState('');
  const [revSending, setRevSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const REPORT_PRESETS = ['Produit interdit', 'Contenu inapproprié', 'Contrefaçon', 'Arnaque', 'Objet douteux'];

  const photos = (Array.isArray(product.photos) && product.photos.length)
    ? product.photos
    : [(product.img || product.image)].filter(Boolean);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setCurrentUser(u);
      setReviews(await getProductReviews(product.id));
    })();
  }, [product.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const s = await refreshStockForProduct(product);
        if (active) setStock(s);
      })();
      return () => { active = false; };
    }, [product?.id])
  );

  const promo = productDiscount(product);
  const outOfStock = stock === 0;
  const rating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + Number(r.note || 0), 0) / reviews.length) * 10) / 10
    : typeof product.rating === 'number' ? product.rating : null;
  const avisCount = reviews.length || (typeof product.avisCount === 'number' ? product.avisCount : 0);
  const sellerName = product.boutiqueName || 'Boutique partenaire';
  const sellerSlug = sellerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const sellerVille = product.boutiqueVille || 'Burkina Faso';
  const myKey = currentUser ? userKey(currentUser) : null;
  const mySlug = currentUser?.name
    ? currentUser.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : null;
  const legacySellerSlug = product.boutiqueName
    ? product.boutiqueName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : null;
  const isSeller = !!currentUser && (
    (product.ownerKey && myKey === product.ownerKey) ||
    (!product.ownerKey && legacySellerSlug && mySlug === legacySellerSlug)
  );

  const reloadReviews = async () => {
    setReviews(await getProductReviews(product.id));
  };

  const openReport = () => {
    setReportReason('');
    setReportOpen(true);
  };

  const submitReport = async () => {
    const u = await getCurrentUser();
    if (!u) {
      Alert.alert('Connexion requise', 'Créez un compte pour signaler ce produit.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Créer un compte', onPress: () => navigation.navigate('MainTabs', { screen: 'Compte' }) },
      ]);
      return;
    }
    if (isSeller) {
      Alert.alert('Action impossible', 'Vous ne pouvez pas signaler votre propre produit.');
      return;
    }
    const motif = reportReason.trim();
    if (!motif) {
      Alert.alert('Motif requis', 'Indiquez pourquoi vous signalez ce produit.');
      return;
    }
    await sendProductReport({
      productId: product.id,
      title: product.title,
      img: (photos[0] || null),
      motif,
      reporterKey: userKey(u),
      reporterName: u.name,
      ownerKey: product.ownerKey || null,
    });
    setReportOpen(false);
    setReportReason('');
    Alert.alert('Merci !', 'Votre signalement a été transmis à l\'équipe de modération. La plateforme examinera ce produit.');
  };

  const submitReview = async () => {
    const u = await getCurrentUser();
    if (!u) {
      Alert.alert('Connexion requise', 'Créez un compte pour noter ce produit.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Créer un compte', onPress: () => navigation.navigate('MainTabs', { screen: 'Compte' }) },
      ]);
      return;
    }
    if (isSeller) {
      Alert.alert('Action impossible', 'Vous ne pouvez pas noter votre propre produit.');
      return;
    }
    if (!revNote) {
      Alert.alert('Erreur', 'Choisissez une note de 1 à 5 étoiles.');
      return;
    }
    if (!revComment.trim()) {
      Alert.alert('Erreur', 'Écrivez un petit commentaire.');
      return;
    }
    setRevSending(true);
    const res = await addProductReview({
      productId: product.id,
      userKey: userKey(u),
      userName: u.name,
      note: revNote,
      comment: revComment.trim(),
      ownerKey: product.ownerKey || null,
    });
    setRevSending(false);
    if (res.ok) {
      Alert.alert('Merci !', 'Votre avis sur ce produit a été publié.');
      setRevNote(0);
      setRevComment('');
      await reloadReviews();
    } else {
      Alert.alert('Avis non publié', res.error || 'Impossible de publier l\'avis.');
    }
  };

  const handleAdd = async () => {
    if (outOfStock) return;
    const res = await addToCart(product, qty, sellerSlug);
    if (res.ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
      Alert.alert('Ajouté au panier ✓', `${qty} × ${product.title}`, [
        { text: 'Continuer' },
        { text: 'Voir le panier', onPress: () => navigation.navigate('MainTabs', { screen: 'Panier' }) },
      ]);
    } else {
      Alert.alert('Stock insuffisant', res.message);
    }
  };

  const handleContactSeller = async () => {
    const u = await getCurrentUser();
    if (!u) {
      Alert.alert(
        'Connexion requise',
        'Créez un compte pour contacter le vendeur.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Créer un compte', onPress: () => navigation.navigate('MainTabs', { screen: 'Compte' }) },
        ]
      );
      return;
    }
    const sellerKey = product.ownerKey || userKey({ name: sellerName });
    const threadId = await ensureThread(userKey(u), sellerKey, sellerName, product.title);
    navigation.navigate('Thread', { threadId });
  };

  return (
    <View style={styles.container}>
      <AppBar title="Détail du produit" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.imgWrap}>
          {photos.length && !imgError ? (
            <Image
              source={{ uri: photos[photoIdx] || product.img }}
              style={styles.img}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Text style={styles.imgPlaceholderText}>📦</Text>
            </View>
          )}
          {promo.has && (
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>-{promo.pct}%</Text>
            </View>
          )}
          {outOfStock && (
            <View style={styles.outBadge}>
              <Text style={styles.outBadgeText}>ÉPUISÉ</Text>
            </View>
          )}
          {photos.length > 1 && (
            <View style={styles.thumbStrip}>
              {photos.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.thumbBox, i === photoIdx && styles.thumbBoxActive]}
                  onPress={() => setPhotoIdx(i)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.seller}>vendu par <Text style={styles.sellerStrong}>{sellerName}</Text></Text>
          {(rating || null) !== null ? (
            <View style={styles.ratingBlock}>
              <StarRow rating={rating} size={17} />
              <Text style={styles.ratingText}>
                {rating.toFixed(1)}
                {avisCount > 0 ? ` · ${avisCount} avis` : ' · (0 avis)'}
              </Text>
            </View>
          ) : null}

          <View style={styles.priceBlock}>
            {promo.has ? (
              <>
                <Text style={styles.discountChip}>Remise {promo.pct}%</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.oldPrice}>{fcfa(promo.oldPrice)}</Text>
                  <Text style={styles.price}>{fcfa(promo.price)}</Text>
                </View>
                <Text style={styles.saveText}>Vous économisez {fcfa(promo.save)}</Text>
              </>
            ) : (
              <Text style={styles.price}>{fcfa(product.price)}</Text>
            )}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Livraison & paiement sécurisé</Text>
            <Text style={styles.infoLine}>🛵 Livraison par coursier AfriMarket (24–48 h)</Text>
            <Text style={styles.infoLine}>💳 Paiement Mobile Money sécurisé (fonds bloqués jusqu'à réception)</Text>
            <Text style={styles.infoLine}>🔒 Code de livraison à 4 chiffres à la remise</Text>
            <Text style={styles.infoLine}>
                📦 Stock : {stock === 0 ? 'épuisé' : `${stock} disponible(s)`}
              </Text>
          </View>
        </View>

        <View style={styles.sellerCard}>
          <View style={styles.sellerHead}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>{sellerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{sellerName}</Text>
              <Text style={styles.sellerMeta}>Boutique partenaire AfriMarket</Text>
              <Text style={styles.sellerLoc}>📍 {sellerVille}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.sellerBtn} onPress={() => navigation.navigate('BoutiqueDetail', { slug: sellerSlug })} activeOpacity={0.8}>
            <Text style={styles.sellerBtnText}>Voir la boutique</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sellerBtn, styles.contactBtn]} onPress={handleContactSeller} activeOpacity={0.8}>
            <Text style={styles.contactBtnText}>💬 Contacter le vendeur</Text>
          </TouchableOpacity>
          {!isSeller && (
            <TouchableOpacity style={styles.reportLink} onPress={openReport} activeOpacity={0.7}>
              <Text style={styles.reportLinkText}>🚩 Signaler ce produit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.reviewsCard}>
          <Text style={styles.reviewsTitle}>⭐ Avis clients</Text>
          {reviews.length === 0 ? (
            <Text style={styles.noReviews}>Aucun avis pour le moment. Soyez le premier à noter ce produit !</Text>
          ) : (
            reviews.map((rev, i) => (
              <View key={rev.id || i} style={styles.revItem}>
                <View style={styles.revHead}>
                  <View style={styles.revAvatar}>
                    <Text style={styles.revAvatarText}>{(rev.nom || 'A').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.revInfo}>
                    <Text style={styles.revName}>{rev.nom}</Text>
                    <StarRow rating={rev.note || 0} size={13} />
                  </View>
                  {rev.created_at && (
                    <Text style={styles.revDate}>
                      {new Date(rev.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  )}
                </View>
                <Text style={styles.revComment}>{rev.comment}</Text>
              </View>
            ))
          )}

          <View style={styles.revFormLine} />

          {isSeller ? (
            <Text style={styles.revLockText}>
              🔒 Vous ne pouvez pas noter votre propre produit.
            </Text>
          ) : !currentUser ? (
            <TouchableOpacity
              style={styles.revLoginBtn}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Compte' })}
              activeOpacity={0.85}
            >
              <Text style={styles.revLoginBtnText}>Connectez-vous pour laisser un avis</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.revFormTitle}>Noter ce produit</Text>
              <View style={styles.revStarWrap}>
                <StarRow rating={revNote} size={30} interactive onChange={setRevNote} />
              </View>
              <TextInput
                style={[styles.revInput, styles.revTextarea]}
                placeholder="Votre commentaire..."
                placeholderTextColor={COLORS.mutedSoft}
                value={revComment}
                onChangeText={setRevComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.revSubmit, revSending && styles.revSubmitDisabled]}
                onPress={submitReview}
                disabled={revSending}
                activeOpacity={0.85}
              >
                <Text style={styles.revSubmitText}>{revSending ? 'Envoi...' : 'Publier mon avis'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={{ height: 130 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.qtyBox}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))} activeOpacity={0.7}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyVal}>{qty}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => { if (qty < stock) setQty(qty + 1); }} activeOpacity={0.7}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.bottomTotal}>{fcfa((promo.has ? promo.price : product.price) * qty)}</Text>
        <TouchableOpacity
          style={[styles.addBtn, added && styles.addBtnDone, outOfStock && styles.addBtnOut]}
          onPress={handleAdd}
          disabled={outOfStock}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>{outOfStock ? 'Épuisé' : added ? '✓ Ajouté' : 'Ajouter au panier'}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={reportOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReportOpen(false)}
      >
        <View style={styles.reportOverlay}>
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>🚩 Signaler ce produit</Text>
            <Text style={styles.reportSubtitle}>
              « {product.title || ''} » — un signalement abusif peut vous être reproché. Cet avis sera examiné par la modération.
            </Text>
            <Text style={styles.reportLabel}>Motif du signalement</Text>
            <View style={styles.reportChips}>
              {REPORT_PRESETS.map((p) => {
                const active = reportReason === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.reportChip, active && styles.reportChipActive]}
                    onPress={() => setReportReason(active ? '' : p)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.reportChipText, active && styles.reportChipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.reportArea}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              placeholder="Précisez le problème (produit interdit, contrefaçon, arnaque…)"
              placeholderTextColor={COLORS.mutedSoft}
              textAlignVertical="top"
            />
            <View style={styles.reportBtns}>
              <TouchableOpacity style={[styles.reportBtn, styles.reportBtnGhost]} onPress={() => setReportOpen(false)} activeOpacity={0.85}>
                <Text style={styles.reportBtnGhostText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reportBtn, styles.reportBtnSend]} onPress={submitReport} activeOpacity={0.85}>
                <Text style={styles.reportBtnText}>Transmettre</Text>
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
  content: { paddingBottom: 20 },
  imgWrap: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.paper },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paper },
  imgPlaceholderText: { fontSize: 44 },
  promoBadge: {
    position: 'absolute', bottom: 14, left: 14,
    backgroundColor: COLORS.piment,
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 8,
  },
  promoBadgeText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  outBadge: {
    position: 'absolute', bottom: 14, right: 14,
    backgroundColor: '#C0392B',
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 8,
  },
  outBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  infoCard: {
    backgroundColor: COLORS.paper,
    margin: 16, marginBottom: 0,
    borderRadius: 16,
    padding: 18,
    ...SHADOWS.sm,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.ink, lineHeight: 26 },
  seller: { fontSize: 13, color: COLORS.muted, marginTop: 6 },
  sellerStrong: { color: COLORS.piment, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  star: { color: COLORS.line, fontSize: 15, marginRight: 1 },
  starOn: { color: COLORS.or },
  ratingText: { fontSize: 12, color: COLORS.muted, marginLeft: 6, fontWeight: '600' },
  priceBlock: { marginTop: 16 },
  discountChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1EC',
    color: COLORS.piment,
    fontSize: 12, fontWeight: '800',
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 8,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  oldPrice: { fontSize: 17, color: COLORS.mutedSoft, textDecorationLine: 'line-through' },
  price: { fontSize: 28, fontWeight: '900', color: COLORS.piment },
  saveText: { fontSize: 12, color: COLORS.kola, fontWeight: '700', marginTop: 4 },
  infoBox: {
    backgroundColor: COLORS.paper2,
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  infoBoxTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginBottom: 8 },
  infoLine: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  sellerCard: {
    backgroundColor: COLORS.paper,
    margin: 16,
    borderRadius: 16,
    padding: 18,
    ...SHADOWS.sm,
  },
  sellerHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sellerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.kola,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  sellerAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  sellerMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  sellerLoc: { fontSize: 12, color: COLORS.mutedSoft, marginTop: 2, fontWeight: '500' },
  sellerBtn: {
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  sellerBtnText: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  contactBtn: { backgroundColor: COLORS.kola, borderColor: COLORS.kola },
  contactBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  reportLink: { alignSelf: 'center', paddingVertical: 6 },
  reportLinkText: { color: COLORS.piment, fontSize: 12, fontWeight: '700' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderTopWidth: 1, borderTopColor: COLORS.line,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30,
    gap: 12,
    ...SHADOWS.md,
  },
  qtyBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.paper2,
    borderRadius: 100,
    borderWidth: 1, borderColor: COLORS.line,
  },
  qtyBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  qtyVal: { fontSize: 15, fontWeight: '700', color: COLORS.ink, minWidth: 24, textAlign: 'center' },
  bottomTotal: { fontSize: 17, fontWeight: '800', color: COLORS.piment, flex: 1, textAlign: 'right' },
  addBtn: {
    backgroundColor: COLORS.piment,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 100,
  },
  addBtnDone: { backgroundColor: COLORS.kola },
  addBtnOut: { backgroundColor: COLORS.muted },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  thumbStrip: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingHorizontal: 14,
  },
  thumbBox: {
    width: 50, height: 50, borderRadius: 8,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  thumbBoxActive: { borderColor: '#fff', borderWidth: 2.5 },
  thumbImg: { width: '100%', height: '100%' },
  ratingBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  reviewsCard: {
    backgroundColor: COLORS.paper, margin: 16, borderRadius: 16,
    padding: 18, ...SHADOWS.sm,
  },
  reviewsTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginBottom: 12 },
  noReviews: { fontSize: 13, color: COLORS.muted, lineHeight: 19, marginBottom: 6 },
  revItem: { marginBottom: 12 },
  revHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  revAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.kola, alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  revAvatarText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  revInfo: { flex: 1 },
  revName: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  revDate: { fontSize: 11, color: COLORS.muted },
  revComment: { fontSize: 13.5, lineHeight: 20, color: '#3A394A', paddingLeft: 42 },
  revFormLine: { height: 1, backgroundColor: COLORS.lineSoft, marginVertical: 14 },
  revLockText: { fontSize: 13.5, color: COLORS.muted, textAlign: 'center', paddingVertical: 6 },
  revLoginBtn: {
    backgroundColor: COLORS.piment, borderRadius: 100,
    paddingVertical: 12, alignItems: 'center',
  },
  revLoginBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  revFormTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  revStarWrap: { marginBottom: 10 },
  revInput: {
    backgroundColor: COLORS.paper2, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.line,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: COLORS.ink, marginBottom: 10,
  },
  revTextarea: { height: 78, paddingTop: 10, marginBottom: 6 },
  revSubmit: { backgroundColor: COLORS.piment, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  revSubmitDisabled: { opacity: 0.5 },
  revSubmitText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  /* Signalement */
  reportOverlay: { flex: 1, backgroundColor: 'rgba(15,14,35,0.55)', justifyContent: 'flex-end' },
  reportCard: { backgroundColor: COLORS.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34 },
  reportTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  reportSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 6, marginBottom: 14, lineHeight: 18 },
  reportLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, marginBottom: 6 },
  reportChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  reportChip: {
    backgroundColor: COLORS.paper2,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  reportChipActive: { backgroundColor: COLORS.navDark, borderColor: COLORS.navDark },
  reportChipText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  reportChipTextActive: { color: '#fff' },
  reportArea: {
    backgroundColor: COLORS.paper2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 12, minHeight: 84,
    fontSize: 14, color: COLORS.ink, marginTop: 4,
  },
  reportBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  reportBtn: { flex: 1, borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  reportBtnGhost: { backgroundColor: COLORS.paper2, borderWidth: 1, borderColor: COLORS.line },
  reportBtnGhostText: { color: COLORS.ink, fontWeight: '700' },
  reportBtnSend: { backgroundColor: COLORS.piment },
  reportBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});