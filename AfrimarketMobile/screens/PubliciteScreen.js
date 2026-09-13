import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { getCurrentUser, getAllAccounts, userKey } from '../src/lib/auth';
import { getPlatformSettings } from '../src/lib/settings';
import { getSellerBoutiques, savePubRequest } from '../src/lib/pub';
import AppBar from '../src/components/AppBar';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function PubliciteScreen() {
  const [loading, setLoading] = useState(true);
  const [vendeursCount, setVendeursCount] = useState(0);
  const [cfg, setCfg] = useState({ pubSellerEnabled: false, pubSellerMin: 50 });
  const [boutiques, setBoutiques] = useState([]);

  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [days, setDays] = useState('3');
  const [boutique, setBoutique] = useState('');
  const [media, setMedia] = useState(null);
  const [sending, setSending] = useState(false);

  const open = cfg.pubSellerEnabled && vendeursCount >= cfg.pubSellerMin;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const user = await getCurrentUser();
        const [s, accounts] = await Promise.all([getPlatformSettings(), getAllAccounts()]);
        const nb = (accounts || []).filter((a) => a.role === 'Vendeur').length;
        const own = user ? await getSellerBoutiques(userKey(user)) : [];
        if (!active) return;
        setCfg(s);
        setVendeursCount(nb);
        setBoutiques(own);
        if (own.length && !boutique) setBoutique(own[0].slug);
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission refusée', 'Autorisez l’accès à la galerie pour importer une image.');
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!r.canceled && r.assets?.[0]?.uri) {
        setMedia(r.assets[0].uri);
        Alert.alert('Image ajoutée ✓', 'Votre publicité sera diffusée en photo, passable par les clients.');
      }
    } catch {}
  };

  const submit = async () => {
    const user = await getCurrentUser();
    if (!user) return;
    if (!media) {
      Alert.alert('Visuel requis', 'Ajoutez une image pour votre publicité.');
      return;
    }
    if (!boutique) {
      Alert.alert('Boutique requise', 'Choisissez la boutique à promouvoir.');
      return;
    }
    setSending(true);
    try {
      await savePubRequest({
        sellerKey: userKey(user),
        sellerName: user.name,
        sellerPhone: user.phone,
        boutique,
        boutiqueNom: (boutiques.find((b) => b.slug === boutique) || {}).nom || boutique,
        media,
        title: title.trim(),
        theme: theme.trim(),
        days,
      });
      setTitle('');
      setTheme('');
      setDays('3');
      setMedia(null);
      Alert.alert('Demande envoyée ✓', 'Votre demande de publicité a été transmise à l\'administrateur. Vous serez informé dès qu\'elle sera validée.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerGrow]}>
        <AppBar title="Publicité" showBack />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppBar title="Publicité sur AfriMarket" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{open ? '📣' : '🚧'}</Text>
          <Text style={styles.heroTitle}>{open ? 'Lancer votre publicité' : 'Publicité — en cours de développement'}</Text>
          <Text style={styles.heroSub}>
            {open
              ? 'Votre publicité en photo sera diffusée aux clients à l\'ouverture de l\'application, avec un lien vers votre boutique.'
              : 'La diffusion publicitaire ouvre bientôt pour les vendeurs. Plus il y a de vendeurs, plus vite elle sera disponible !'}
          </Text>
        </View>

        {!open && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Progression des comptes vendeurs</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (vendeursCount / Math.max(1, cfg.pubSellerMin)) * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {vendeursCount} compte(s) vendeur sur <Text style={styles.progressStrong}>{cfg.pubSellerMin}</Text> requis
            </Text>
            <Text style={styles.formHint}>
              Quand ce seuil sera atteint, l'option « Faire de la publicité » s'activera automatiquement pour tous les vendeurs. Invitez d'autres vendeurs pour accélérer l'ouverture.
            </Text>
          </View>
        )}

        {open && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Titre de la publicité</Text>
            <TextInput
              style={styles.settingInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex : Pagnes Wax en promotion"
              placeholderTextColor={COLORS.muted}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Boutique à promouvoir</Text>
            <View style={styles.operatorWrap}>
              {boutiques.length === 0 && (
                <Text style={styles.cardMeta}>Aucune boutique trouvée pour votre compte.</Text>
              )}
              {boutiques.map((b) => {
                const sel = boutique === b.slug;
                return (
                  <TouchableOpacity
                    key={b.slug}
                    style={[styles.operatorChip, sel && styles.operatorChipActive]}
                    onPress={() => setBoutique(b.slug)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.operatorChipText, sel && styles.operatorChipActiveText]} numberOfLines={1}>{b.nom}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Thème / mots-clés (optionnel)</Text>
            <TextInput
              style={styles.settingInput}
              value={theme}
              onChangeText={setTheme}
              placeholder="Ex : pagnes, wax, vêtements"
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.formHint}>Ces mot-clés correspondent aux recherches des clients : votre pub leur est proposée en priorité, pour toucher les gens intéressés par votre produit.</Text>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Visuel (image)</Text>
            {media ? (
              <View style={styles.mediaBox}>
                <Image source={{ uri: media }} style={styles.mediaThumb} />
                <Text style={styles.mediaLabel}>Image sélectionnée</Text>
                <TouchableOpacity onPress={() => setMedia(null)}>
                  <Text style={styles.mediaRemove}>✕ Retirer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start' }]} onPress={pickImage}>
                <Text style={styles.miniBtnText}>🖼️ Choisir une photo</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Durée de diffusion (en jours)</Text>
            <TextInput
              style={styles.settingInput}
              keyboardType="numeric"
              value={String(days)}
              onChangeText={setDays}
              placeholder="3"
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.formHint}>La publicité sera diffusée automatiquement pendant cette durée, avec possibilité de la passer pour les clients.</Text>

            <TouchableOpacity
              style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 14 }]}
              onPress={submit}
              disabled={sending}
            >
              <Text style={styles.miniBtnText}>{sending ? 'Envoi...' : '📨 Envoyer la demande de pub'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.foot}>
          💡 Votre publicité sera approuvée par la plateforme AfriMarket avant diffusion.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  centerGrow: { alignItems: 'center' },
  loadingText: { color: COLORS.muted, marginTop: 40 },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: COLORS.navDark,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  heroEmoji: { fontSize: 40, marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  heroSub: { color: '#B9B6D2', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  card: {
    backgroundColor: COLORS.paper,
    borderColor: COLORS.lineSoft,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, marginBottom: 5 },
  settingInput: {
    backgroundColor: COLORS.paper2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.ink,
    fontSize: 14,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.paper2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.piment, borderRadius: 6 },
  progressText: { color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  progressStrong: { color: COLORS.piment, fontWeight: '800' },
  formHint: { fontSize: 11, color: COLORS.muted, marginTop: 8, lineHeight: 16 },
  cardMeta: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  operatorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  operatorChip: { backgroundColor: '#FFF1EC', borderRadius: 100, paddingVertical: 6, paddingHorizontal: 12 },
  operatorChipActive: { backgroundColor: COLORS.navDark },
  operatorChipText: { color: COLORS.piment, fontSize: 12, fontWeight: '700' },
  operatorChipActiveText: { color: '#fff' },
  rowBtns: { flexDirection: 'row', gap: 10 },
  miniBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 100, alignItems: 'center' },
  miniOk: { backgroundColor: COLORS.kola },
  miniGhost: { backgroundColor: COLORS.paper2, borderWidth: 1, borderColor: COLORS.line },
  miniGhostText: { color: COLORS.ink },
  miniBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  mediaBox: {
    backgroundColor: COLORS.paper2,
    borderRadius: 12,
    alignItems: 'center',
    padding: 14,
  },
  mediaThumb: { width: 120, height: 120, borderRadius: 10, marginBottom: 8 },
  mediaLabel: { color: COLORS.ink, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  mediaRemove: { color: COLORS.piment, fontSize: 12, fontWeight: '700' },
  foot: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});