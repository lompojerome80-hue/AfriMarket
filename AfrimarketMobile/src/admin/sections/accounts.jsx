import { Image, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { COLORS } from '../../constants/theme';
import { fmtDate, STATUS_CHIP_ERR, STATUS_CHIP_OK } from '../meta';
import { SEVERITIES } from '../../lib/admin';
import { SectionEmpty, SectionHeader } from '../sectionLayout';
import { fcfa } from '../../lib/cart';
import { useAdminCtx } from '../AdminContext';

  const flagChip = (f) => {
    if (f.status === 'ferme') return <View style={[styles.statusChip, styles.statusChipOk]}><View style={[styles.statusDot, { backgroundColor: COLORS.piment }]} /><Text style={styles.statusChipText}>Compte fermé</Text></View>;
    if (f.status === 'leve') return <View style={styles.statusChip}><View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_OK.dot }]} /><Text style={styles.statusChipText}>Signalement levé</Text></View>;
    return <View style={styles.statusChip}><View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_ERR.dot }]} /><Text style={styles.statusChipText}>{SEVERITIES.find((s) => s.key === f.severity)?.label || 'Signalé'}</Text></View>;
  };

export function SectionDus() {
  const { setSection, duesOv, relancerLivreur } = useAdminCtx();
    const dueTotal = duesOv.reduce((s, d) => s + d.montant, 0);
    const owed = duesOv.filter((d) => d.montant > 0);
    return (
      <>
        <SectionHeader icon="🚛" title="Dûs des livreurs" count={owed.length} hint="Vue globale des commissions en attente. « Bloqué » = dû de la veille non réglé (compte immobilisé jusqu'au règlement validé)." />
        {owed.length > 0 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>{fcfa(dueTotal)} de dûs cumulés</Text>
            <Text style={styles.alertText}>{owed.length} livreur(s) doivent un montant. Les dûs bloqués requièrent un règlement validé par vos soins (onglet Règlements).</Text>
          </View>
        )}
        {duesOv.length === 0 ? (
          <SectionEmpty icon="🚛" title="Aucun livreur" subtitle="Les comptes livreurs apparaîtront ici." />
        ) : duesOv.map((d) => (
          <View key={d.key} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{d.name}</Text>
                <Text style={styles.cardMeta}>{d.phone || d.key}</Text>
              </View>
              {d.montant > 0 ? (
                <View style={styles.statusChip}>
                  <View style={[styles.statusDot, { backgroundColor: d.overdue ? COLORS.piment : COLORS.or }]} />
                  <Text style={styles.statusChipText}>{d.overdue ? 'Bloqué' : 'En attente'}</Text>
                </View>
              ) : (
                <View style={[styles.statusChip, styles.statusChipOk]}>
                  <View style={[styles.statusDot, { backgroundColor: COLORS.kola }]} />
                  <Text style={styles.statusChipText}>À jour</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardMeta}>
              Dû actuel : <Text style={styles.montantText}>{fcfa(d.montant)}</Text>
              {d.jour ? ` · date : ${d.jour}` : ''}
              {d.compteFerme ? ' · compte fermé' : ''}
            </Text>
            <Text style={styles.cardMeta}>Règlements historiques : {d.historique.length}</Text>
            {d.montant > 0 && (
              <View style={styles.rowBtns}>
                <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => relancerLivreur(d)}>
                  <Text style={[styles.miniBtnText, styles.miniGhostText]}>Relancer 📣</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 1 }]} onPress={() => setSection('reglements')}>
                  <Text style={styles.miniBtnText}>Règlements</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </>
    );
}

export function SectionCompteDetail() {
  const { viewCompte, setViewCompte, viewProducts, viewBoutiques, openModeration } = useAdminCtx();
    const acc = viewCompte;
    const boutiques = viewBoutiques
      .map((b) => b.trim().replace(/-/g, ' '))
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    return (
      <>
        <TouchableOpacity style={styles.backRow} onPress={() => setViewCompte(null)} activeOpacity={0.7}>
          <Text style={styles.backRowText}>← Retour aux comptes</Text>
        </TouchableOpacity>
        <SectionHeader
          icon="🛍️"
          title={`Produits de ${acc?.name || acc?.key || 'ce vendeur'}`}
          count={viewProducts.length}
          hint="Vérifiez la conformité de chaque produit (interdits, illicites, contrefaçons…). En le supprimant, un motif vous sera demandé : il sera notifié au vendeur."
        />
        {boutiques.length > 0 && (
          <Text style={[styles.cardMeta, { marginBottom: 10 }]}>🏪 Boutique(s) : {boutiques.join(', ')}</Text>
        )}
        {viewProducts.length === 0 ? (
          <SectionEmpty icon="🛍️" title="Aucun produit publié" subtitle="Ce vendeur n'a pas encore de produit visible sur la plateforme." />
        ) : viewProducts.map((p) => (
          <View key={String(p.id)} style={styles.card}>
            <View style={styles.cardHead}>
              {p.img ? (
                <Image source={{ uri: p.img }} style={[styles.thumb, { marginRight: 10 }]} />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty, { marginRight: 10 }]}><Text>📦</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{p.title}</Text>
                <Text style={styles.cardMeta}>🏪 {p.boutiqueName || p.boutique_nom || 'Boutique'}</Text>
                <Text style={styles.cardMeta}>
                  {fcfa(Number(p.price) || 0)}
                  {p.stock != null ? ` · Stock ${p.stock}` : ''}
                  {p.category ? ` · ${p.category}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => openModeration(p)}>
                <Text style={styles.miniBtnText}>Supprimer 🚫</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </>
    );
}

export function SectionComptes() {
  const { admin, accounts, flags, viewCompte, setViewCompte, openFlag, notifierFlag, leverFlag, fermerCompte, rouvrirCompte, supprimerCompte, openNote, flaggedActive } = useAdminCtx();
    if (viewCompte) return <SectionCompteDetail />;
    return (
      <>
        <SectionHeader icon="👥" title="Comptes & signalements" count={flaggedActive} hint="Cliquez sur « Voir ses produits » pour inspecter les produits d'un vendeur avant modération. Signalez, relancez, levez ou fermez un compte (art. 8 du contrat)." />
        <Text style={styles.subSection}>Signalements ({flags.length})</Text>
        {flags.length === 0 ? (
          <SectionEmpty icon="🛡️" title="Aucun signalement" subtitle="Les comptes signalés apparaîtront ici avec leur statut." />
        ) : flags.map((f) => (
          <View key={f.id} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{f.name || f.key}</Text>
                <Text style={styles.cardMeta}>{f.phone || '—'} · {f.role || ''}</Text>
              </View>
              {flagChip(f)}
            </View>
            <Text style={styles.cardMeta}>Motif : <Text style={{ color: COLORS.piment, fontWeight: '700' }}>{f.reason || '—'}</Text></Text>
            <Text style={styles.cardMeta}>Signalé par {f.by || 'Admin'} le {fmtDate(f.at)}</Text>
            {f.closedAt && <Text style={styles.cardMeta}>Fermé le {fmtDate(f.closedAt)}{f.closureReason ? ` — ${f.closureReason}` : ''}</Text>}
            {f.liftedAt && <Text style={styles.cardMeta}>Levé le {fmtDate(f.liftedAt)}</Text>}
            <View style={styles.rowBtns}>
              {f.status === 'actif' && (
                <>
                  <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => notifierFlag(f)}>
                    <Text style={[styles.miniBtnText, styles.miniGhostText]}>Relancer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 1 }]} onPress={() => leverFlag(f)}>
                    <Text style={styles.miniBtnText}>Lever</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => fermerCompte(f)}>
                    <Text style={styles.miniBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </>
              )}
              {f.status === 'ferme' && (
                <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 1 }]} onPress={() => rouvrirCompte(f)}>
                  <Text style={styles.miniBtnText}>Rouvrir le compte</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={styles.divider} />
        <Text style={styles.subSection}>Tous les comptes ({accounts.length})</Text>
        {accounts.length === 0 ? (
          <SectionEmpty icon="👥" title="Aucun compte" subtitle="Les comptes enregistrés apparaîtront ici." />
        ) : accounts.map((a) => {
          const closed = a.closedFlag || (a.accountStatus === 'ferme');
          return (
            <View key={a.key} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{a.name || a.key}</Text>
                  <Text style={styles.cardMeta}>{a.phone || '—'} · {a.role || ''} · créé le {fmtDate(a.createdAt)}</Text>
                </View>
                {closed ? (
                  <View style={[styles.statusChip, styles.statusChipOk]}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.piment }]} />
                    <Text style={styles.statusChipText}>Fermé</Text>
                  </View>
                ) : a.activeFlag ? (
                  <View style={styles.statusChip}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_ERR.dot }]} />
                    <Text style={styles.statusChipText}>Signalé</Text>
                  </View>
                ) : (
                  <View style={styles.statusChip}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_OK.dot }]} />
                    <Text style={styles.statusChipText}>Actif</Text>
                  </View>
                )}
              </View>
              {a.role === 'Vendeur' && (
                <TouchableOpacity
                  style={[styles.miniBtn, styles.miniGhost, { alignSelf: 'flex-start', marginTop: 10 }]}
                  onPress={() => setViewCompte(a)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.miniBtnText, styles.miniGhostText]}>🛍️ Voir ses produits</Text>
                </TouchableOpacity>
              )}
              <View style={styles.rowBtns}>
                <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => openFlag(a)}>
                  <Text style={[styles.miniBtnText, styles.miniGhostText]}>🛡️ Signaler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => openNote(a)}>
                  <Text style={[styles.miniBtnText, styles.miniGhostText]}>🗒️ Noter</Text>
                </TouchableOpacity>
                {a.key !== admin.key && (
                  <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => supprimerCompte(a)}>
                    <Text style={styles.miniBtnText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </>
    );
}

