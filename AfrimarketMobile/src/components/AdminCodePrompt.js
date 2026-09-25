import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';

export default function AdminCodePrompt({ visible, busy, onCancel, onSubmit }) {
  const [code, setCode] = useState('');

  const close = () => {
    setCode('');
    if (onCancel) onCancel();
  };

  const submit = () => {
    if (busy) return;
    const c = String(code || '').trim();
    if (!c) return;
    onSubmit(c);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>🔐 Console admin</Text>
          <Text style={styles.subtitle}>
            Espace réservé à l'administration. Saisissez le code maître pour continuer.
          </Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Code admin"
            placeholderTextColor={COLORS.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            onSubmitEditing={submit}
          />
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={close} disabled={busy}>
              <Text style={[styles.miniBtnText, styles.miniGhostText]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 2 }]} onPress={submit} disabled={busy}>
              <Text style={styles.miniBtnText}>{busy ? 'Vérification…' : 'Valider'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,14,35,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.navDark2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3A3970',
    padding: 22,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#9C99B6',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 19,
  },
  input: {
    backgroundColor: '#171636',
    borderWidth: 1,
    borderColor: '#2E2D5A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#fff',
    marginBottom: 18,
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  miniBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniGhost: {
    backgroundColor: '#1E1D3E',
    borderWidth: 1,
    borderColor: '#3A3970',
  },
  miniGhostText: { color: '#C7C4DE' },
  miniOk: {
    backgroundColor: COLORS.piment,
  },
  miniBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});