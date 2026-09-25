import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  ROLES, validatePassword,
} from '../src/lib/auth';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/theme';
import AdminCodePrompt from '../src/components/AdminCodePrompt';

const ROLE_HELP = {
  Acheteur: 'Parcourez les boutiques, commandez et payez vos achats.',
  Vendeur: 'Créez votre boutique, vendez et suivez vos revenus.',
  Livreur: "Livrez les courses disponibles et suivez votre dû. Compte dédié : pas d'achat, pas de vente.",
};

const normPhone = (p) => String(p || '').replace(/\s+/g, '');
const intlPhone = (p) => {
  let n = normPhone(p);
  if (/^0/.test(n)) n = n.slice(1);
  n = n.replace(/[^\d]/g, '');
  return '226' + n;
};
const otpMessage = (code) => `AfriMarket — votre code de vérification : ${code}. Ne le partagez avec personne.`;

function PasswordField({ value, onChangeText, placeholder, visible, onToggle }) {
  return (
    <View style={styles.passWrap}>
      <TextInput
        style={styles.inputPass}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.eyeBtn} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.eyeText}>{visible ? '🙈' : '👁️'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function OnboardingScreen({ onLoggedIn }) {
  const { register, login, sendOtp, verifyOtp, resetPassword, loginAdmin, findAccount } = useAuth();
  const [role, setRole] = useState(null);
  const [loginMode, setLoginMode] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [code, setCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adminPrompt, setAdminPrompt] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);

  const submit = async () => {
    if (!phone.trim() || !password) {
      Alert.alert('Erreur', 'Téléphone et mot de passe sont requis.');
      return;
    }
    if (loginMode) {
      setBusy(true);
      const res = await login(phone, password);
      setBusy(false);
      if (!res.ok) { Alert.alert('Connexion impossible', res.error); return; }
      onLoggedIn(res.user);
      return;
    }
    if (!role) {
      Alert.alert('Type de compte requis', 'Choisissez votre type de compte : Acheteur, Vendeur ou Livreur.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Erreur', 'Nom complet requis.');
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
    const res = await register({
      phone, password, role, name: name.trim(),
      courierDossier: role === 'Livreur' ? {} : undefined,
    });
    setBusy(false);
    if (!res.ok) { Alert.alert('Inscription impossible', res.error); return; }
    onLoggedIn(res.user);
  };

  const handleAdminDemo = async (adminCode) => {
    setAdminBusy(true);
    const res = await loginAdmin(adminCode);
    setAdminBusy(false);
    setAdminPrompt(false);
    if (!res.ok) { Alert.alert('Accès refusé', res.error); return; }
    onLoggedIn(res.user);
  };

  const sendCode = async () => {
    const p = normPhone(phone);
    if (!p) {
      Alert.alert('Erreur', 'Entrez votre numéro de téléphone.');
      return;
    }
    setBusy(true);
    const acc = await findAccount(p);
    if (!acc) {
      setBusy(false);
      Alert.alert('Aucun compte', 'Aucun compte n’est enregistré avec ce numéro.');
      return;
    }
    const res = await sendOtp(p);
    setBusy(false);
    if (!res.ok) { Alert.alert('Erreur', res.error); return; }
    setOtpPhone(p);
    setOtpCode(res.code);
    setShowCode(false);
    Alert.alert('Code généré ✓', 'Envoyez-le vous-même par SMS ou WhatsApp (boutons ci-dessous), puis entrez le code reçu pour réinitialiser votre mot de passe.');
  };

  const openWhatsapp = () => {
    const uri = `whatsapp://send?phone=${intlPhone(otpPhone)}&text=${encodeURIComponent(otpMessage(otpCode))}`;
    Linking.openURL(uri).catch(() =>
      Alert.alert('WhatsApp indisponible', `Ouvrez WhatsApp et envoyez le message au numéro ${intlPhone(otpPhone)} avec le code : ${otpCode}`)
    );
  };

  const openSms = () => {
    const uri = `sms:${otpPhone}?body=${encodeURIComponent(otpMessage(otpCode))}`;
    Linking.openURL(uri).catch(() =>
      Alert.alert('SMS indisponible', `Ouvrez votre messagerie SMS et envoyez le code : ${otpCode}`)
    );
  };

  const resetSubmit = async () => {
    if (!otpPhone) { Alert.alert('Erreur', 'Demandez d’abord un code.'); return; }
    if (!code.trim()) { Alert.alert('Erreur', 'Entrez le code reçu.'); return; }
    if (!newPass || !newConfirm) { Alert.alert('Erreur', 'Choisissez un nouveau mot de passe.'); return; }
    if (newPass !== newConfirm) { Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.'); return; }
    const pw = validatePassword(newPass);
    if (!pw.ok) { Alert.alert('Mot de passe faible', pw.issues.join('\n• ')); return; }
    setBusy(true);
    const v = await verifyOtp(otpPhone, code.trim());
    if (!v.ok) { setBusy(false); Alert.alert('Vérification impossible', v.error); return; }
    const rp = await resetPassword(otpPhone, newPass);
    if (!rp.ok) { setBusy(false); Alert.alert('Réinitialisation impossible', rp.error); return; }
    const lg = await login(otpPhone, newPass);
    setBusy(false);
    if (!lg.ok) { Alert.alert('Connexion impossible', lg.error); return; }
    onLoggedIn(lg.user);
  };

  const openForgot = () => {
    setForgotMode(true);
    setOtpCode('');
    setOtpPhone('');
    setCode('');
    setNewPass('');
    setNewConfirm('');
    setShowCode(false);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {forgotMode ? (
            <>
              <TouchableOpacity style={styles.backBtn} onPress={() => setForgotMode(false)} activeOpacity={0.7}>
                <Text style={styles.backBtnText}>← Retour à la connexion</Text>
              </TouchableOpacity>
              <Text style={styles.title}>AfriMarket</Text>
              <Text style={styles.subtitle}>Se reconnecter avec un code SMS ou WhatsApp</Text>

              <Text style={styles.step}>1. Votre numéro de téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="Téléphone"
                placeholderTextColor={COLORS.muted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={[styles.submitBtn, busy && styles.submitDisabled]} onPress={sendCode} disabled={busy}>
                <Text style={styles.submitBtnText}>{busy ? 'Patientez…' : '📨 Générer un code'}</Text>
              </TouchableOpacity>

              {otpCode ? (
                <>
                  <Text style={styles.step}>2. Recevoir le code</Text>
                  <View style={styles.otpRow}>
                    <TouchableOpacity style={[styles.otpBtn, { flex: 1.4 }]} onPress={openSms} activeOpacity={0.8}>
                      <Text style={styles.otpBtnText}>📲 SMS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.otpBtn, { flex: 1.6 }]} onPress={openWhatsapp} activeOpacity={0.8}>
                      <Text style={styles.otpBtnText}>💬 WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.showCodeBtn} onPress={() => setShowCode(!showCode)} activeOpacity={0.7}>
                    <Text style={styles.showCodeText}>{showCode ? `Code : ${otpCode}` : 'Code introuvable ? L’afficher'}</Text>
                  </TouchableOpacity>

                  <Text style={[styles.step, { marginTop: 10 }]}>3. Code reçu</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Code à 6 chiffres"
                    placeholderTextColor={COLORS.muted}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <Text style={[styles.step, { marginTop: 10 }]}>4. Nouveau mot de passe</Text>
                  <PasswordField
                    value={newPass}
                    onChangeText={setNewPass}
                    placeholder="Nouveau mot de passe"
                    visible={showNewPass}
                    onToggle={() => setShowNewPass(!showNewPass)}
                  />
                  <PasswordField
                    value={newConfirm}
                    onChangeText={setNewConfirm}
                    placeholder="Confirmer le nouveau mot de passe"
                    visible={showNewConfirm}
                    onToggle={() => setShowNewConfirm(!showNewConfirm)}
                  />
                  <Text style={styles.hint}>Mot de passe : 8+ caractères, une majuscule, une minuscule, un chiffre.</Text>

                  <TouchableOpacity style={[styles.submitBtn, busy && styles.submitDisabled]} onPress={resetSubmit} disabled={busy}>
                    <Text style={styles.submitBtnText}>{busy ? 'Patientez…' : '🔓 Réinitialiser et me reconnecter'}</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.title}>AfriMarket</Text>
              <Text style={styles.subtitle}>
                {loginMode ? 'Connectez-vous à votre compte' : 'Créez votre compte pour continuer'}
              </Text>
              <Text style={styles.step}>1. Type de compte</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => {
                  const active = role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleBtn, active && styles.roleBtnActive]}
                      onPress={() => setRole(r)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.roleBtnIcon}>{r === 'Acheteur' ? '🛒' : r === 'Vendeur' ? '🏪' : '🛵'}</Text>
                      <Text style={[styles.roleBtnText, active && styles.roleBtnTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {role && <Text style={styles.roleHelp}>{ROLE_HELP[role]}</Text>}
              {!loginMode && <Text style={styles.step}>2. Vos informations</Text>}

              {!loginMode && (
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
              <PasswordField
                value={password}
                onChangeText={setPassword}
                placeholder="Mot de passe"
                visible={showPass}
                onToggle={() => setShowPass(!showPass)}
              />
              {!loginMode && (
                <>
                  <PasswordField
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Confirmer le mot de passe"
                    visible={showConfirm}
                    onToggle={() => setShowConfirm(!showConfirm)}
                  />
                  <Text style={styles.hint}>
                    Mot de passe : 8+ caractères, une majuscule, une minuscule, un chiffre.
                  </Text>
                </>
              )}

              {loginMode && (
                <TouchableOpacity style={styles.showCodeBtn} onPress={openForgot} activeOpacity={0.7}>
                  <Text style={styles.showCodeText}>Mot de passe oublié ? Se reconnecter avec un code</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.submitBtn, busy && styles.submitDisabled]} onPress={submit} disabled={busy}>
                <Text style={styles.submitBtnText}>
                  {busy ? 'Patientez…' : loginMode ? 'Se connecter' : 'Créer mon compte'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchBtn} onPress={() => setLoginMode(!loginMode)} activeOpacity={0.7}>
                <Text style={styles.switchBtnText}>
                  {loginMode ? '← Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminDemoBtn}
                onPress={() => setAdminPrompt(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.adminDemoBtnText}>Console admin 🔐</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
        <AdminCodePrompt
          visible={adminPrompt}
          busy={adminBusy}
          onCancel={() => setAdminPrompt(false)}
          onSubmit={handleAdminDemo}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.navDark },
  content: { padding: 24, paddingTop: 70, paddingBottom: 40 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  backBtnText: { color: '#9C99B6', fontSize: 13, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: '900', color: COLORS.or, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#9C99B6', textAlign: 'center', marginTop: 8, marginBottom: 28, lineHeight: 20 },
  step: { fontSize: 13, fontWeight: '800', color: COLORS.or, marginTop: 8, marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  roleBtn: {
    flex: 1,
    backgroundColor: '#1E1D3E',
    borderWidth: 1.5,
    borderColor: '#3A3970',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  roleBtnActive: { borderColor: COLORS.or, backgroundColor: '#2A2A5E' },
  roleBtnIcon: { fontSize: 24, marginBottom: 6 },
  roleBtnText: { fontSize: 13, fontWeight: '700', color: '#9C99B6' },
  roleBtnTextActive: { color: '#fff' },
  roleHelp: { fontSize: 12, color: '#C7C4DE', marginBottom: 18, lineHeight: 17 },
  input: {
    backgroundColor: '#171636',
    borderWidth: 1,
    borderColor: '#2E2D5A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#fff',
    marginBottom: 12,
  },
  passWrap: { backgroundColor: '#171636', borderRadius: 12, marginBottom: 12 },
  inputPass: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2E2D5A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    paddingRight: 52,
    fontSize: 15,
    color: '#fff',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { fontSize: 18 },
  hint: { fontSize: 12, color: '#9C99B6', marginBottom: 12 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  otpBtn: {
    backgroundColor: '#27B546',
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
  },
  otpBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  showCodeBtn: { marginVertical: 6 },
  showCodeText: { color: '#9C99B6', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  submitBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  switchBtn: { alignItems: 'center', marginTop: 18, paddingVertical: 8 },
  switchBtnText: { color: '#9C99B6', fontSize: 13, fontWeight: '600' },
  adminDemoBtn: {
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#27B546',
    backgroundColor: 'transparent',
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  adminDemoBtnText: { color: '#27B546', fontSize: 13, fontWeight: '800' },
});