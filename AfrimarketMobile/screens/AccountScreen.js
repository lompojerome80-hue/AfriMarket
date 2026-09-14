import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, Image, Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { boutiqueExists } from '../src/lib/boutique';
import {
  ROLES, ROLE_ADMIN, MOYENS_DEPLACEMENT,
  getCurrentUser, registerUser, loginUser, updateDossier, isDossierComplete,
  sendWhatsappOtp, verifyWhatsappOtp, loginWithOtp, loginGoogleSimulated, loginAdminSimulated,
  logout, userKey, validatePassword,
} from '../src/lib/auth';
import { getLivreurDues, getCoursesForLivreur } from '../src/lib/deliveries';
import { getOrdersFor } from '../src/lib/orders';
import { getSellerRevenus, getCommissionsForSeller } from '../src/lib/payments';
import { getFollowedBoutiques } from '../src/lib/follow';
import { getFlagsForUser } from '../src/lib/admin';
import { getSellerContractState } from '../src/lib/contract';
import { countUnread, pushNotification } from '../src/lib/notifications';
import { getUnreadTotal } from '../src/lib/messaging';
import { fcfa } from '../src/lib/cart';
import { t, LANGS, setLang, getLang, initI18n } from '../src/lib/i18n';
import AppBar from '../src/components/AppBar';
import { COLORS, SIZES } from '../src/constants/theme';

const docStatusLabel = {
  en_attente: 'En attente de vérification',
  verifie: 'Dossier vérifié ✓',
  rejete: 'Dossier rejeté',
};

