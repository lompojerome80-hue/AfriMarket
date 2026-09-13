import { SectionEmpty, SectionHeader } from '../sectionLayout';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { fmtDate, STATUS_CHIP_ERR, STATUS_CHIP_WARN } from '../meta';
import { fcfa } from '../../lib/cart';
import { COLORS } from '../../constants/theme';
import { useAdminCtx } from '../AdminContext';

export function SectionDossiers() {
  const { dossiers, setPreview, handleDossierStatus, confirmRejectDossier } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🪪" title="Dossiers livreurs à vérifier" count={dossiers.length} hint="Vérifiez l'identité et validez les documents avant qu'un livreur ne puisse accepter des courses." />
      {dossiers.length === 0 ? (
        <SectionEmpty icon="✅" title="Aucun dossier en attente" subtitle="Tous les dossiers soumis ont été traités." />
      ) : dossiers.map((d) => (
        <View key={d.userKey} style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text style={styles.cardTitle}>{d.name}</Text>
              <Text style={styles.cardMeta}>📞 {d.phone || '—'} · {d.moyen || '—'}</Text>
              <Text style={styles.cardMeta}>📍 {d.localite || '—'} · soumis le {fmtDate(d.submittedAt)}</Text>
            </View>
            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_WARN.dot }]} />
              <Text style={styles.statusChipText}>{STATUS_CHIP_WARN.label}</Text>
            </View>
          </View>
          <View style={styles.thumbs}>
            {d.selfieUri ? (
              <TouchableOpacity onPress={() => setPreview({ uri: d.selfieUri, label: 'Selfie' })}>
                <Image source={{ uri: d.selfieUri }} style={styles.thumb} />
              </TouchableOpacity>
            ) : <View style={[styles.thumb, styles.thumbEmpty]}><Text>📷</Text></View>}
            {d.cniRectoUri ? (
              <TouchableOpacity onPress={() => setPreview({ uri: d.cniRectoUri, label: 'CNI recto' })}>
                <Image source={{ uri: d.cniRectoUri }} style={styles.thumb} />
              </TouchableOpacity>
            ) : <View style={[styles.thumb, styles.thumbEmpty]}><Text>🪪</Text></View>}
            {d.cniVersoUri ? (
              <TouchableOpacity onPress={() => setPreview({ uri: d.cniVersoUri, label: 'CNI verso' })}>
                <Image source={{ uri: d.cniVersoUri }} style={styles.thumb} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 1 }]} onPress={() => handleDossierStatus(d.userKey, 'verifie')}>
              <Text style={styles.miniBtnText}>Vérifier ✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => confirmRejectDossier(d.userKey, d.name)}>
              <Text style={styles.miniBtnText}>Rejeter</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );
}

export function SectionReglements() {
  const { settlements, setPreview, confirmSettleApprove, confirmRejectSett } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="💸" title="Règlements à confirmer" count={settlements.length} hint="Vérifiez la capture USSD / preuve puis confirmez : le dû est remis à zéro et le compte débloqué." />
      {settlements.length === 0 ? (
        <SectionEmpty icon="✅" title="Aucun règlement en attente" subtitle="Toutes les preuves soumises ont été traitées." />
      ) : settlements.map((s) => (
        <View key={s.key} style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text style={styles.cardTitle}>{s.nom}</Text>
              <Text style={styles.cardMeta}>{s.key}</Text>
              <Text style={styles.cardMeta}>Montant : <Text style={styles.montantText}>{fcfa(s.montant)}</Text> · {fmtDate(s.at)}</Text>
              <Text style={styles.cardMeta}>Moyen : {s.moyen || 'USSD *144#'}</Text>
            </View>
            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_WARN.dot }]} />
              <Text style={styles.statusChipText}>{STATUS_CHIP_WARN.label}</Text>
            </View>
          </View>
          {s.proof ? (
            <View style={styles.rowBtns}>
              <TouchableOpacity
                style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]}
                onPress={() => setPreview({ uri: s.proof, label: `Preuve de règlement · ${s.nom} (${fcfa(s.montant)})` })}
              >
                <Text style={[styles.miniBtnText, styles.miniGhostText]}>🧾 Voir la preuve</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.cardMeta, { marginTop: 8 }]}>(aucune preuve envoyée)</Text>
          )}
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 1 }]} onPress={() => confirmSettleApprove(s.key, s.montant)}>
              <Text style={styles.miniBtnText}>Confirmer ✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => confirmRejectSett(s.key)}>
              <Text style={styles.miniBtnText}>Rejeter</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );
}

export function SectionLitiges() {
  const { litiges, handleResolve } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="⚖️" title="Litiges à résoudre" count={litiges.length} hint="Remboursement intégral au client, ou libération des fonds au vendeur. La décision est notifiée aux deux parties." />
      {litiges.length === 0 ? (
        <SectionEmpty icon="✅" title="Aucun litige ouvert" subtitle="Les paiements en escrow circulent sans blocage." />
      ) : litiges.map((p) => (
        <View key={p.orderId} style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text style={styles.cardTitle}>{p.orderId}</Text>
              <Text style={styles.cardMeta}>Montant bloqué : <Text style={styles.montantText}>{fcfa(p.montant)}</Text></Text>
            </View>
            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_ERR.dot }]} />
              <Text style={styles.statusChipText}>{STATUS_CHIP_ERR.label}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>Opérateur : {p.providerLabel || p.provider} · {p.phone}</Text>
          <Text style={styles.cardMeta}>Vendeur : {p.sellerKey}</Text>
          <Text style={styles.cardMeta}>Acheteur : {p.buyerKey}</Text>
          {p.dispute && (
            <View style={styles.disputeBox}>
              <Text style={styles.disputeLabel}>Motif du client</Text>
              <Text style={styles.disputeText}>{p.dispute.reason || '—'}</Text>
            </View>
          )}
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => handleResolve(p.orderId, 'rembourse')}>
              <Text style={styles.miniBtnText}>Rembourser client</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 1 }]} onPress={() => handleResolve(p.orderId, 'libere_admin')}>
              <Text style={styles.miniBtnText}>Libérer au vendeur</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );
}

export function SectionTickets() {
  const { tickets, advice, setAdvice, handleCloseTicket } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🎫" title="Tickets support ouverts" count={tickets.length} hint="Rédigez une réponse puis clôturez : le client est notifié immédiatement." />
      {tickets.length === 0 ? (
        <SectionEmpty icon="✅" title="Aucun ticket ouvert" subtitle="Tous les tickets ont été traités." />
      ) : tickets.map((t) => (
        <View key={t.id} style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text style={styles.cardTitle}>{t.id}</Text>
              <Text style={styles.cardMeta}>{t.sujet}</Text>
            </View>
            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_WARN.dot }]} />
              <Text style={styles.statusChipText}>{STATUS_CHIP_WARN.label}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>{t.userName} · {fmtDate(t.at)}</Text>
          <Text style={styles.ticketMsg}>{t.message}</Text>
          <TextInput
            style={styles.replyInput}
            placeholder="Votre réponse au client…"
            placeholderTextColor={COLORS.muted}
            value={advice[t.id] || ''}
            onChangeText={(v) => setAdvice((a) => ({ ...a, [t.id]: v }))}
            multiline
          />
          <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => handleCloseTicket(t.id)}>
            <Text style={styles.miniBtnText}>Clôturer et notifier</Text>
          </TouchableOpacity>
        </View>
      ))}
    </>
  );
}

