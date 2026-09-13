import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCurrentUser, userKey } from '../src/lib/auth';
import { SUJETS_SUPPORT, createTicket, getMyTickets } from '../src/lib/support';
import AppBar from '../src/components/AppBar';
import EmptyState from '../src/components/EmptyState';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';

const FAQ = [
  { q: 'Comment régler une commande par Mobile Money ?', a: 'Ajoutez des articles au panier, choisissez « Passer au paiement », sélectionnez un opérateur (Orange, MTN, Wave ou Moov) puis confirmez le paiement. Les fonds sont sécurisés pendant le transport.' },
  { q: 'Que devient ma commande en cas de litige ?', a: 'Si vous ouvrez un litige, les fonds restent bloqués en attente d’arbitrage. L’équipe valide ensuite un remboursement ou la libération au vendeur.' },
  { q: 'Comment devenir livreur ?', a: 'Créez un compte avec le rôle Livreur, complétez votre dossier (localité, moyen de déplacement, selfie et pièces d’identité) : il doit être vérifié par un administrateur avant d’accepter des courses.' },
  { q: 'Comment le livreur est-il payé ?', a: 'Le livreur encaisse le prix de la course en espèces à la livraison. La commission AfriMarket (10 %) s’ajoute à son dû quotidien, réglable depuis le compte/livraisons.' },
  { q: 'Comment créer une boutique ?', a: 'Depuis l’onglet Compte avec un profil Vendeur, choisissez « Créer une boutique », puis ajoutez vos produits depuis la page de votre boutique.' },
  { q: 'Puis-je vendre en direct à un client sans la plateforme ?', a: 'Les coordonnées sont masquées et leur partage est signalé dans les conversations. Toute transaction hors AfriMarket n\'a ni fonds sécurisés (escrow), ni livraison vérifiée, ni recours en cas de litige : elle est entièrement à vos risques.' },
];

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

export default function HelpScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [sujet, setSujet] = useState(SUJETS_SUPPORT[0]);
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState([]);
  const [faqOpen, setFaqOpen] = useState(0);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const u = await getCurrentUser();
    setUser(u);
    if (u) setTickets(await getMyTickets(userKey(u)));
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  if (!user) {
    return (
      <View style={styles.container}>
        <AppBar title="Service technique" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="🛠️"
          title="Support technique"
          subtitle="Connectez-vous pour ouvrir un ticket d’assistance."
          actionLabel="Créer un compte"
          onAction={() => navigation.navigate('MainTabs', { screen: 'Compte' })}
        />
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Erreur', 'Décrivez votre problème.');
      return;
    }
    setBusy(true);
    const res = await createTicket({
      sujet,
      message,
      userKey: userKey(user),
      userName: user.name,
    });
    setBusy(false);
    if (!res.ok) {
      Alert.alert('Erreur', res.error);
      return;
    }
    setMessage('');
    Alert.alert('Ticket ouvert ✓', `${res.ticket.id} — l’équipe vous répondra sous 24h.`);
    setTickets(await getMyTickets(userKey(user)));
  };

  const handleWhatsapp = () => {
    Alert.alert(
      'Escale WhatsApp (démo)',
      'En production, ce bouton ouvre WhatsApp au +226 00 00 00 00.\nVersion locale : message simulé.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <AppBar title="Service technique 🛠️" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Besoin d'aide — FAQ</Text>
        {FAQ.map((f, i) => (
          <View key={i} style={styles.faqCard}>
            <TouchableOpacity onPress={() => setFaqOpen(faqOpen === i ? -1 : i)} activeOpacity={0.7}>
              <Text style={styles.faqQ}>{faqOpen === i ? '▾ ' : '▸ '}{f.q}</Text>
            </TouchableOpacity>
            {faqOpen === i && <Text style={styles.faqA}>{f.a}</Text>}
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Ouvrir un ticket</Text>
        <View style={styles.chips}>
          {SUJETS_SUPPORT.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, sujet === s && styles.chipActive]}
              onPress={() => setSujet(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, sujet === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Décrivez votre problème…"
          placeholderTextColor={COLORS.muted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity style={[styles.submitBtn, busy && styles.submitDisabled]} onPress={handleSubmit} disabled={busy}>
          <Text style={styles.submitBtnText}>{busy ? 'Envoi…' : 'Envoyer le ticket'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsapp}>
          <Text style={styles.whatsappBtnText}>💬 Escalade WhatsApp (démo)</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Mes tickets ({tickets.length})</Text>
        {tickets.length === 0 && <Text style={styles.emptySmall}>Aucun ticket pour le moment.</Text>}
        {tickets.map((t) => (
          <View key={t.id} style={styles.ticketCard}>
            <View style={styles.ticketHead}>
              <Text style={styles.ticketId}>{t.id} · {t.sujet}</Text>
              <Text style={[styles.ticketStatus, t.status === 'resolu' && styles.ticketStatusOk]}>
                {t.status === 'resolu' ? 'Résolu ✓' : 'Ouvert'}
              </Text>
            </View>
            <Text style={styles.ticketMsg}>{t.message}</Text>
            <Text style={styles.ticketMeta}>{fmtDate(t.at)}</Text>
            {t.reponse && (
              <View style={styles.answerBox}>
                <Text style={styles.answerTitle}>Réponse de l'équipe</Text>
                <Text style={styles.answerText}>{t.reponse}</Text>
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  content: { padding: SIZES.padding, paddingBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginBottom: 10 },
  faqCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    ...SHADOWS.sm,
  },
  faqQ: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  faqA: { fontSize: 13, color: COLORS.muted, marginTop: 8, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  chipActive: { backgroundColor: COLORS.piment, borderColor: COLORS.piment },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  chipTextActive: { color: '#fff' },
  input: {
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: COLORS.ink,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  submitBtn: { backgroundColor: COLORS.piment, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  whatsappBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.kola,
    alignItems: 'center',
    marginTop: 10,
  },
  whatsappBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptySmall: { color: COLORS.muted, fontSize: 13, marginBottom: 6 },
  ticketCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  ticketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketId: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  ticketStatus: { fontSize: 12, fontWeight: '700', color: COLORS.or },
  ticketStatusOk: { color: COLORS.kola },
  ticketMsg: { fontSize: 13, color: COLORS.muted, marginTop: 6, lineHeight: 18 },
  ticketMeta: { fontSize: 11, color: COLORS.muted, marginTop: 6 },
  answerBox: {
    backgroundColor: COLORS.paper2,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.kola,
  },
  answerTitle: { fontSize: 12, fontWeight: '800', color: COLORS.kola, marginBottom: 4 },
  answerText: { fontSize: 13, color: COLORS.ink, lineHeight: 18 },
});