export default function AccountScreen({ onUserChange }) {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('register'); // register | login | otp
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('Acheteur');
  const [otpCode, setOtpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [dues, setDues] = useState({ montant: 0, blocked: false });
  const [ordersCount, setOrdersCount] = useState(0);
  const [livraisonsCount, setLivraisonsCount] = useState(0);
  const [revenus, setRevenus] = useState({ enAttente: 0, libere: 0, total: 0 });
  const [commissions, setCommissions] = useState({ total: 0, count: 0 });
  const [contract, setContract] = useState({ sent: false, acceptedAt: null, version: null });
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  const [followedBoutiques, setFollowedBoutiques] = useState([]);
  const [flags, setFlags] = useState([]);

  const [dossierOpen, setDossierOpen] = useState(false);
  const [dLocalite, setDLocalite] = useState('');
  const [dMoyen, setDMoyen] = useState('');
  const [dSelfie, setDSelfie] = useState(null);
  const [dRecto, setDRecto] = useState(null);
  const [dVerso, setDVerso] = useState(null);
  const [lang, setLangState] = useState(getLang());
  const lastUserKeyRef = useRef(null);

  const applyUser = useCallback(
    (u) => {
      const ukey = u ? userKey(u) : null;
      const changed = ukey !== lastUserKeyRef.current;
      lastUserKeyRef.current = ukey;
      setUser(u);
      if (changed && onUserChange) onUserChange(u);
    },
    [onUserChange]
  );

  const refresh = useCallback(async (u) => {
    if (!u) return;
    const key = userKey(u);
    setOrdersCount((await getOrdersFor(u)).length);
    setNotifCount(await countUnread(key));
    setMsgCount(await getUnreadTotal(key));
    if (u.role === 'Livreur') {
      setDues(await getLivreurDues(u));
      setLivraisonsCount((await getCoursesForLivreur(u)).length);
    }
    if (u.role === 'Vendeur') {
      setRevenus(await getSellerRevenus(key));
      setCommissions(await getCommissionsForSeller(key));
      setContract(await getSellerContractState(key));
    }
    if (u.role === 'Acheteur') {
      setFollowedBoutiques(await getFollowedBoutiques(key));
      setRevenus({ enAttente: 0, libere: 0, total: 0 });
      setCommissions({ total: 0, count: 0 });
    }
    setFlags(await getFlagsForUser(key));
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const u = await getCurrentUser();
        applyUser(u);
        await initI18n();
        setLangState(getLang());
        if (u) refresh(u);
      })();
    }, [refresh])
  );

  useEffect(() => {
    if (dossierOpen && user) {
      const d = user.courierDossier || {};
      setDLocalite(d.localite || '');
      setDMoyen(d.moyen || '');
      setDSelfie(d.selfieUri || null);
      setDRecto(d.cniRectoUri || null);
      setDVerso(d.cniVersoUri || null);
    }
  }, [dossierOpen]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown > 0]);

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !password) {
      Alert.alert('Erreur', 'Nom, téléphone et mot de passe sont requis.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    const pw = validatePassword(password);
    if (!pw.ok) {
      Alert.alert('Mot de passe faible', pw.issues.join('\n• '));
      return;
    }
    setBusy(true);
    const res = await registerUser({
      phone, password, role, name: name.trim(),
      courierDossier: role === 'Livreur' ? {} : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      Alert.alert('Inscription impossible', res.error);
      return;
    }
    applyUser(res.user);
    refresh(res.user);
  };

  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      Alert.alert('Erreur', 'Téléphone et mot de passe sont requis.');
      return;
    }
    setBusy(true);
    const res = await loginUser({ phone, password });
    setBusy(false);
    if (!res.ok) {
      Alert.alert('Connexion impossible', res.error);
      return;
    }
    applyUser(res.user);
    refresh(res.user);
  };

  const handleSendOtp = async () => {
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Erreur', 'Entrez votre nom complet.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Erreur', 'Entrez votre numéro de téléphone WhatsApp.');
      return;
    }
    setBusy(true);
    const res = await sendWhatsappOtp(phone);
    setBusy(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.error);
      return;
    }
    setMode('otp');
    setOtpCode('');
    setCooldown(60);
    Alert.alert('Code envoyé (simulation)', `Code WhatsApp : ${res.code}`, [
      { text: 'OK', onPress: () => {} },
    ]);
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    await handleSendOtp();
  };

  const handleVerifyOtp = async () => {
    const v = await verifyWhatsappOtp(phone, otpCode);
    if (!v.ok) {
      Alert.alert('Code invalide', v.error);
      return;
    }
    setBusy(true);
    const chosenRole = mode === 'register' ? role : undefined;
    const res = await loginWithOtp({
      phone,
      name: mode === 'register' ? name.trim() : undefined,
      role: chosenRole,
      courierDossier: chosenRole === 'Livreur' ? {} : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.error);
      return;
    }
    applyUser(res.user);
    refresh(res.user);
  };

  const handleGoogle = async () => {
    const res = await loginGoogleSimulated(role);
    applyUser(res.user);
    refresh(res.user);
  };

  const handleAdminDemo = async () => {
    const res = await loginAdminSimulated();
    applyUser(res.user);
    refresh(res.user);
  };

  const handleExportData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dump = {};
      if (keys.length) {
        const pairs = await AsyncStorage.multiGet(keys);
        (pairs || []).forEach(([k, v]) => { try { dump[k] = JSON.parse(v); } catch { dump[k] = v; } });
      }
      const payload = JSON.stringify({
        app: 'AfriMarket', version: 1, exportedAt: new Date().toISOString(), data: dump,
      });
      Alert.alert('💾 Sauvegarde prête', `${Math.round(payload.length / 1024)} Ko de données (comptes, boutiques, commandes...). Choisissez un mode :`, [
        { text: 'Annuler', style: 'cancel' },
        { text: '📤 Envoyer', onPress: () => Share.share({ message: payload }) },
        { text: '📋 Aperçu', onPress: () => Alert.alert('Aperçu', payload.slice(0, 900) + '...') },
      ]);
    } catch (e) {
      Alert.alert('Export impossible', e.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    applyUser(null);
    setName('');
    setPhone('');
    setPassword('');
    setConfirm('');
    setOtpCode('');
    setCooldown(0);
    setRole('Acheteur');
    setDossierOpen(false);
    setRevenus({ enAttente: 0, libere: 0, total: 0 });
  };

  const handleMyBoutique = async () => {
    const slug = user.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const exists = await boutiqueExists(slug);
    if (exists) {
      navigation.navigate('BoutiqueDetail', { slug });
    } else {
      Alert.alert('Info', 'Vous n\'avez pas encore de boutique');
    }
  };

  const pickPhoto = (setter) => {
    Alert.alert('Ajouter une photo', 'Choisissez une source', [
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
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
          if (!r.canceled && r.assets[0]) setter(r.assets[0].uri);
        },
      },
    ]);
  };

  const handleSaveDossier = async () => {
    if (!dLocalite.trim() || !dMoyen || !dSelfie || !dRecto || !dVerso) {
      Alert.alert('Dossier incomplet', 'Localité, moyen de déplacement, selfie, CNI recto et verso sont obligatoires.');
      return;
    }
    const u = await updateDossier({
      localite: dLocalite.trim(),
      moyen: dMoyen,
      selfieUri: dSelfie,
      cniRectoUri: dRecto,
      cniVersoUri: dVerso,
    });
    await pushNotification('admin', {
      title: 'Dossier à vérifier',
      body: `${u.name} a soumis son dossier livreur.`,
      type: 'dossier',
    });
    applyUser(u);
    setDossierOpen(false);
    Alert.alert('Dossier soumis ✓', 'En attente de vérification par l\'administrateur.');
  };

  const handleSettle = async () => {
    navigation.navigate('Livraisons');
  };

  const handleLang = async (code) => {
    await setLang(code);
    setLangState(code);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <AppBar title="Mon compte" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>{mode === 'login' ? 'Connexion' : mode === 'otp' ? 'Code WhatsApp' : 'Créer un compte'}</Text>
          <Text style={styles.subtitle}>Vendeur, acheteur ou livreur</Text>

          <View style={styles.tabRow}>
            {['register', 'login'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.tabBtn, mode === m && styles.tabBtnActive]}
                onPress={() => { setMode(m); setOtpCode(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, mode === m && styles.tabBtnTextActive]}>
                  {m === 'register' ? "S'inscrire" : 'Se connecter'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor={COLORS.muted}
              value={name}
              onChangeText={setName}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Téléphone"
            placeholderTextColor={COLORS.muted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {mode === 'otp' ? (
            <>
              <View style={styles.otpHeader}>
                <Text style={styles.otpIcon}>📱</Text>
                <Text style={styles.otpTitle}>Code de vérification</Text>
                <Text style={styles.otpSubtitle}>
                  Un code à 6 chiffres a été envoyé au{'\n'}
                  <Text style={styles.otpPhone}>{phone}</Text>
                </Text>
              </View>

              <TextInput
                style={styles.otpInput}
                placeholder="• • • • • •"
                placeholderTextColor={COLORS.muted}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />

              <TouchableOpacity
                style={[styles.submitBtn, (busy || otpCode.length < 6) && styles.submitDisabled]}
                onPress={handleVerifyOtp}
                disabled={busy || otpCode.length < 6}
              >
                <Text style={styles.submitBtnText}>
                  {busy ? 'Vérification…' : 'Valider le code'}
                </Text>
              </TouchableOpacity>

              {cooldown > 0 ? (
                <View style={styles.cooldownContainer}>
                  <Text style={styles.cooldownText}>
                    Renvoyer le code dans <Text style={styles.cooldownTimer}>{cooldown}s</Text>
                  </Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp} activeOpacity={0.7}>
                  <Text style={styles.resendBtnText}>Renvoyer le code</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.socialBtn, styles.otpBackBtn]} onPress={() => { setMode('login'); setCooldown(0); }} activeOpacity={0.7}>
                <Text style={styles.socialBtnText}>Retour</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor={COLORS.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              {mode === 'register' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmer le mot de passe"
                    placeholderTextColor={COLORS.muted}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <Text style={styles.hint}>
                    Mot de passe : 8+ caractères, une majuscule, une minuscule, un chiffre.
                  </Text>
                  <Text style={styles.label}>Je suis</Text>
                  <View style={styles.roleRow}>
                    {ROLES.map((r) => {
                      const active = role === r;
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[styles.roleBtn, active && styles.roleBtnActive]}
                          onPress={() => setRole(r)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.roleBtnIcon}>{r === 'Acheteur' ? '🛒' : r === 'Vendeur' ? '🏪' : '🛵'}</Text>
                          <Text style={[styles.roleBtnText, active && styles.roleBtnTextActive]}>{r}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
              <TouchableOpacity
                style={[styles.submitBtn, busy && styles.submitDisabled]}
                onPress={mode === 'register' ? handleRegister : handleLogin}
                disabled={busy}
              >
                <Text style={styles.submitBtnText}>
                  {busy ? 'Patientez…' : mode === 'register' ? "S'inscrire" : 'Se connecter'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.or}>— ou —</Text>

              <TouchableOpacity style={styles.socialBtnGoogle} onPress={handleGoogle}>
                <Text style={styles.socialBtnTextGoogle}>Continuer avec Google (démo)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} onPress={handleSendOtp}>
                <Text style={styles.socialBtnText}>Continuer avec WhatsApp (code OTP)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtnGhost} onPress={handleAdminDemo}>
                <Text style={styles.socialBtnText}>Console admin (démo)</Text>
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    );
  }

  const dossierOk = isDossierComplete(user);
  const docStatus = user.courierDossier?.docStatus;
  const isAdmin = user.role === ROLE_ADMIN;

  return (
    <View style={styles.container}>
      <AppBar title={t('mon_compte')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profilePhone}>{user.phone || (user.google ? 'Compte Google démo' : '')}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user.role}</Text>
          </View>
        </View>

        {user.accountStatus === 'ferme' ? (
          <View style={styles.flagBannerClosed}>
            <Text style={styles.flagBannerTitle}>🛑 Compte fermé</Text>
            <Text style={styles.flagBannerText}>
              Ce compte a été fermé par l'administrateur{user.closureReason ? ` — ${user.closureReason}` : ''}. Contactez le support si vous pensez qu'il s'agit d'une erreur.
            </Text>
          </View>
        ) : flags.some((f) => f.status === 'actif') ? (
          <View style={styles.flagBanner}>
            <Text style={styles.flagBannerTitle}>⚠️ Compte signalé</Text>
            <Text style={styles.flagBannerText}>
              Un avertissement vous a été notifié. Une récidive peut conduire à la suspension puis à la fermeture de votre compte (art. 8 du contrat de partenariat).
            </Text>
          </View>
        ) : null}

        <View style={styles.langCard}>
          <Text style={styles.langTitle}>{t('langue')}</Text>
          <View style={styles.langRow}>
            {LANGS.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langChip, lang === l.code && styles.langChipActive]}
                onPress={() => handleLang(l.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langChipText, lang === l.code && styles.langChipTextActive]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {user.role === 'Livreur' && (
          <>
            <View style={[styles.duesCard, dues.blocked && styles.duesCardBlocked]}>
              <Text style={styles.duesTitle}>{dues.blocked ? 'Compte bloqué 🚫' : 'Mon dû AfriMarket'}</Text>
              <Text style={[styles.duesAmount, dues.blocked && styles.duesAmountBlocked]}>{fcfa(dues.montant)}</Text>
              <Text style={styles.duesHint}>
                {dues.montant > 0
                  ? 'Commission AfriMarket (10 %) à régler avant 00H chaque soir, sinon le compte est bloqué.'
                  : "🎁 Vos 10 premières courses sont offertes : le dû AfriMarket s'active après la 10e course."}
              </Text>
              {dues.montant > 0 && (
                <TouchableOpacity style={styles.settleBtn} onPress={handleSettle} activeOpacity={0.8}>
                  <Text style={styles.settleBtnText}>Régler mon dû AfriMarket (*144# + capture)</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.statusCard, docStatus === 'rejete' && styles.statusCardRejete]}>
              <Text style={styles.statusTitle}>
                Dossier livreur {dossierOk && docStatus === 'verifie' ? '✓' : ''}
              </Text>
              <Text style={styles.statusDesc}>
                {docStatus ? docStatusLabel[docStatus] : 'À compléter + soumettre pour vérification.'}
              </Text>
            </View>
          </>
        )}

        {user.role === 'Vendeur' && (
          <View style={styles.revenusCard}>
            <Text style={styles.duesTitle}>Mes revenus (sécurisés)</Text>
            <View style={styles.revenusRow}>
              <View style={styles.revenusCell}>
                <Text style={styles.revenusValue}>{fcfa(revenus.enAttente)}</Text>
                <Text style={styles.revenusLabel}>En attente de livraison</Text>
              </View>
              <View style={styles.revenusCell}>
                <Text style={[styles.revenusValue, { color: COLORS.kola }]}>{fcfa(revenus.libere)}</Text>
                <Text style={styles.revenusLabel}>Libérés ✓</Text>
              </View>
            </View>
            <Text style={styles.duesHint}>
              Les fonds Mobile Money sont sécurisés jusqu'à la réception de la commande, puis libérés.
            </Text>
            {commissions.total > 0 && (
              <Text style={[styles.duesHint, { color: COLORS.piment, marginTop: 6 }]}>
                Dont {fcfa(commissions.total)} de compensation AfriMarket prélevée ({commissions.count} vente{commissions.count > 1 ? 's' : ''}).
              </Text>
            )}
          </View>
        )}

        {user.role === 'Acheteur' && (
          <View style={styles.followedCard}>
            <Text style={styles.followedTitle}>🏪 Boutiques suivies</Text>
            {followedBoutiques.length > 0 ? (
              followedBoutiques.map((b) => (
                <TouchableOpacity
                  key={b.slug}
                  style={styles.followedItem}
                  onPress={() => navigation.navigate('BoutiqueDetail', { slug: b.slug })}
                  activeOpacity={0.7}
                >
                  {b.logo ? (
                    <Image source={{ uri: b.logo }} style={styles.followedLogo} />
                  ) : (
                    <View style={styles.followedInitial}>
                      <Text style={styles.followedInitialText}>{(b.nom || 'B').charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.followedInfo}>
                    <Text style={styles.followedName}>{b.nom}</Text>
                    <Text style={styles.followedLoc}>📍 {b.ville || b.location || 'Burkina Faso'}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.followedEmpty}>
                Suivez des boutiques avec le bouton « Suivre » pour les retrouver ici.
              </Text>
            )}
          </View>
        )}

        <View style={styles.actions}>
          {user.role === 'Livreur' ? (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Livraisons')}>
                <Text style={styles.actionBtnText}>Livraisons 🛵{livraisonsCount > 0 ? ` · ${livraisonsCount} course(s)` : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, !dossierOk && styles.actionBtnWarn]}
                onPress={() => setDossierOpen(true)}
              >
                <Text style={styles.actionBtnText}>
                  Mon dossier livreur {docStatus ? `· ${docStatusLabel[docStatus]}` : '· à compléter'}
                </Text>
              </TouchableOpacity>
            </>
          ) : user.role === 'Vendeur' ? (
            <>
              {contract.sent && !contract.acceptedAt && (
                <Text style={[styles.duesHint, { color: COLORS.piment, marginBottom: 6, textAlign: 'center' }]}>
                  📄 20 ventes atteintes — votre contrat de partenariat est à lire et accepter.
                </Text>
              )}
              {contract.sent && (
                <TouchableOpacity
                  style={[styles.actionBtn, !contract.acceptedAt && styles.actionBtnWarn]}
                  onPress={() => navigation.navigate('Contrat')}
                >
                  <Text style={styles.actionBtnText}>
                    📄 Mon contrat de vente{contract.acceptedAt ? ' ✓' : ' — à accepter'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Commandes')}>
                <Text style={styles.actionBtnText}>Commandes & livraisons · {ordersCount} commande(s)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleMyBoutique}>
                <Text style={styles.actionBtnText}>Ma boutique</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateBoutique')}>
                <Text style={styles.actionBtnText}>Créer une boutique</Text>
              </TouchableOpacity>
<TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Messages')}>
          <Text style={styles.actionBtnText}>Messages vendeur⇄acheteur{msgCount > 0 ? ` · ${msgCount} non lu(s)` : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWarn]} onPress={() => navigation.navigate('Publicite')}>
          <Text style={styles.actionBtnText}>📣 Faire de la publicité sur AfriMarket</Text>
        </TouchableOpacity>
      </>
    ) : (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MesAchats')}>
                <Text style={styles.actionBtnText}>Achats · produits reçus (fonds libérés)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Commandes')}>
                <Text style={styles.actionBtnText}>Commande · en cours de livraison{ordersCount > 0 ? ` · ${ordersCount} commande(s)` : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Messages')}>
                <Text style={styles.actionBtnText}>Messages vendeur⇄acheteur{msgCount > 0 ? ` · ${msgCount} non lu(s)` : ''}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.actionBtnText}>{t('notifications')}{notifCount > 0 ? ` · ${notifCount} non lue(s)` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Help')}>
            <Text style={styles.actionBtnText}>{t('support')}</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAdmin]} onPress={() => navigation.navigate('Admin')}>
              <Text style={styles.actionBtnText}>🔐 Console admin</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={handleExportData}>
          <Text style={styles.actionBtnText}>💾 Sauvegarder mes données (JSON)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>{t('se_deconnecter')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={dossierOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDossierOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalCard}>
            <Text style={styles.modalTitle}>Mon dossier livreur</Text>
            <Text style={styles.modalSubtitle}>
              Photos (selfie + pièce d'identité) et infos requises. Le dossier est soumis
              à la vérification de l'administrateur.
            </Text>

            {docStatus && (
              <View style={[styles.statusChip, docStatus === 'verifie' && styles.statusChipOk, docStatus === 'rejete' && styles.statusChipRejete]}>
                <Text style={styles.statusChipText}>{docStatusLabel[docStatus]}</Text>
              </View>
            )}

            <Text style={styles.label}>Localité d'exercice *</Text>
            <TextInput
              style={styles.input}
              value={dLocalite}
              onChangeText={setDLocalite}
              placeholder="Ex : Ouagadougou, secteur 12"
              placeholderTextColor={COLORS.muted}
            />

            <Text style={styles.label}>Moyen de déplacement *</Text>
            <View style={styles.moyenRow}>
              {MOYENS_DEPLACEMENT.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.moyenChip, dMoyen === m && styles.moyenChipActive]}
                  onPress={() => setDMoyen(m)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.moyenChipText, dMoyen === m && styles.moyenChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Photos *</Text>
            <TouchableOpacity style={styles.photoRow} onPress={() => pickPhoto(setDSelfie)} activeOpacity={0.7}>
              {dSelfie ? <Image source={{ uri: dSelfie }} style={styles.photoThumb} /> : <Text style={styles.photoIcon}>📷</Text>}
              <View style={{ flex: 1 }}>
                <Text style={styles.attText}>Selfie (publique)</Text>
                <Text style={styles.photoHint}>{dSelfie ? 'Photo ajoutée ✓' : 'Ajouter une photo'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoRow} onPress={() => pickPhoto(setDRecto)} activeOpacity={0.7}>
              {dRecto ? <Image source={{ uri: dRecto }} style={styles.photoThumb} /> : <Text style={styles.photoIcon}>🪪</Text>}
              <View style={{ flex: 1 }}>
                <Text style={styles.attText}>Pièce d'identité recto (réservée) *</Text>
                <Text style={styles.photoHint}>{dRecto ? 'Photo ajoutée ✓' : 'Ajouter une photo'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoRow} onPress={() => pickPhoto(setDVerso)} activeOpacity={0.7}>
              {dVerso ? <Image source={{ uri: dVerso }} style={styles.photoThumb} /> : <Text style={styles.photoIcon}>🪪</Text>}
              <View style={{ flex: 1 }}>
                <Text style={styles.attText}>Pièce d'identité verso *</Text>
                <Text style={styles.photoHint}>{dVerso ? 'Photo ajoutée ✓' : 'Ajouter une photo'}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setDossierOpen(false)}>
                <Text style={[styles.modalBtnText, styles.modalBtnTextGhost]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleSaveDossier}>
                <Text style={styles.modalBtnText}>Soumettre</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  content: { padding: SIZES.padding, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.muted, marginBottom: 20 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: COLORS.navDark, borderColor: COLORS.navDark },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  tabBtnTextActive: { color: '#fff' },
  input: {
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.ink,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.ink, marginBottom: 10, marginTop: 4 },
  hint: { fontSize: 12, color: COLORS.muted, marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  roleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: COLORS.piment, borderColor: COLORS.piment },
  roleBtnIcon: { fontSize: 20, marginBottom: 4 },
  roleBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  roleBtnTextActive: { color: COLORS.paper },
  submitBtn: { backgroundColor: COLORS.piment, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.paper, fontSize: 16, fontWeight: '700' },
  or: { textAlign: 'center', color: COLORS.muted, marginVertical: 14, fontSize: 13 },
  socialBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: COLORS.kola,
    alignItems: 'center',
    marginBottom: 10,
  },
  socialBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  socialBtnGoogle: {
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    marginBottom: 10,
  },
  socialBtnTextGoogle: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  socialBtnGhost: {
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.piment,
    alignItems: 'center',
  },
  otpHeader: { alignItems: 'center', marginBottom: 20, marginTop: 6 },
  otpIcon: { fontSize: 40, marginBottom: 8 },
  otpTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink, marginBottom: 4 },
  otpSubtitle: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  otpPhone: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  otpInput: {
    backgroundColor: COLORS.paper,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 16,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 12,
    textAlign: 'center',
    color: COLORS.ink,
    marginBottom: 16,
  },
  cooldownContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
  },
  cooldownText: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },
  cooldownTimer: { fontSize: 16, color: COLORS.piment, fontWeight: '800' },
  resendBtn: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.or,
    alignItems: 'center',
    backgroundColor: '#FFF9F3',
  },
  resendBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.or },
  otpBackBtn: { marginTop: 0 },
  profileCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.piment,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: COLORS.paper },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  profilePhone: { fontSize: 14, color: COLORS.muted, marginBottom: 10 },
  roleBadge: { backgroundColor: COLORS.kola, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleBadgeText: { color: COLORS.paper, fontSize: 12, fontWeight: '600' },
  langCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  flagBanner: {
    backgroundColor: '#FFF3EA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0C49B',
  },
  flagBannerClosed: {
    backgroundColor: '#FDECEA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.piment,
  },
  flagBannerTitle: { fontSize: 14, fontWeight: '800', color: COLORS.piment, marginBottom: 4 },
  flagBannerText: { fontSize: 12, color: COLORS.ink, lineHeight: 18 },
  langTitle: { fontSize: 13, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  langRow: { flexDirection: 'row', gap: 8 },
  langChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
  },
  langChipActive: { backgroundColor: COLORS.piment, borderColor: COLORS.piment },
  langChipText: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  langChipTextActive: { color: COLORS.paper },
  duesCard: {
    backgroundColor: COLORS.navDark,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  duesCardBlocked: { backgroundColor: '#7A1F12' },
  duesTitle: { color: COLORS.or, fontSize: 13, fontWeight: '700' },
  duesAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 6 },
  duesAmountBlocked: { color: '#FFD9D1' },
  duesHint: { color: '#9C99B6', fontSize: 12, lineHeight: 17 },
  settleBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  settleBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusCard: {
    backgroundColor: '#FDF1DF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.or,
  },
  statusCardRejete: { backgroundColor: '#FFF1EC', borderColor: COLORS.piment },
  statusTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginBottom: 4 },
  statusDesc: { fontSize: 13, color: COLORS.ink },
  revenusCard: {
    backgroundColor: COLORS.navDark,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  revenusRow: { flexDirection: 'row', gap: 12, marginVertical: 10 },
  revenusCell: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
  },
  revenusValue: { color: COLORS.or, fontSize: 20, fontWeight: '800' },
  revenusLabel: { color: '#9C99B6', fontSize: 11, marginTop: 2 },
  followedCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  followedTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginBottom: 12 },
  followedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.paper2,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  followedLogo: { width: 42, height: 42, borderRadius: 21 },
  followedInitial: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.kola,
    alignItems: 'center', justifyContent: 'center',
  },
  followedInitialText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  followedInfo: { flex: 1 },
  followedName: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  followedLoc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  followedEmpty: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
  actions: { gap: 10, marginBottom: 20 },
  actionBtn: {
    backgroundColor: COLORS.paper,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  actionBtnWarn: { borderColor: COLORS.or, borderWidth: 2 },
  actionBtnAdmin: { borderColor: COLORS.kola, borderWidth: 2 },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  logoutBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.piment,
    alignItems: 'center',
  },
  logoutBtnText: { color: COLORS.piment, fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,14,35,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.ink },
  modalSubtitle: { fontSize: 13, color: COLORS.muted, marginVertical: 6, marginBottom: 12 },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDF1DF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 100,
    marginBottom: 12,
  },
  statusChipOk: { backgroundColor: COLORS.kola },
  statusChipRejete: { backgroundColor: COLORS.piment },
  statusChipText: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  moyenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  moyenChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: COLORS.paper2,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  moyenChipActive: { backgroundColor: COLORS.navDark, borderColor: COLORS.navDark },
  moyenChipText: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  moyenChipTextActive: { color: '#fff' },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.paper2,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  photoThumb: { width: 44, height: 44, borderRadius: 8 },
  photoIcon: { fontSize: 26, width: 44, textAlign: 'center' },
  attText: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  photoHint: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  modalBtn: {
    flex: 1,
    backgroundColor: COLORS.piment,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnGhost: { backgroundColor: COLORS.paper2, borderWidth: 1, borderColor: COLORS.line },
  modalBtnText: { color: COLORS.paper, fontSize: 15, fontWeight: '700' },
  modalBtnTextGhost: { color: COLORS.ink },
});