import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SIZES } from '../src/constants/theme';
import { createBoutique } from '../src/lib/boutique';
import { getCurrentUser, userKey } from '../src/lib/auth';
import AppBar from '../src/components/AppBar';
import { CATEGORIES } from '../src/constants/categories';

export default function CreateBoutiqueScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [description, setDescription] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [ville, setVille] = useState('');
  const [products, setProducts] = useState([
    { name: '', price: '', category: '', photos: [], reduction: '' },
    { name: '', price: '', category: '', photos: [], reduction: '' },
    { name: '', price: '', category: '', photos: [], reduction: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [logo, setLogo] = useState(null);
  const [banniere, setBanniere] = useState(null);
  const [notVendeur, setNotVendeur] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setNotVendeur(!u || u.role !== 'Vendeur');
    })();
  }, []);

  const pickImage = (setter) => {
    Alert.alert('Ajouter une image', 'Choisissez une source', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Prendre une photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission refusée', 'Autorisez la caméra pour prendre une photo.');
            return;
          }
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
          if (!r.canceled && r.assets[0]) setter(r.assets[0].uri);
        },
      },
      {
        text: 'Depuis la galerie',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission refusée', 'Autorisez l\'accès à la galerie pour choisir une image.');
            return;
          }
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
          if (!r.canceled && r.assets[0]) setter(r.assets[0].uri);
        },
      },
    ]);
  };

  const updateProduct = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const pickProductPhotos = async (index) => {
    const current = products[index].photos || [];
    if (current.length >= 4) {
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
      selectionLimit: 4 - current.length,
    });
    if (r.canceled || !r.assets) return;
    const uris = r.assets.map((a) => a.uri).slice(0, 4 - current.length).filter(Boolean);
    if (!uris.length) return;
    updateProduct(index, 'photos', [...current, ...uris]);
  };

  const removeProductPhoto = (index, photoIndex) => {
    const updated = [...products];
    updated[index].photos = (updated[index].photos || []).filter((_, i) => i !== photoIndex);
    setProducts(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de boutique.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un mot de passe.');
      return;
    }
    if (!logo) {
      Alert.alert('Logo manquant', 'Choisissez un logo pour votre boutique.');
      return;
    }
    if (!banniere) {
      Alert.alert('Bannière manquante', 'Choisissez une bannière pour votre boutique.');
      return;
    }

    const filledProducts = products.filter((p) => p.name.trim() && p.price.trim());
    for (const p of filledProducts) {
      if (!p.category) {
        Alert.alert('Catégorie manquante', `Choisissez une catégorie pour « ${p.name.trim()} ».`);
        return;
      }
      if (!p.photos || p.photos.length === 0) {
        Alert.alert('Photo manquante', `Ajoutez au moins 1 photo au produit « ${p.name.trim()} » (1 à 4 photos).`);
        return;
      }
      if (p.photos.length > 4) {
        Alert.alert('Trop de photos', `« ${p.name.trim()} » a plus de 4 photos, maximum autorisé.`);
        return;
      }
    }

    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      const boutiqueData = {
        nom: name.trim(),
        motDePasse: password.trim(),
        proprietaireKey: currentUser ? userKey(currentUser) : null,
        logo: logo,
        banniere: banniere,
        ville: ville.trim(),
        histoire: description.trim(),
        reseaux: {
          facebook: facebook.trim(),
          instagram: instagram.trim(),
          tiktok: tiktok.trim(),
          whatsapp: whatsapp.trim(),
        },
        produits: filledProducts.map((p) => {
          const price = parseFloat(p.price.replace(/\s/g, '').replace(/,/g, '.')) || 0;
          const reduction = parseFloat(p.reduction) || 0;
          let oldPrice;
          if (price > 0 && reduction > 0 && reduction < 100) {
            oldPrice = Math.round(price / (1 - reduction / 100));
          }
          return {
            title: p.name.trim(),
            price,
            category: p.category,
            img: p.photos[0] || undefined,
            photos: p.photos,
            oldPrice,
          };
        }),
      };

      const result = await createBoutique(boutiqueData);
      setSuccess({
        slug: boutiqueData.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        name: boutiqueData.nom,
        url: result?.url || boutiqueData.nom,
      });
    } catch {
      Alert.alert('Erreur', 'Échec de la création de la boutique. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (notVendeur) {
    return (
      <View style={styles.container}>
        <AppBar title="Créer une boutique" onBack={() => navigation.goBack()} />
        <View style={styles.centerMsg}>
          <Text style={styles.centerEmoji}>🔒</Text>
          <Text style={styles.centerTitle}>Réservé aux vendeurs</Text>
          <Text style={styles.centerText}>
            Seuls les comptes vendeurs peuvent créer une boutique. Créez un compte vendeur
            ou connectez-vous avec votre compte vendeur pour ouvrir votre boutique.
          </Text>
          <TouchableOpacity
            style={styles.goBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Compte' })}
            activeOpacity={0.8}
          >
            <Text style={styles.goBtnText}>Accéder à mon compte</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.container}>
        <AppBar title="Boutique créée" onBack={() => navigation.goBack()} />
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Félicitations !</Text>
          <Text style={styles.successSubtitle}>
            Votre boutique « {success.name} » a été créée avec succès.
          </Text>
          <View style={styles.urlBox}>
            <Text style={styles.urlLabel}>URL de votre boutique :</Text>
            <Text style={styles.urlText}>afrimarket/{success.slug}</Text>
          </View>
          <View style={[styles.urlBox, styles.codeBox]}>
            <Text style={styles.urlLabel}>🔑 Code gérant (mot de passe défini) :</Text>
            <Text style={styles.codeText}>{password}</Text>
            <Text style={styles.codeHint}>
              Gardez-le précieusement : il sert à accéder à votre boutique pour ajouter des produits et gérer le stock.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('BoutiqueDetail', { slug: success.slug })}
          >
            <Text style={styles.actionBtnText}>Voir ma boutique</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={() => navigation.navigate('BoutiqueDetail', { slug: success.slug })}
          >
            <Text style={[styles.actionBtnText, styles.secondaryBtnText]}>Aller au tableau de bord</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.goBackLink}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppBar title="Créer une boutique" onBack={() => navigation.goBack()} />

      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={styles.stepRow}>
            <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>{s}</Text>
            </View>
            {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Informations générales</Text>
            <Text style={styles.label}>Nom de la boutique *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex : Boutique Tiébdo"
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.label}>Mot de passe (code gérant) *</Text>
            <View style={styles.passWrap}>
              <TextInput
                style={[styles.input, styles.passInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Mot de passe"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass(!showPass)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeBtnText}>{showPass ? 'Masquer' : 'Afficher'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionHint}>
              Ce code vous servira à accéder à votre boutique pour ajouter des produits et gérer le stock. Conservez-le.
            </Text>
          </View>
        )}

        {step === 2 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Description & Réseaux sociaux</Text>
            <Text style={styles.label}>Ville / Localisation</Text>
            <TextInput
              style={styles.input}
              value={ville}
              onChangeText={setVille}
              placeholder="Ex : Ouagadougou, Bobo-Dioulasso..."
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez votre boutique..."
              placeholderTextColor={COLORS.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.label}>Facebook</Text>
            <TextInput
              style={styles.input}
              value={facebook}
              onChangeText={setFacebook}
              placeholder="Lien Facebook"
              placeholderTextColor={COLORS.muted}
              keyboardType="url"
            />
            <Text style={styles.label}>Instagram</Text>
            <TextInput
              style={styles.input}
              value={instagram}
              onChangeText={setInstagram}
              placeholder="Lien Instagram"
              placeholderTextColor={COLORS.muted}
              keyboardType="url"
            />
            <Text style={styles.label}>TikTok</Text>
            <TextInput
              style={styles.input}
              value={tiktok}
              onChangeText={setTiktok}
              placeholder="Lien TikTok"
              placeholderTextColor={COLORS.muted}
              keyboardType="url"
            />
            <Text style={styles.label}>WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="Numéro WhatsApp"
              placeholderTextColor={COLORS.muted}
              keyboardType="phone-pad"
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Logo & Bannière</Text>
            <Text style={styles.sectionHint}>
              Ces images donnent une identité à votre boutique. Le logo s'affiche à côté du nom, la bannière en en-tête.
            </Text>

            <Text style={styles.label}>Logo *</Text>
            <TouchableOpacity style={styles.logoTile} onPress={() => pickImage(setLogo)} activeOpacity={0.85}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.logoPreview} />
              ) : (
                <>
                  <Text style={styles.logoPlaceholderIcon}>🏷️</Text>
                  <Text style={styles.logoPlaceholderText}>Choisir un logo (photo carrée de préférence)</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Bannière *</Text>
            <TouchableOpacity style={styles.bannerTile} onPress={() => pickImage(setBanniere)} activeOpacity={0.85}>
              {banniere ? (
                <Image source={{ uri: banniere }} style={styles.bannerPreview} />
              ) : (
                <>
                  <Text style={styles.bannerPlaceholderIcon}>🖼️</Text>
                  <Text style={styles.bannerPlaceholderText}>Choisir une bannière (image large)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Produits (jusqu'à 3)</Text>
            <Text style={styles.sectionHint}>
              Chaque produit : 1 à 4 photos (la 1re s'affiche partout) et une réduction (%) en option.
            </Text>
            {products.map((product, index) => (
              <View key={index} style={styles.productCard}>
                <Text style={styles.productLabel}>Produit {index + 1}</Text>
                <TextInput
                  style={styles.input}
                  value={product.name}
                  onChangeText={(val) => updateProduct(index, 'name', val)}
                  placeholder={`Nom du produit ${index + 1}`}
                  placeholderTextColor={COLORS.muted}
                />
                <TextInput
                  style={styles.input}
                  value={product.price}
                  onChangeText={(val) => updateProduct(index, 'price', val)}
                  placeholder="Prix (FCFA)"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />

                <Text style={styles.productCatLabel}>Photos (1 à 4) *</Text>
                <View style={styles.photoWrap}>
                  {(product.photos || []).map((uri, photoIndex) => (
                    <View key={photoIndex} style={styles.photoBox}>
                      <Image source={{ uri }} style={styles.photoImg} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => removeProductPhoto(index, photoIndex)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.photoRemoveText}>Retirer</Text>
                      </TouchableOpacity>
                      {photoIndex === 0 && (
                        <View style={styles.mainPhotoBadge}>
                          <Text style={styles.mainPhotoBadgeText}>1re</Text>
                        </View>
                      )}
                    </View>
                  ))}
                  {(product.photos || []).length < 4 && (
                    <TouchableOpacity style={styles.photoAdd} onPress={() => pickProductPhotos(index)} activeOpacity={0.8}>
                      <Text style={styles.photoAddPlus}>+</Text>
                      <Text style={styles.photoAddText}>Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.input}
                  value={product.reduction}
                  onChangeText={(val) => updateProduct(index, 'reduction', val)}
                  placeholder="Réduction % (optionnel, ex : 20)"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
                {parseFloat(product.reduction) > 0 && parseFloat(product.reduction) < 100 && parseFloat(product.price.replace(/\s/g, '').replace(/,/g, '.')) > 0 && (
                  <Text style={styles.reductionPreview}>
                    Prix barré affiché : {Math.round(parseFloat(product.price.replace(/\s/g, '').replace(/,/g, '.')) / (1 - parseFloat(product.reduction) / 100))} FCFA
                  </Text>
                )}

                <Text style={styles.productCatLabel}>Catégorie du produit *</Text>
                <View style={styles.catWrap}>
                  {CATEGORIES.map((cat) => {
                    const active = product.category === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        style={[styles.catChip, active && styles.catChipActive]}
                        onPress={() => updateProduct(index, 'category', active ? '' : cat.name)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.catChipIcon}>{cat.icon}</Text>
                        <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.footerPrev} onPress={() => setStep(step - 1)} activeOpacity={0.7}>
            <Text style={styles.footerPrevText}>Retour</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.footerNext, loading && styles.buttonDisabled]}
          onPress={() => (step === 4 ? handleSubmit() : setStep(step + 1))}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.paper} size="small" />
          ) : (
            <Text style={styles.footerNextText}>
              {step === 4 ? 'Créer ma boutique' : 'Suivant'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper2,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.paper,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.piment,
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
  },
  stepDotTextActive: {
    color: COLORS.paper,
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.line,
    marginHorizontal: 6,
    borderRadius: 2,
  },
  stepLineActive: {
    backgroundColor: COLORS.piment,
  },
  scrollArea: {
    flex: 1,
  },
  formSection: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 12.5,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: '500',
  },
  photoWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 6,
  },
  photoBox: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: COLORS.piment,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mainPhotoBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  photoAdd: {
    width: 84,
    height: 84,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.piment,
    backgroundColor: '#FFF7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddPlus: { fontSize: 26, fontWeight: '800', color: COLORS.piment, lineHeight: 28 },
  photoAddText: { fontSize: 11, fontWeight: '700', color: COLORS.piment },
  reductionPreview: {
    fontSize: 12.5,
    color: COLORS.kola,
    fontWeight: '700',
    marginTop: 6,
  },
  logoTile: {
    width: 132,
    height: 132,
    borderRadius: 20,
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.piment,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  logoPreview: { width: '100%', height: '100%' },
  logoPlaceholderIcon: { fontSize: 34, marginBottom: 6 },
  logoPlaceholderText: { fontSize: 11.5, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 10, lineHeight: 16 },
  bannerTile: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.piment,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  bannerPreview: { width: '100%', height: '100%' },
  bannerPlaceholderIcon: { fontSize: 34, marginBottom: 6 },
  bannerPlaceholderText: { fontSize: 12, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 12, lineHeight: 17 },
  codeBox: {
    borderColor: COLORS.kola,
    backgroundColor: '#F4FBF7',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.kola,
  },
  codeHint: { fontSize: 12, color: COLORS.muted, marginTop: 6, lineHeight: 17 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.ink,
  },
  textArea: {
    height: 110,
    paddingTop: 12,
  },
  passWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passInput: {
    flex: 1,
  },
  eyeBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  eyeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.piment,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  footerPrev: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerPrevText: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  footerNext: {
    flex: 1,
    backgroundColor: COLORS.piment,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerNextText: {
    color: COLORS.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  productCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  productLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.kola,
    marginBottom: 8,
  },
  productCatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
    marginTop: 12,
    marginBottom: 8,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  catChipActive: {
    backgroundColor: COLORS.navDark,
    borderColor: COLORS.navDark,
  },
  catChipIcon: { fontSize: 13, marginRight: 5 },
  catChipText: { fontSize: 12, fontWeight: '600', color: COLORS.ink },
  catChipTextActive: { color: '#fff' },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centerMsg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centerEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  centerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 10,
    textAlign: 'center',
  },
  centerText: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  goBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  goBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.kola,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  urlBox: {
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    padding: 16,
    width: '100%',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  urlLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 4,
  },
  urlText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ink,
  },
  actionBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtnText: {
    color: COLORS.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.piment,
  },
  secondaryBtnText: {
    color: COLORS.piment,
  },
  goBackLink: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});
