import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import ProductCard from '../src/components/ProductCard';
import EmptyState from '../src/components/EmptyState';
import AppBar from '../src/components/AppBar';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';
import { addToCart } from '../src/lib/cart';
import { getBoutique, addAvis, updateProductStock, updateProductPrice, addProductSecure, deleteProductSecure, checkBoutiquePassword } from '../src/lib/boutique';
import { productDiscount, normalizeStock } from '../src/lib/products';
import { getCurrentUser, userKey } from '../src/lib/auth';
import { isFollowing, toggleFollow, getFollowerCount } from '../src/lib/follow';
import { CATEGORIES } from '../src/constants/categories';

const { width } = Dimensions.get('window');
const TABS = ['Catalogue', 'À propos', 'Avis'];

function StarRating({ rating, size = 18, interactive = false, onChange }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          disabled={!interactive}
          onPress={() => interactive && onChange && onChange(star)}
          style={styles.starBtn}
        >
          <Text style={{ fontSize: size, color: star <= rating ? COLORS.or : COLORS.line }}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StockEditor({ initial, onSet }) {
  const [val, setVal] = useState(String(typeof initial === 'number' ? initial : 0));
  useEffect(() => {
    setVal(String(typeof initial === 'number' ? initial : 0));
  }, [initial]);
  const num = () => Math.max(0, Math.floor(Number(val.replace(/\D/g, '')) || 0));
  const apply = (next) => {
    const v = Math.max(0, Math.floor(Number(next) || 0));
    setVal(String(v));
    onSet(v);
  };
  return (
    <View style={styles.stockEditor}>
      <TouchableOpacity style={styles.stockBtn} onPress={() => apply(num() - 1)} activeOpacity={0.7}>
        <Text style={styles.stockBtnText}>−</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.stockInput}
        value={val}
        onChangeText={(t) => setVal(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        selectTextOnFocus
        onBlur={() => {
          if (!val.trim()) setVal(String(initial));
          else if (num() !== initial) apply(num());
        }}
        onSubmitEditing={() => {
          if (num() !== initial) apply(num());
        }}
      />
      <TouchableOpacity style={styles.stockBtn} onPress={() => apply(num() + 1)} activeOpacity={0.7}>
        <Text style={styles.stockBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BoutiqueScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const slug = route.params?.slug || route.params?.id || '';

  const [boutique, setBoutique] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('Catalogue');
  const [following, setFollowing] = useState(false);

  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [priceModal, setPriceModal] = useState(null);
  const [priceInput, setPriceInput] = useState('');
  const [oldPriceInput, setOldPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  const [manager, setManager] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [apName, setApName] = useState('');
  const [apPrice, setApPrice] = useState('');
  const [apCategory, setApCategory] = useState('');
  const [apPhotos, setApPhotos] = useState([]);
  const [apReduction, setApReduction] = useState('');
  const [apSaving, setApSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadBoutique();
    }, [slug])
  );

  const loadBoutique = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await getBoutique(slug);
      const u = await getCurrentUser();
      setCurrentUser(u);
      const isFollowed = u ? await isFollowing(userKey(u), slug) : false;
      setFollowing(isFollowed);
      setFollowerCount(await getFollowerCount(slug));
      if (!data) {
        setNotFound(true);
      } else {
        const reviews = data.avis || data.reviews || [];
        if (reviews.length) {
          const avg = Math.round((reviews.reduce((s, r) => s + Number(r.note || 0), 0) / reviews.length) * 10) / 10;
          data.rating = avg;
        } else if (typeof data.rating !== 'number') {
          data.rating = null;
        }
        setBoutique(data);
        const myKey = u ? userKey(u) : null;
        const ownerKey = data.proprietaireKey || null;
        setIsOwner(!!myKey && !!ownerKey && String(myKey) === String(ownerKey));
        if (!reviewName && u?.name) setReviewName(u.name);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2000); };

  const handleFollow = async () => {
    const theSlug = slug || boutique?.slug;
    if (!theSlug) return;
    const u = await getCurrentUser();
    if (!u) {
      Alert.alert('Connexion requise', 'Créez un compte pour suivre des boutiques.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Créer un compte', onPress: () => navigation.navigate('MainTabs', { screen: 'Compte' }) },
      ]);
      return;
    }
    const res = await toggleFollow(userKey(u), theSlug, u.name);
    setFollowing(res.following);
    setFollowerCount(await getFollowerCount(theSlug));
    showToast(res.following ? 'Boutique suivie ✓' : 'Suivi retiré');
  };

  const handleAddToCart = async (product) => {
    const res = await addToCart(
      { ...product, boutiqueName: boutique?.nom || boutique?.name || '', boutiqueVille: boutique?.ville || '' },
      1,
      slug
    );
    showToast(res.ok ? `${product.title} ajouté au panier` : `⚠️ ${res.message}`);
  };

  const saveStock = async (product, next) => {
    const value = Math.max(0, Math.floor(Number(next) || 0));
    const res = await updateProductStock(slug, product.id, value);
    if (res.ok) {
      loadBoutique();
      showToast(value === 0 ? 'Produit épuisé' : `Stock : ${value}`);
    }
  };

  const handleOpenPriceModal = (product) => {
    setPriceModal(product);
    setPriceInput(String(product.price ?? ''));
    setOldPriceInput(product.oldPrice > 0 ? String(product.oldPrice) : '');
  };

  const handleQuickDiscount = (pct) => {
    const price = Number(priceInput) || 0;
    if (price <= 0) return;
    setOldPriceInput(String(Math.round(price / (1 - pct / 100))));
  };

  const handleSavePrice = async () => {
    const price = Number(priceInput);
    if (!price || price <= 0) {
      Alert.alert('Erreur', 'Saisissez un prix de vente valide.');
      return;
    }
    setSavingPrice(true);
    const oldPrice = Number(oldPriceInput) || 0;
    const res = await updateProductPrice(slug, priceModal.id, { price, oldPrice });
    setSavingPrice(false);
    if (res.ok) {
      setPriceModal(null);
      loadBoutique();
      showToast(oldPrice > price ? `Remise enregistrée ✓` : 'Prix mis à jour ✓');
    } else {
      Alert.alert('Erreur', res.error || 'Impossible de mettre à jour le prix.');
    }
  };

  const handleRemovePrice = async () => {
    setSavingPrice(true);
    const res = await updateProductPrice(slug, priceModal.id, { price: Number(priceInput), oldPrice: 0 });
    setSavingPrice(false);
    if (res.ok) {
      setPriceModal(null);
      loadBoutique();
      showToast('Remise retirée ✓');
    }
  };

  const confirmAccess = async () => {
    if (!accessCode.trim()) {
      Alert.alert('Code requis', 'Entrez le code défini lors de la création de la boutique.');
      return;
    }
    const u = await getCurrentUser();
    const myKey = u ? userKey(u) : null;
    const ownerKey = boutique?.proprietaireKey || null;
    if (!myKey || !ownerKey || String(myKey) !== String(ownerKey)) {
      Alert.alert('Accès refusé', "Seul le compte vendeur qui a créé cette boutique peut accéder à l'espace gérant.");
      return;
    }
    setChecking(true);
    const ok = await checkBoutiquePassword(slug, accessCode.trim());
    setChecking(false);
    if (!ok) {
      Alert.alert('Code incorrect', 'Vérifiez le mot de passe que vous avez choisi lors de la création de la boutique.');
      return;
    }
    setAccessOpen(false);
    setManager(true);
    showToast('Espace gérant débloqué 🔓');
  };

  const lockAccess = () => {
    setManager(false);
    setAccessCode('');
  };

  const pickApPhoto = async () => {
    if (apPhotos.length >= 4) {
      Alert.alert('Limite atteinte', 'Un produit peut contenir au maximum 4 photos.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la galerie pour ajouter des photos.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 4 - apPhotos.length,
    });
    if (r.canceled || !r.assets) return;
    const uris = r.assets.map((a) => a.uri).filter(Boolean).slice(0, 4 - apPhotos.length);
    if (uris.length) setApPhotos([...apPhotos, ...uris]);
  };

  const removeApPhoto = (i) => setApPhotos(apPhotos.filter((_, x) => x !== i));

  const resetAddForm = () => {
    setApName('');
    setApPrice('');
    setApCategory('');
    setApPhotos([]);
    setApReduction('');
  };

  const submitNewProduct = async () => {
    if (!apName.trim() || !apPrice.trim()) {
      Alert.alert('Erreur', 'Nom et prix sont requis.');
      return;
    }
    if (!apCategory) {
      Alert.alert('Catégorie manquante', 'Choisissez une catégorie pour ce produit.');
      return;
    }
    if (apPhotos.length === 0) {
      Alert.alert('Photo manquante', 'Ajoutez au moins 1 photo (1 à 4 maximum).');
      return;
    }
    const price = parseFloat(apPrice.replace(/\s/g, '').replace(/,/g, '.')) || 0;
    if (price <= 0) {
      Alert.alert('Erreur', 'Saisissez un prix valide.');
      return;
    }
    const reduction = parseFloat(apReduction) || 0;
    let oldPrice;
    if (reduction > 0 && reduction < 100) oldPrice = Math.round(price / (1 - reduction / 100));

    setApSaving(true);
    const newId = await addProductSecure(slug, accessCode.trim(), {
      title: apName.trim(),
      price,
      category: apCategory,
      img: apPhotos[0],
      photos: apPhotos,
      oldPrice,
    });
    setApSaving(false);
    if (!newId) {
      Alert.alert('Accès refusé', 'Code invalide. Réessayez.');
      return;
    }
    setAddOpen(false);
    resetAddForm();
    loadBoutique();
    showToast('Produit ajouté ✓');
  };

  const confirmDeleteProduct = (p) => {
    Alert.alert('Supprimer ?', `Supprimer définitivement « ${p.title} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteProductSecure(slug, accessCode, p.id);
          loadBoutique();
          showToast('Produit supprimé');
        },
      },
    ]);
  };

  const handleSubmitReview = async () => {
    const u = await getCurrentUser();
    if (!u) {
      Alert.alert('Connexion requise', 'Créez un compte acheteur pour laisser un avis.', [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Créer un compte', onPress: () => navigation.navigate('MainTabs', { screen: 'Compte' }) },
      ]);
      return;
    }
    if (isOwner) {
      Alert.alert('Action impossible', 'Vous ne pouvez pas noter votre propre boutique.');
      return;
    }
    if (!reviewRating) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note (1 à 5 étoiles).');
      return;
    }
    if (!reviewComment.trim()) {
      Alert.alert('Erreur', 'Veuillez écrire un commentaire.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await addAvis(slug, {
        nom: (reviewName.trim() || u.name || 'Client'),
        note: reviewRating,
        comment: reviewComment.trim(),
        userKey: userKey(u),
      });
      if (!res.ok) {
        Alert.alert('Avis déjà publié', res.error || 'Impossible de publier l\'avis.');
        setSubmitting(false);
        return;
      }
      Alert.alert('Merci !', 'Votre avis a été publié.');
      setReviewRating(0);
      setReviewComment('');
      loadBoutique();
    } catch {
      Alert.alert('Erreur', "Impossible de publier l'avis. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppBar title="Boutique" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.piment} />
          <Text style={styles.loadingText}>Chargement de la boutique...</Text>
        </View>
      </View>
    );
  }

  if (notFound || !boutique) {
    return (
      <View style={styles.container}>
        <AppBar title="Boutique" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.notFoundEmoji}>🏪</Text>
          <Text style={styles.notFoundTitle}>Boutique introuvable</Text>
          <Text style={styles.notFoundText}>
            Cette boutique n'existe pas ou a été supprimée.
          </Text>
          {currentUser?.role === 'Vendeur' && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreateBoutique')}
            >
              <Text style={styles.createBtnText}>Créer une boutique</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const initial = (boutique.nom || boutique.name || '?').charAt(0).toUpperCase();
  const products = (boutique.produits || boutique.products || []).map((p) => ({ ...p, ...normalizeStock(p) }));
  const reviews = boutique.avis || boutique.reviews || [];

  return (
    <View style={styles.container}>
      <AppBar title="Boutique" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {boutique.banniere ? (
          <Image source={{ uri: boutique.banniere }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverPlaceholderText}>{boutique.nom || boutique.name}</Text>
          </View>
        )}

        <View style={styles.profileSection}>
          {boutique.logo ? (
            <Image source={{ uri: boutique.logo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={styles.shopName}>{boutique.nom || boutique.name}</Text>
            <Text style={styles.shopLocation}>
              📍 {boutique.ville || boutique.location || 'Burkina Faso'}
            </Text>
            {boutique.rating != null && (
              <View style={styles.ratingRow}>
                <StarRating rating={Math.round(boutique.rating)} size={16} />
                <Text style={styles.ratingValue}>
                  {typeof boutique.rating === 'number' ? boutique.rating.toFixed(1) : boutique.rating}
                </Text>
                {reviews.length > 0 && (
                  <Text style={styles.reviewCount}>({reviews.length} avis)</Text>
                )}
              </View>
            )}
            <Text style={styles.followersText}>
              👥 {followerCount} {followerCount > 1 ? 'abonnés' : 'abonné'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.followBtn, following && styles.followingBtn]}
            onPress={handleFollow}
            activeOpacity={0.7}
          >
            <Text style={[styles.followText, following && styles.followingText]}>
              {following ? 'Suivi ✓' : 'Suivre'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isOwner && !manager && (
          <View style={styles.managerBar}>
            <TouchableOpacity style={styles.managerBtn} onPress={() => { setAccessCode(''); setAccessOpen(true); }} activeOpacity={0.85}>
              <Text style={styles.managerBtnText}>🔑 Accéder à l'espace gérant</Text>
            </TouchableOpacity>
            <Text style={styles.managerHint}>
              Vous êtes le vendeur de cette boutique : entrez votre code de création pour ajouter des produits et gérer le stock.
            </Text>
          </View>
        )}
        {isOwner && manager && (
          <View style={styles.managerPanel}>
            <View style={styles.managerHead}>
              <Text style={styles.managerTitle}>🔓 Espace gérant activé</Text>
              <TouchableOpacity onPress={lockAccess} activeOpacity={0.7}>
                <Text style={styles.managerLock}>Verrouiller</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addProductBtn} onPress={() => setAddOpen(true)} activeOpacity={0.85}>
              <Text style={styles.addProductBtnText}>＋ Ajouter un produit</Text>
            </TouchableOpacity>
            <Text style={styles.panelFollowers}>
              👥 {followerCount} {followerCount > 1 ? 'personnes suivent' : 'personne suit'} votre boutique
            </Text>
          </View>
        )}

        {activeTab === 'Catalogue' && (
          <View style={styles.tabContent}>
            {manager && (
              <View style={styles.stockPanel}>
                <Text style={styles.stockPanelTitle}>📦 Gestion de la boutique</Text>
                <Text style={styles.stockPanelHint}>
                  Ajustez la quantité disponible et fixez vos prix / remises. Les remises s'affichent partout dans l'application. Ajoutez de nouveaux produits avec le bouton ci-dessus.
                </Text>
              </View>
            )}
            {products.length === 0 ? (
              <EmptyState
                icon="📦"
                title="Aucun produit"
                subtitle="Cette boutique n'a pas encore de produits."
              />
            ) : (
              <FlatList
                data={products}
                numColumns={2}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                columnWrapperStyle={styles.productsRow}
                contentContainerStyle={styles.productsGrid}
                renderItem={({ item }) => (
                  <View style={styles.productCell}>
                    <ProductCard
                      product={item}
                      onAddToCart={() => handleAddToCart(item)}
                      onOpen={(p) => navigation.navigate('ProductDetail', {
                        product: {
                          ...p,
                          boutiqueName: boutique.nom,
                          boutiqueVille: boutique.ville,
                          ownerKey: boutique.proprietaireKey || null,
                        },
                      })}
                    />
                    {manager && (
                      <View style={styles.stockCtrl}>
                        <Text style={styles.stockLabel}>📦 Stock disponible</Text>
                        <StockEditor initial={item.stock} onSet={(next) => saveStock(item, next)} />
                        <View style={styles.ownerActionRow}>
                          <TouchableOpacity style={styles.priceCtrlBtn} onPress={() => handleOpenPriceModal(item)} activeOpacity={0.7}>
                            <Text style={styles.priceCtrlText}>
                              💲 Prix {productDiscount(item).has ? `-${productDiscount(item).pct}%` : ''}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteCtrlBtn} onPress={() => confirmDeleteProduct(item)} activeOpacity={0.7}>
                            <Text style={styles.deleteCtrlText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        )}

        {activeTab === 'À propos' && (
          <View style={styles.tabContent}>
            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>Notre histoire</Text>
              <Text style={styles.aboutText}>
                {boutique.story ||
                  boutique.histoire ||
                  boutique.description ||
                  'Bienvenue dans cette boutique partenaire d\'AfriMarket. Découvrez des produits de qualité sélectionnés avec soin pour vous.'}
              </Text>
            </View>
            {boutique.speciality && (
              <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>Spécialité</Text>
                <Text style={styles.aboutText}>{boutique.speciality}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'Avis' && (
          <View style={styles.tabContent}>
            {isOwner ? (
              <View style={styles.reviewLockCard}>
                <Text style={styles.reviewLockIcon}>🔒</Text>
                <Text style={styles.reviewLockTitle}>Vous êtes le vendeur</Text>
                <Text style={styles.reviewLockText}>
                  Vous ne pouvez pas noter votre propre boutique. Seuls les acheteurs peuvent laisser un avis.
                </Text>
              </View>
            ) : !currentUser ? (
              <View style={styles.reviewLockCard}>
                <Text style={styles.reviewLockIcon}>👤</Text>
                <Text style={styles.reviewLockTitle}>Connectez-vous pour noter</Text>
                <Text style={styles.reviewLockText}>
                  Seuls les acheteurs connectés peuvent laisser une note et un avis sur cette boutique.
                </Text>
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'Compte' })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loginBtnText}>Se connecter / s'inscrire</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.reviewFormCard}>
                <Text style={styles.reviewFormTitle}>Laisser un avis</Text>

                <Text style={styles.ratingLabel}>Votre note</Text>
                <StarRating
                  rating={reviewRating}
                  size={28}
                  interactive
                  onChange={setReviewRating}
                />

                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Votre commentaire..."
                  placeholderTextColor={COLORS.muted}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handleSubmitReview}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? 'Envoi...' : 'Publier mon avis'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {reviews.length === 0 ? (
              <EmptyState
                icon="💬"
                title="Aucun avis"
                subtitle="Soyez le premier à donner votre avis !"
              />
            ) : (
              reviews.map((review, index) => (
                <View key={review.id || index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerLetter}>
                        {(review.nom || review.name || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{review.nom || review.name}</Text>
                      <StarRating rating={review.note || review.rating || 0} size={14} />
                    </View>
                    {review.date && (
                      <Text style={styles.reviewDate}>
                        {new Date(review.date).toLocaleDateString('fr-FR')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {priceModal && (
        <Modal transparent visible animationType="slide" onRequestClose={() => setPriceModal(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>💲 Prix & remise</Text>
              <Text style={styles.modalSub} numberOfLines={2}>{priceModal.title}</Text>

              <Text style={styles.fieldLabel}>Prix de vente (FCFA)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex : 12000"
                placeholderTextColor={COLORS.mutedSoft}
                keyboardType="number-pad"
                value={priceInput}
                onChangeText={setPriceInput}
              />

              <Text style={styles.fieldLabel}>Prix avant remise (FCFA) — facultatif</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex : 15000"
                placeholderTextColor={COLORS.mutedSoft}
                keyboardType="number-pad"
                value={oldPriceInput}
                onChangeText={setOldPriceInput}
              />

              <View style={styles.chipsRow}>
                {[10, 20, 30, 40].map((pct) => (
                  <TouchableOpacity key={pct} style={styles.chip} onPress={() => handleQuickDiscount(pct)} activeOpacity={0.7}>
                    <Text style={styles.chipText}>-{pct}%</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalHint}>
                Le badge « -X% », l'ancien prix barré et la remise s'afficheront sur la fiche produit et la page d'accueil.
              </Text>

              <TouchableOpacity
                style={[styles.modalBtn, savingPrice && styles.submitBtnDisabled]}
                onPress={handleSavePrice}
                disabled={savingPrice}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnText}>{savingPrice ? 'Enregistrement...' : 'Appliquer le prix'}</Text>
              </TouchableOpacity>

              {productDiscount(priceModal).has && (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                  onPress={handleRemovePrice}
                  disabled={savingPrice}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnGhostText}>Retirer la remise</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.modalClose} onPress={() => setPriceModal(null)}>
                <Text style={styles.modalCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={accessOpen} transparent animationType="fade" onRequestClose={() => setAccessOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔑 Code gérant</Text>
            <Text style={styles.modalSub}>
              Entrez le mot de passe choisi lors de la création de la boutique pour gérer les produits.
            </Text>
            <TextInput
              style={styles.input}
              value={accessCode}
              onChangeText={setAccessCode}
              secureTextEntry
              placeholder="Code de la boutique"
              placeholderTextColor={COLORS.mutedSoft}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.modalBtn, checking && styles.submitBtnDisabled]}
              onPress={confirmAccess}
              disabled={checking}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>{checking ? 'Vérification...' : 'Débloquer l\'accès'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setAccessOpen(false)}>
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalCard}>
            <View style={styles.fullModalHead}>
              <Text style={styles.fullModalTitle}>＋ Nouveau produit</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)} activeOpacity={0.7}>
                <Text style={styles.fullModalX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.fullModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Nom du produit *</Text>
              <TextInput
                style={styles.input}
                value={apName}
                onChangeText={setApName}
                placeholder="Ex : Pagne tissé"
                placeholderTextColor={COLORS.mutedSoft}
              />

              <Text style={styles.fieldLabel}>Prix (FCFA) *</Text>
              <TextInput
                style={styles.input}
                value={apPrice}
                onChangeText={setApPrice}
                placeholder="Ex : 15000"
                placeholderTextColor={COLORS.mutedSoft}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Photos (1 à 4) *</Text>
              <View style={styles.apPhotoWrap}>
                {apPhotos.map((uri, i) => (
                  <View key={i} style={styles.apPhotoBox}>
                    <Image source={{ uri }} style={styles.apPhotoImg} resizeMode="cover" />
                    <TouchableOpacity style={styles.apPhotoRemove} onPress={() => removeApPhoto(i)} activeOpacity={0.8}>
                      <Text style={styles.apPhotoRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {apPhotos.length < 4 && (
                  <TouchableOpacity style={styles.apPhotoAdd} onPress={pickApPhoto} activeOpacity={0.85}>
                    <Text style={styles.apPhotoAddPlus}>+</Text>
                    <Text style={styles.apPhotoAddText}>Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.fieldLabel}>Réduction % (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={apReduction}
                onChangeText={setApReduction}
                placeholder="Ex : 20 (prix barré calculé automatiquement)"
                placeholderTextColor={COLORS.mutedSoft}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Catégorie *</Text>
              <View style={styles.apCatWrap}>
                {CATEGORIES.map((cat) => {
                  const active = apCategory === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[styles.apCatChip, active && styles.apCatChipActive]}
                      onPress={() => setApCategory(active ? '' : cat.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.apCatChipIcon}>{cat.icon}</Text>
                      <Text style={[styles.apCatChipText, active && styles.apCatChipTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.fullModalSubmit, apSaving && styles.submitBtnDisabled]}
                onPress={submitNewProduct}
                disabled={apSaving}
                activeOpacity={0.85}
              >
                <Text style={styles.fullModalSubmitText}>
                  {apSaving ? 'Enregistrement...' : 'Ajouter le produit'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {toastMsg && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ {toastMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.paper2,
    paddingHorizontal: SIZES.padding,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.muted,
    fontWeight: '500',
  },
  notFoundEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 8,
  },
  notFoundText: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  createBtn: {
    backgroundColor: COLORS.piment,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  createBtnText: {
    color: COLORS.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.line,
  },
  coverPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.navDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.paper,
    opacity: 0.6,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    marginTop: -30,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: COLORS.paper,
  },
  avatarFallback: {
    backgroundColor: COLORS.piment,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.paper,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
    marginTop: 30,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  shopLocation: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  reviewCount: {
    fontSize: 13,
    color: COLORS.muted,
  },
  followersText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  panelFollowers: {
    fontSize: 12.5,
    color: COLORS.muted,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  followBtn: {
    backgroundColor: COLORS.kola,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 30,
  },
  followingBtn: {
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.kola,
  },
  followText: {
    color: COLORS.paper,
    fontSize: 14,
    fontWeight: '700',
  },
  followingText: {
    color: COLORS.kola,
  },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: SIZES.padding,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 4,
    ...SHADOWS.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: COLORS.piment,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.paper,
  },
  tabContent: {
    marginTop: 16,
    paddingHorizontal: SIZES.padding,
  },
  stockPanel: {
    backgroundColor: '#FDF1DF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.or,
  },
  stockPanelTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginBottom: 4 },
  stockPanelHint: { fontSize: 12, color: COLORS.muted, lineHeight: 17 },
  stockCtrl: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  stockLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  stockEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stockBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.navDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  stockInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ink,
  },
  priceCtrlBtn: {
    alignSelf: 'center',
    backgroundColor: '#FFF1EC',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.piment,
  },
  priceCtrlText: { color: COLORS.piment, fontSize: 12, fontWeight: '800' },
  managerBar: {
    marginTop: 14,
    marginHorizontal: SIZES.padding,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  managerBtn: {
    backgroundColor: COLORS.navDark,
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  managerBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  managerHint: { fontSize: 11.5, color: COLORS.muted, lineHeight: 16, textAlign: 'center' },
  managerPanel: {
    marginTop: 14,
    marginHorizontal: SIZES.padding,
    backgroundColor: '#F4FBF7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.kola,
  },
  managerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  managerTitle: { fontSize: 14, fontWeight: '800', color: COLORS.kola },
  managerLock: { fontSize: 13, fontWeight: '700', color: COLORS.muted, textDecorationLine: 'underline' },
  addProductBtn: {
    backgroundColor: COLORS.kola,
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addProductBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  ownerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  deleteCtrlBtn: {
    backgroundColor: '#FFF1EC',
    width: 40,
    height: 34,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.piment,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCtrlText: { fontSize: 14 },
  fullModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,14,35,0.6)',
    justifyContent: 'flex-end',
  },
  fullModalCard: {
    backgroundColor: COLORS.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingTop: 18,
  },
  fullModalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lineSoft,
  },
  fullModalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  fullModalX: { fontSize: 20, fontWeight: '700', color: COLORS.muted, padding: 4 },
  fullModalBody: { padding: 20, paddingBottom: 36 },
  apPhotoWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  apPhotoBox: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
  },
  apPhotoImg: { width: '100%', height: '100%' },
  apPhotoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  apPhotoRemoveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  apPhotoAdd: {
    width: 76,
    height: 76,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.piment,
    backgroundColor: '#FFF7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  apPhotoAddPlus: { fontSize: 22, fontWeight: '800', color: COLORS.piment, lineHeight: 24 },
  apPhotoAddText: { fontSize: 10, fontWeight: '700', color: COLORS.piment },
  apCatWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  apCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  apCatChipActive: { backgroundColor: COLORS.navDark, borderColor: COLORS.navDark },
  apCatChipIcon: { fontSize: 12, marginRight: 5 },
  apCatChipText: { fontSize: 12, fontWeight: '600', color: COLORS.ink },
  apCatChipTextActive: { color: '#fff' },
  fullModalSubmit: {
    backgroundColor: COLORS.piment,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  fullModalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,14,35,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.paper,
    borderRadius: 20,
    padding: 24,
    ...SHADOWS.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.ink, textAlign: 'center' },
  modalSub: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.ink, marginBottom: 6, marginTop: 4 },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, justifyContent: 'center' },
  chip: {
    backgroundColor: '#FFF1EC',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.piment,
  },
  chipText: { color: COLORS.piment, fontSize: 12, fontWeight: '800' },
  modalHint: { fontSize: 11, color: COLORS.muted, lineHeight: 16, marginBottom: 14, textAlign: 'center' },
  modalBtn: {
    backgroundColor: COLORS.piment,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalBtnGhost: {
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalBtnGhostText: { color: COLORS.ink, fontSize: 15, fontWeight: '700' },
  modalClose: { alignSelf: 'center', padding: 8 },
  modalCloseText: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  productsRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productsGrid: {
    paddingBottom: 8,
  },
  productCell: {
    width: (width - SIZES.padding * 2 - 12) / 2,
  },
  aboutCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 21,
  },
  reviewFormCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  reviewLockCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 22,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  reviewLockIcon: { fontSize: 34, marginBottom: 8 },
  reviewLockTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, textAlign: 'center', marginBottom: 6 },
  reviewLockText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 19 },
  loginBtn: {
    marginTop: 14,
    backgroundColor: COLORS.piment,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 100,
  },
  loginBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  reviewFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.paper2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.ink,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  textarea: {
    height: 100,
    paddingTop: 12,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 6,
  },
  submitBtn: {
    backgroundColor: COLORS.piment,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  reviewCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.kola,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.paper,
  },
  reviewerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.ink,
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starBtn: {
    padding: 1,
  },
  toast: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    backgroundColor: COLORS.navDark, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 100, ...SHADOWS.lg,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
