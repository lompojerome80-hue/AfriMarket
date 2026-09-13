import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, BackHandler,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCurrentUser, userKey } from '../src/lib/auth';
import {
  CONTRAT_TITRE, CONTRAT_TEXTE, SEUIL_CONTRAT,
  getSellerContractState, acceptContract,
} from '../src/lib/contract';
import AppBar from '../src/components/AppBar';
import { COLORS, SIZES } from '../src/constants/theme';

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); } catch { return ''; }
}

export default function ContractScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const gate = !!route.params?.gate;

  const [state, setState] = useState({ sent: true, acceptedAt: null, version: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (u) setState(await getSellerContractState(userKey(u)));
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!gate) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [gate]);

  const handleAccept = () => {
    Alert.alert(
      'Acceptation du contrat',
      'Vous reconnaissez avoir lu et compris l\'intégralité du contrat de partenariat, y compris les règles de compensation, de sécurisation des fonds et d\'interdiction des ventes hors plateforme. Votre acceptation électronique vaut signature.',
      [
        gate ? null : { text: 'Annuler', style: 'cancel' },
        {
          text: 'J\'ai lu et j\'accepte',
          onPress: async () => {
            setSaving(true);
            const u = await getCurrentUser();
            if (u) setState(await acceptContract(userKey(u)));
            setSaving(false);
            if (gate) {
              navigation.goBack();
            } else {
              Alert.alert('Engagement enregistré ✓', 'Merci pour votre confiance. Le contrat est consultable à tout moment depuis votre compte.');
            }
          },
        },
      ].filter(Boolean)
    );
  };

  return (
    <View style={styles.container}>
      {gate ? (
        <View style={styles.gateTop}>
          <Text style={styles.gateLogo}>AFRIMARKET</Text>
          <Text style={styles.gateBadge}>Partenariat · Vendeur</Text>
        </View>
      ) : (
        <AppBar title="Contrat vendeur" onBack={() => navigation.goBack()} />
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🎉</Text>
          <Text style={styles.heroTitle}>
            {gate ? 'Félicitations !' : CONTRAT_TITRE}
          </Text>
          <Text style={styles.heroSub}>
            {gate
              ? `Vous avez atteint ${SEUIL_CONTRAT} ventes payées sur AfriMarket. Votre contrat de partenariat doit être lu et accepté pour continuer à vendre.`
              : 'Ce document régit l\'ensemble de votre activité sur AfriMarket. Prenez le temps de le lire avant d\'accepter.'}
          </Text>
          <Text style={styles.heroCount}>
            📄 {CONTRAT_TEXTE.length} articles · envoi automatique après {SEUIL_CONTRAT} ventes
          </Text>
        </View>

        {CONTRAT_TEXTE.map((art) => (
          <View key={art.n} style={styles.article}>
            <Text style={styles.articleTitle}>{art.title}</Text>
            {art.body.split('\n').map((para, i) => (
              <Text key={i} style={styles.articleBody}>{para}</Text>
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          {loading ? (
            <ActivityIndicator color={COLORS.piment} />
          ) : state.acceptedAt ? (
            <>
              <Text style={styles.acceptedText}>
                ✓ Contrat accepté le {fmtDate(state.acceptedAt)}
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                <Text style={styles.doneBtnText}>Retour à la boutique</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.acceptBtn, saving && styles.acceptBtnDisabled]}
                activeOpacity={0.85}
                disabled={saving}
                onPress={handleAccept}
              >
                <Text style={styles.acceptBtnText}>
                  {saving ? 'Enregistrement…' : 'J\'ai lu et j\'accepte les conditions'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.footerHint}>
                En acceptant, vous signez électroniquement. Une vente hors plateforme perd escrow, livraison supervisée et recours.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F3' },
  gateTop: {
    backgroundColor: '#0F0E23',
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: SIZES.padding,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  gateLogo: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  gateBadge: { color: '#F7B92D', fontSize: 12, fontWeight: '700', marginTop: 2 },
  content: { padding: SIZES.padding, paddingBottom: 80 },
  hero: {
    backgroundColor: '#0F0E23', borderRadius: 16,
    padding: 20, marginBottom: 20, alignItems: 'center',
  },
  heroIcon: { fontSize: 36, marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', lineHeight: 25, marginBottom: 8 },
  heroSub: { color: '#C9C7DE', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 8 },
  heroCount: { color: '#F7B92D', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  article: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EEECE6',
  },
  articleTitle: { fontSize: 14, fontWeight: '800', color: COLORS.piment, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  articleBody: { fontSize: 13.5, lineHeight: 21, color: '#3A394A', marginBottom: 10 },
  footer: { marginTop: 10 },
  acceptBtn: { backgroundColor: COLORS.piment, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  acceptBtnDisabled: { opacity: 0.5 },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  footerHint: { marginTop: 12, fontSize: 12.5, color: '#8A8895', textAlign: 'center', lineHeight: 18 },
  acceptedText: { textAlign: 'center', fontSize: 14, fontWeight: '800', color: COLORS.kola, marginBottom: 6 },
  doneBtn: { backgroundColor: COLORS.kola, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});