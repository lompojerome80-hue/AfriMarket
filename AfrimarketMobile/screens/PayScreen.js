import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createOrder } from '../src/lib/orders';
import { createPaiement, getActiveProviders, computeFees, getProvider } from '../src/lib/payments';
import { applyCoupon, markCouponUsed } from '../src/lib/coupons';
import { getCurrentUser, userKey } from '../src/lib/auth';
import { getCurrentPosition } from '../src/lib/location';
import { getZones, getPlatformSettings } from '../src/lib/settings';
import { clearCart, fcfa } from '../src/lib/cart';
import { trackPurchase } from '../src/lib/tracking';
import {
  initRemotePayment, verifyRemoteOtp, resendRemoteOtp, makeMerchantId, openPaymentUrl,
} from '../src/services/paymentApi';
import AppBar from '../src/components/AppBar';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function PayScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { items = [], total = 0 } = route.params || {};

  const [providerKey, setProviderKey] = useState('orange');
  const [providers, setProviders] = useState([]);
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState('init');
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [remoteMode, setRemoteMode] = useState(false);
  const [merchantId, setMerchantId] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoErr, setPromoErr] = useState('');
  const [fees, setFees] = useState({ frais: 0, totalWithFees: total });
  const [zones, setZones] = useState([]);
  const [zoneKey, setZoneKey] = useState('');
  const [minOrder, setMinOrder] = useState(0);

  useEffect(() => {
    (async () => {
      const [p, z, st] = await Promise.all([getActiveProviders(), getZones(), getPlatformSettings()]);
      setProviders(p);
      setZones(z || []);
      setMinOrder(Number((st && st.minOrder) || 0));
      setProviderKey((k) => (p.some((x) => x.key === k) ? k : (p[0] && p[0].key) || 'orange'));
    })();
  }, []);

  const baseTotal = Math.max(0, total - (promo?.remise || 0));
  const zone = zones.find((z) => z.id === zoneKey) || null;
  const livraisonFee = zone ? Number(zone.frais) || 0 : 0;
  const orderTotal = baseTotal + livraisonFee;

  useEffect(() => {
    (async () => { setFees(await computeFees(orderTotal, providerKey)); })();
  }, [orderTotal, providerKey]);

  const { frais, totalWithFees } = fees;
  const provider = getProvider(providerKey);
  const curProv = providers.find((p) => p.key === providerKey) || provider;

  const completePayment = async (digits) => {
    const user = await getCurrentUser();
    if (!user) {
      setStage('init');
      return;
    }
    const order = await createOrder({
      items,
      total: orderTotal,
      coupon: promo ? { code: promo.code, remise: promo.remise } : null,
      livraison: zone ? { ville: zone.ville, frais: livraisonFee } : null,
      client: {
        key: userKey(user),
        name: user.name,
        phone: user.phone,
        email: user.email || '',
        role: user.role || 'Acheteur',
      },
      location: await getCurrentPosition(),
    });
    if (!order) throw new Error('Commande vide');
    await createPaiement({ order, providerKey, phone: digits });
    if (promo) await markCouponUsed(promo.code);
    await clearCart();
    const boutiquesAchetees = Array.from(
      new Set((order.items || []).map((it) => it.shopSlug || it.boutique_nom || it.boutiqueName || it.ownerKey).filter(Boolean))
    );
    trackPurchase(boutiquesAchetees).catch(() => {});
    navigation.replace('Receipt', { orderId: order.id });
  };

  const handleApplyPromo = async () => {
    if (promo) {
      setPromo(null);
      setPromoErr('');
      return;
    }
    const code = promoCode.trim();
    if (!code) { setPromoErr('Entrez un code promo.'); return; }
    const res = await applyCoupon(code, total);
    if (!res.ok) { setPromoErr(res.error || 'Code invalide.'); setPromo(null); return; }
    setPromo({ code: res.code, remise: res.remise });
    setPromoErr('');
    Alert.alert('Promo appliquée 🎉', `-${fcfa(res.remise)} sur votre commande (code ${res.code}).`);
  };

  const handlePay = async () => {
    const digits = String(phone || '').replace(/\s+/g, '');
    if (!/^[0-9+]{8,}$/.test(digits)) {
      Alert.alert('Numéro invalide', 'Entrez un numéro Mobile Money (8 chiffres ou plus).');
      return;
    }
    const user = await getCurrentUser();
    if (!user) {
      Alert.alert('Compte requis', 'Connectez-vous d\'abord dans l\'onglet Compte.');
      return;
    }
    if (minOrder > 0 && orderTotal < minOrder) {
      setProcessing(false);
      Alert.alert('Montant minimum', `La commande minimale sur la plateforme est de ${fcfa(minOrder)} (vous êtes à ${fcfa(orderTotal)}). Ajoutez des articles au panier.`);
      return;
    }
    setProcessing(true);
    try {
      setMerchantId('');
      setOtpInput('');
      setOtpCode('');
      const merchantTransactionId = makeMerchantId();
      const basket = [
        ...(Array.isArray(items) ? items : []).map((it) => ({
          id: it.id != null ? String(it.id) : 'article',
          name: it.title || 'Article',
          prixUnitaire: Math.round(Number(it.price) || 0),
          qte: Math.max(1, Number(it.qty) || 1),
        })),
      ];
      if (livraisonFee > 0) {
        basket.push({ id: 'livraison', name: `Livraison ${zone ? zone.ville : ''}`, prixUnitaire: Math.round(livraisonFee), qte: 1 });
      }
      if (frais > 0) {
        basket.push({ id: 'frais', name: `Frais ${provider.brand}`, prixUnitaire: Math.round(frais), qte: 1 });
      }
      const init = await initRemotePayment({
        merchantTransactionId,
        amount: totalWithFees,
        currency: 'XOF',
        operatorKey: providerKey,
        phone: digits,
        designation: 'Commande AfriMarket',
        customerName: user.name || 'Client',
        items: basket,
        promoCode: promo && promo.remise > 0 ? promo.code : null,
      });
      if (init && init.ok) {
        setRemoteMode(true);
        setMerchantId(init.merchantTransactionId || merchantTransactionId);
        if (init.otpCode) setOtpCode(init.otpCode);
        if (init.mustBeRedirected && init.paymentUrl) openPaymentUrl(init.paymentUrl);
      } else if (init && init.ok === false) {
        setStage('init');
        if (init.code === 'PRICE_NOT_FOUND' || init.code === 'PRICE_SOURCE_UNAVAILABLE') {
          Alert.alert(
            'Article non vérifiable',
            "Un article de votre panier n'existe pas encore dans la base des prix de la plateforme, ou son prix est momentanément indisponible. Le paiement est refusé par sécurité : aucun montant ne peut être inventé.\n\nContactez le vendeur pour recréer l'article, ou composez une commande avec des articles déjà en ligne.",
            [{ text: 'OK' }]
          );
          return;
        }
        Alert.alert(
          'Paiement refusé par le serveur',
          (init.error || 'La passerelle de paiement a refusé la demande.') +
            ' Aucun paiement simulé ne sera appliqué.',
          [{ text: 'OK' }]
        );
        return;
      } else if (init === null) {
        /* Serveur injoignable (panne réseau / serveur non lancé / URL erronée).
         * Cas calqué sur le bloc « serveur a refusé » :
         *  - __DEV__ (app en cours de dev via Metro) : on avertit puis on poursuit
         *    en simulation locale pour ne pas bloquer la mise au point.
         *  - build de prod (EAS/expo export) : on bloque — jamais de paiement
         *    simulé quand le vrai serveur est censé être joignable. */
        if (__DEV__) {
          Alert.alert(
            'Serveur de paiement injoignable',
            "Impossible de joindre le serveur de paiement. En mode démo (DEV), on bascule sur un paiement simulé local.",
            [{ text: 'OK' }]
          );
          setRemoteMode(false);
          setOtpCode(String(Math.floor(1000 + Math.random() * 9000)));
        } else {
          setStage('init');
          Alert.alert(
            'Paiement indisponible',
            'Impossible de joindre le serveur de paiement, réessayez plus tard. Aucun paiement ne sera appliqué.',
            [{ text: 'OK' }]
          );
          return;
        }
      } else if (!__DEV__) {
        /* Réponse inattendue du serveur (ni ok:true, ni refus, ni null) en prod :
         * on refuse plutôt que de laisser partir un paiement simulé. */
        setStage('init');
        Alert.alert(
          'Paiement indisponible',
          'Réponse inattendue du serveur de paiement, réessayez plus tard. Aucun paiement ne sera appliqué.',
          [{ text: 'OK' }]
        );
        return;
      } else {
        setRemoteMode(false);
        setOtpCode(String(Math.floor(1000 + Math.random() * 9000)));
      }
      setStage('otp');
    } finally {
      setProcessing(false);
    }
  };

  const handleResendOtp = async () => {
    if (remoteMode && merchantId) {
      const r = await resendRemoteOtp(merchantId);
      if (r && r.ok) {
        if (r.otpCode) setOtpCode(r.otpCode);
        setOtpInput('');
        Alert.alert('Code renvoyé', r.otpCode
          ? `Nouveau code OTP : ${r.otpCode}`
          : `Un nouveau code a été envoyé par SMS au ${phone}.`);
        return;
      }
    }
    /* Aucun code renvoyé par le serveur (panne réseau ou refus) :
     * en prod on refuse — un code simulé ferait valider un paiement gratuit.
     * En DEV, on garde la simulation locale pour la mise au point. */
    if (!__DEV__) {
      Alert.alert(
        'Paiement indisponible',
        "Le serveur de paiement n'a pas renvoyé de nouveau code, réessayez plus tard.",
        [{ text: 'OK' }]
      );
      return;
    }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setOtpCode(code);
    setOtpInput('');
    Alert.alert('Code renvoyé', `Nouveau code OTP : ${code}`);
  };

  const handleConfirmOtp = async () => {
    if (stage !== 'otp') return;
    const code = String(otpInput).trim();
    setProcessing(true);
    try {
      if (remoteMode && merchantId) {
        const r = await verifyRemoteOtp(merchantId, code);
        if (!r || !r.ok) {
          Alert.alert('Code invalide', 'Le code OTP saisi a été refusé par le serveur.');
          setProcessing(false);
          return;
        }
      } else if (code !== otpCode) {
        Alert.alert('Code invalide', 'Le code saisi ne correspond pas à celui reçu par SMS.');
        setProcessing(false);
        return;
      }
      const digits = String(phone || '').replace(/\s+/g, '');
      await completePayment(digits);
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Échec du paiement');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.paper2 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppBar title="Paiement Mobile Money" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Commande en attente de paiement</Text>
          {items.slice(0, 3).map((it) => (
            <Text key={it.id} style={styles.summaryLine}>
              • {it.title} × {it.qty}
            </Text>
          ))}
          {items.length > 3 && <Text style={styles.summaryMore}>+ {items.length - 3} autre(s)</Text>}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total marchandise</Text>
            <Text style={styles.summaryTotal}>{fcfa(total)}</Text>
          </View>
          {promo ? (
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Code promo {promo.code}</Text>
              <Text style={[styles.summaryTotal, { color: COLORS.kola }]}>-{fcfa(promo.remise)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.promoCard}>
          <TextInput
            style={styles.promoInput}
            placeholder="Code promo (ex : AFRO-10)"
            placeholderTextColor={COLORS.mutedSoft}
            autoCapitalize="characters"
            autoCorrect={false}
            value={promoCode}
            onChangeText={setPromoCode}
            editable={!promo}
          />
          <TouchableOpacity
            style={[styles.promoBtn, promo && styles.promoBtnOff]}
            onPress={handleApplyPromo}
            activeOpacity={0.85}
          >
            <Text style={styles.promoBtnText}>{promo ? 'Retirer' : 'Appliquer'}</Text>
          </TouchableOpacity>
        </View>
        {promo
          ? <Text style={styles.promoNote}>✓ Promo appliquée : {promo.code} (-{fcfa(promo.remise)})</Text>
          : promoErr ? <Text style={styles.promoErr}>{promoErr}</Text> : null}

        <Text style={styles.label}>Opérateur Mobile Money</Text>
        <View style={styles.operatorRow}>
          {providers.map((p) => {
            const active = p.key === providerKey;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.operatorCard, active && styles.operatorCardActive]}
                onPress={() => setProviderKey(p.key)}
                activeOpacity={0.8}
              >
                <Image source={p.logo} style={styles.operatorLogo} resizeMode="contain" />
                <Text style={[styles.operatorBrand, active && styles.operatorBrandActive]}>{p.brand}</Text>
                <Text style={styles.operatorFee}>{p.feePct}% de frais</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {zones.length > 0 && (
          <>
            <Text style={styles.label}>Zone de livraison</Text>
            <View style={styles.operatorRow}>
              {zones.map((z) => {
                const active = z.id === zoneKey;
                return (
                  <TouchableOpacity
                    key={z.id}
                    style={[styles.zoneCard, active && styles.zoneCardActive]}
                    onPress={() => setZoneKey(active ? '' : z.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.zoneVille, active && styles.zoneVilleActive]}>{z.ville}</Text>
                    <Text style={styles.operatorFee}>{fcfa(Number(z.frais) || 0)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {livraisonFee > 0 ? (
              <Text style={styles.promoNote}>✓ Livraison {zone.ville} : +{fcfa(livraisonFee)} incluse</Text>
            ) : null}
          </>
        )}

        <Text style={styles.label}>Numéro {provider.brand}</Text>
        <TextInput
          style={styles.input}
          placeholder="ex : 70701122"
          placeholderTextColor={COLORS.mutedSoft}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <View style={styles.feesCard}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Sous-total</Text>
            <Text style={styles.feeValue}>{fcfa(baseTotal)}</Text>
          </View>
          {promo ? (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Remise ({promo.code})</Text>
              <Text style={[styles.feeValue, { color: COLORS.kola }]}>-{fcfa(promo.remise)}</Text>
            </View>
          ) : null}
          {livraisonFee > 0 ? (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Livraison ({zone.ville})</Text>
              <Text style={styles.feeValue}>+{fcfa(livraisonFee)}</Text>
            </View>
          ) : null}
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Frais ({curProv.feePct}%)</Text>
            <Text style={styles.feeValue}>{fcfa(frais)}</Text>
          </View>
          <View style={[styles.feeRow, styles.feeTotalRow]}>
            <Text style={styles.feeTotalLabel}>Total à payer</Text>
            <Text style={styles.feeTotalValue}>{fcfa(totalWithFees)}</Text>
          </View>
        </View>

        {stage === 'otp' ? (
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Vérification du paiement</Text>
            <Text style={styles.otpLine}>
              Un code de validation a été envoyé par SMS au {phone} ({provider.brand}). Composez *144# sur votre
              téléphone puis saisissez le code reçu ci-dessous.
            </Text>
            {otpCode ? (
              <Text style={styles.otpDemo}>
                Simulation — votre code OTP : <Text style={styles.otpDemoCode}>{otpCode}</Text>
              </Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Code à 4 chiffres"
              placeholderTextColor={COLORS.mutedSoft}
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={setOtpInput}
            />
            <TouchableOpacity
              style={[styles.payBtn, processing && styles.payBtnDisabled]}
              onPress={handleConfirmOtp}
              disabled={processing}
              activeOpacity={0.85}
            >
              <Text style={styles.payBtnText}>{processing ? 'Validation…' : `Valider le paiement de ${fcfa(totalWithFees)}`}</Text>
            </TouchableOpacity>
            <View style={styles.otpRow}>
              <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                <Text style={styles.otpLink}>Renvoyer le code</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStage('init')} activeOpacity={0.7}>
                <Text style={styles.otpLink}>Modifier le numéro</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.payBtn, processing && styles.payBtnDisabled]}
            onPress={handlePay}
            disabled={processing}
            activeOpacity={0.85}
          >
            <Text style={styles.payBtnText}>{processing ? 'Envoi du code…' : `Payer ${fcfa(totalWithFees)}`}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.sandboxNote}>
          Paiement simulé (sandbox) — aucun débit réel ni SMS réel envoyé. Utilisez le code OTP affiché ci-dessus. Les
          fonds sont placés en escrow jusqu'à confirmation de la réception par l'acheteur.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  summaryLine: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  summaryMore: { fontSize: 12, color: COLORS.mutedSoft, marginTop: 2 },
  summaryTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.line,
  },
  summaryTotalLabel: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: COLORS.piment },

  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  promoInput: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.ink,
  },
  promoBtn: {
    backgroundColor: COLORS.kola,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  promoBtnOff: { backgroundColor: COLORS.muted },
  promoBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  promoNote: { fontSize: 12, fontWeight: '700', color: COLORS.kola, marginBottom: 10 },
  promoErr: { fontSize: 12, fontWeight: '700', color: COLORS.piment, marginBottom: 10 },

  label: { fontSize: 13, fontWeight: '700', color: COLORS.ink, marginBottom: 10, marginTop: 6 },

  operatorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  operatorCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  operatorCardActive: { borderColor: COLORS.piment, backgroundColor: '#FFF3EF' },
  operatorLogo: { width: 60, height: 60, marginBottom: 6 },
  operatorBrand: { fontSize: 13, fontWeight: '700', color: COLORS.ink, textAlign: 'center' },
  operatorBrandActive: { color: COLORS.piment },
  operatorFee: { fontSize: 11, color: COLORS.mutedSoft, marginTop: 2 },

  zoneCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  zoneCardActive: { borderColor: COLORS.kola, backgroundColor: '#EDFBF3' },
  zoneVille: { fontSize: 14, fontWeight: '800', color: COLORS.ink, textAlign: 'center' },
  zoneVilleActive: { color: COLORS.kola },

  input: {
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.ink,
    marginBottom: 20,
  },

  feesCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 16,
    marginBottom: 20,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  feeLabel: { fontSize: 13, color: COLORS.muted },
  feeValue: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  feeTotalRow: {
    marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.line,
  },
  feeTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  feeTotalValue: { fontSize: 18, fontWeight: '900', color: COLORS.piment },

  payBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  otpCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  otpTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 6 },
  otpLine: { fontSize: 12, color: COLORS.muted, lineHeight: 18, marginBottom: 8 },
  otpDemo: { fontSize: 13, color: COLORS.muted, fontWeight: '600', marginBottom: 14 },
  otpDemoCode: { fontSize: 20, fontWeight: '900', color: COLORS.piment, letterSpacing: 4 },
  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 12,
  },
  otpLink: { fontSize: 13, fontWeight: '700', color: COLORS.piment },
  sandboxNote: { fontSize: 11, color: COLORS.mutedSoft, textAlign: 'center', marginTop: 14, lineHeight: 16 },
});