import {
  View, Text, TouchableOpacity, ScrollView, Modal, Image, TextInput, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppBar from '../src/components/AppBar';
import { COLORS } from '../src/constants/theme';
import { SECTIONS, fmtDate } from '../src/admin/meta';
import { SEVERITIES } from '../src/lib/admin';
import { ROLE_ADMIN } from '../src/lib/auth';
import { useAdminScreen } from '../src/admin/useAdminScreen';
import { styles } from '../src/admin/styles';
import { SectionApercu } from '../src/admin/sections/overview';
import { SectionDossiers, SectionReglements, SectionLitiges, SectionTickets } from '../src/admin/sections/treasury';
import { SectionProduits, SectionCommandes, SectionCoupons, SectionOperateurs, SectionLivraisons, SectionAvis, SectionAvant, SectionSignalements } from '../src/admin/sections/marketplace';
import { SectionComptes, SectionDus } from '../src/admin/sections/accounts';
import { SectionAudit, SectionCampagnes, SectionCompta, SectionContrats, SectionDiffusion, SectionInfos, SectionOutils, SectionParametres, SectionRapports } from '../src/admin/sections/ops';

export default function AdminScreen() {
  const navigation = useNavigation();
  const ctx = useAdminScreen();
  const {
    admin, section, setSection, menuOpen, setMenuOpen,
    preview, setPreview, reasonModal, setReasonModal, reason, setReason,
    confirmReasonAction, flagModal, setFlagModal, flagSeverity, setFlagSeverity,
    flagReason, setFlagReason, submitFlag, codePrompt, setCodePrompt,
    codeInput, setCodeInput, submitCode, noteModal, setNoteModal,
    noteText, setNoteText, addNote, lastUpdate, refreshing, onRefresh, reload,
    KPIS, sectionBadge,
  } = ctx;

  if (!admin) {
    return (
      <View style={styles.container}>
        <AppBar title="Console admin" onBack={() => navigation.goBack()} />
        <View style={styles.centerNotice}>
          <Text style={styles.centerIcon}>🔐</Text>
          <Text style={styles.centerTitle}>Espace administrateur</Text>
          <Text style={styles.centerText}>Connectez-vous avec un compte administrateur pour accéder à la console.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  if (admin.role !== ROLE_ADMIN) {
    return (
      <View style={styles.container}>
        <AppBar title="Console admin" onBack={() => navigation.goBack()} />
        <View style={styles.centerNotice}>
          <Text style={styles.centerIcon}>🚫</Text>
          <Text style={styles.centerTitle}>Accès refusé</Text>
          <Text style={styles.centerText}>Votre compte n'a pas le rôle administrateur.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppBar
        title="Console admin 🔐"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity style={styles.refreshBtn} onPress={() => reload()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.refreshBtnText}>⟳</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.piment]} tintColor={COLORS.piment} />}
      >
        <View style={styles.headerPanel}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{admin.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{admin.name}</Text>
            <Text style={styles.headerRole}>Administrateur · Console de gestion</Text>
            <Text style={styles.headerUpdated}>
              {lastUpdate ? `Actualisé à ${lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Chargement…'}
            </Text>
          </View>
        </View>

        <View style={styles.kpiWrap}>
          {KPIS.map((k) => (
            <TouchableOpacity
              key={k.key}
              style={styles.kpiCell}
              activeOpacity={0.8}
              onPress={() => k.key !== 'frais' && setSection(k.key)}
            >
              <View style={[styles.kpiIcon, { backgroundColor: k.accent + '1A' }]}>
                <Text style={styles.kpiIconText}>{k.icon}</Text>
              </View>
              <Text style={[styles.kpiValue, { color: k.accent }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabsWrap}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.85}>
            <View style={styles.menuBtnLeft}>
              <Text style={styles.menuBtnIcon}>{SECTIONS.find((s) => s.key === section)?.icon || '🏠'}</Text>
              <Text style={styles.menuBtnLabel} numberOfLines={1}>
                {SECTIONS.find((s) => s.key === section)?.label || 'Menu'}
              </Text>
              {sectionBadge(section) ? (
                <View style={styles.menuBtnBadge}>
                  <Text style={styles.menuBtnBadgeText}>{sectionBadge(section)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.menuBtnDots}>⋯</Text>
          </TouchableOpacity>
        </View>

        {section === 'apercu' && <SectionApercu />}
        {section === 'dossiers' && <SectionDossiers />}
        {section === 'reglements' && <SectionReglements />}
        {section === 'litiges' && <SectionLitiges />}
        {section === 'tickets' && <SectionTickets />}
        {section === 'commandes' && <SectionCommandes />}
        {section === 'produits' && <SectionProduits />}
        {section === 'signalements' && <SectionSignalements />}
        {section === 'comptes' && <SectionComptes />}
        {section === 'dus' && <SectionDus />}
        {section === 'diffusion' && <SectionDiffusion />}
        {section === 'avant' && <SectionAvant />}
        {section === 'campagnes' && <SectionCampagnes />}
        {section === 'coupons' && <SectionCoupons />}
        {section === 'operateurs' && <SectionOperateurs />}
        {section === 'livraisons' && <SectionLivraisons />}
        {section === 'avis' && <SectionAvis />}
        {section === 'parametres' && <SectionParametres />}
        {section === 'audit' && <SectionAudit />}
        {section === 'rapports' && <SectionRapports />}
        {section === 'infos' && <SectionInfos />}
        {section === 'compta' && <SectionCompta />}
        {section === 'contrats' && <SectionContrats />}
        {section === 'outils' && <SectionOutils />}

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreview(null)}>
            <Text style={styles.previewCloseText}>✕ Fermer</Text>
          </TouchableOpacity>
          {preview?.uri ? <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" /> : null}
          <Text style={styles.previewLabel}>{preview?.label}</Text>
        </View>
      </Modal>

      <Modal
        visible={!!reasonModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReasonModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {reasonModal?.type === 'produit' ? 'Motif de suppression du produit' : 'Supprimer définitivement le compte'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {reasonModal?.type === 'produit'
                ? `« ${reasonModal?.payload?.title || ''} » — ce motif sera notifié au vendeur.`
                : `« ${reasonModal?.payload?.name || reasonModal?.payload?.key || ''} » — compte, boutique et produits seront effacés.`}
            </Text>
            <TextInput
              style={styles.modalArea}
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder={reasonModal?.type === 'produit'
                ? 'Ex : produit interdit par la loi, contenu pornographique, contrefaçon…'
                : 'Motif (optionnel) — sera consigné dans le journal.'}
              placeholderTextColor={COLORS.muted}
            />
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => setReasonModal(null)}>
                <Text style={[styles.miniBtnText, styles.miniGhostText]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniBtn, styles.miniNo, { flex: 2 }]}
                onPress={confirmReasonAction}
              >
                <Text style={styles.miniBtnText}>{reasonModal?.type === 'produit' ? 'Supprimer le produit' : 'Supprimer le compte'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!flagModal}
        transparent
        animationType="slide"
        onRequestClose={() => setFlagModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🛡️ Signaler le compte</Text>
            <Text style={styles.modalSubtitle}>
              {flagModal?.account?.name || flagModal?.account?.key || ''}
              {' — le concerné sera notifié immédiatement (art. 8 du contrat).'}
            </Text>
            <Text style={styles.fieldLabel}>Gravité du signalement</Text>
            <View style={styles.operatorWrap}>
              {SEVERITIES.map((s) => {
                const active = flagSeverity === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.operatorChip, active && styles.severityChipActive]}
                    onPress={() => setFlagSeverity(s.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.operatorChipText, active && styles.severityChipActiveText]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.fieldLabel}>Motif détaillé</Text>
            <TextInput
              style={styles.modalArea}
              value={flagReason}
              onChangeText={setFlagReason}
              multiline
              placeholder="Ex : produit interdit constaté, tentative de fraude, manquement répété…"
              placeholderTextColor={COLORS.muted}
            />
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => setFlagModal(null)}>
                <Text style={[styles.miniBtnText, styles.miniGhostText]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 2 }]} onPress={submitFlag}>
                <Text style={styles.miniBtnText}>Envoyer le signalement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!codePrompt}
        transparent
        animationType="slide"
        onRequestClose={() => setCodePrompt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔐 Action sensible</Text>
            <Text style={styles.modalSubtitle}>
              {codePrompt?.title || 'Cette action requiert le code d\'administration.'}
              {'\nLe code n\'est demandé qu\'une fois par session.'}
            </Text>
            <TextInput
              style={styles.modalArea}
              value={codeInput}
              onChangeText={setCodeInput}
              placeholder="Code admin"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => setCodePrompt(null)}>
                <Text style={[styles.miniBtnText, styles.miniGhostText]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 2 }]} onPress={submitCode}>
                <Text style={styles.miniBtnText}>Valider le code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!noteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🗒️ Notes privées</Text>
            <Text style={styles.modalSubtitle}>
              {noteModal?.account?.name || noteModal?.account?.key || ''}
              {' — ces notes ne sont visibles que par les administrateurs. Idéal pour suivre un dossier, des rappels, une surveillance.'}
            </Text>
            <ScrollView style={{ maxHeight: 220 }}>
              {!noteModal || noteModal.notes.length === 0 ? (
                <Text style={styles.cardMeta}>Aucune note pour le moment.</Text>
              ) : noteModal.notes.map((n) => (
                <View key={n.id} style={styles.noteItem}>
                  <Text style={styles.noteText}>{n.text}</Text>
                  <Text style={styles.noteMeta}>{n.by} · {fmtDate(n.at)}</Text>
                </View>
              ))}
            </ScrollView>
            <TextInput
              style={styles.modalArea}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Écrire une note interne…"
              placeholderTextColor={COLORS.muted}
              multiline
            />
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => setNoteModal(null)}>
                <Text style={[styles.miniBtnText, styles.miniGhostText]}>Fermer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 2 }]} onPress={addNote}>
                <Text style={styles.miniBtnText}>Ajouter la note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.menuOverlay}>
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Sections de la console</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
                <Text style={styles.menuClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuList}>
              {SECTIONS.map((s) => {
                const active = section === s.key;
                const badge = sectionBadge(s.key);
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.menuRow, active && styles.menuRowActive]}
                    onPress={() => { setSection(s.key); setMenuOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.menuRowIcon}>{s.icon}</Text>
                    <Text style={[styles.menuRowLabel, active && styles.menuRowLabelActive]}>{s.label}</Text>
                    {badge ? (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{badge}</Text>
                      </View>
                    ) : active ? (
                      <Text style={styles.menuCheck}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
