import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { sectionStyles } from '../sectionLayout';
import { fcfa } from '../../lib/cart';
import { useAdminCtx } from '../AdminContext';

  const QueueRow = ({ icon, label, count, onPress }) => (
    <TouchableOpacity style={styles.queueRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.queueIcon}>{icon}</Text>
      <Text style={styles.queueLabel}>{label}</Text>
      {count > 0 ? (
        <View style={styles.queueBadge}>
          <Text style={styles.queueBadgeText}>{count}</Text>
        </View>
      ) : (
        <Text style={styles.queueDone}>à jour ✓</Text>
      )}
      <Text style={styles.queueArrow}>→</Text>
    </TouchableOpacity>
  );

export function SectionApercu() {
  const { setSection, dossiers, settlements, litiges, tickets, frais, commissions, pendingContracts, flaggedActive, newReports, totalPending, allQuiet } = useAdminCtx();
  return (
    <>
      {allQuiet ? (
        <View style={[sectionStyles.emptyBox, { backgroundColor: '#EDFBF3', borderColor: '#C9EFDD' }]}>
          <Text style={sectionStyles.emptyIcon}>🎉</Text>
          <Text style={sectionStyles.emptyTitle}>Tout est traité</Text>
          <Text style={sectionStyles.emptyText}>Aucune action en attente. Les opérations en cours sont à jour.</Text>
        </View>
      ) : (
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>{totalPending} action(s) en attente</Text>
          <Text style={styles.alertText}>Traitez dossier, règlements, litiges, tickets, contrats et signalements de comptes depuis leurs sections dédiées.</Text>
        </View>
      )}

      <Text style={[sectionStyles.sectionTitle, { marginTop: 4 }]}>File d'attente</Text>
      <QueueRow icon="🪪" label="Dossiers livreurs" count={dossiers.length} onPress={() => setSection('dossiers')} />
      <QueueRow icon="💸" label="Règlements" count={settlements.length} onPress={() => setSection('reglements')} />
      <QueueRow icon="⚖️" label="Litiges" count={litiges.length} onPress={() => setSection('litiges')} />
      <QueueRow icon="🎫" label="Tickets support" count={tickets.length} onPress={() => setSection('tickets')} />
      <QueueRow icon="📄" label="Contrats à accepter" count={pendingContracts} onPress={() => setSection('contrats')} />
      <QueueRow icon="🛡️" label="Comptes signalés" count={flaggedActive} onPress={() => setSection('comptes')} />
      <QueueRow icon="🚨" label="Produits signalés" count={newReports} onPress={() => setSection('signalements')} />

      <View style={styles.divider} />
      <Text style={[sectionStyles.sectionTitle, { marginTop: 0 }]}>Indicateurs financiers</Text>
      <View style={styles.feeRow}>
        <View style={styles.feeCell}>
          <Text style={styles.feeValue}>{fcfa(frais ? frais.total : 0)}</Text>
          <Text style={styles.feeLabel}>Frais collectés</Text>
        </View>
        <View style={styles.feeCell}>
          <Text style={styles.feeValue}>{fcfa(commissions.total)}</Text>
          <Text style={styles.feeLabel}>Compensations</Text>
        </View>
        <View style={styles.feeCell}>
          <Text style={styles.feeValue}>{commissions.count}</Text>
          <Text style={styles.feeLabel}>Ventes compensées</Text>
        </View>
      </View>
    </>
  );
}

