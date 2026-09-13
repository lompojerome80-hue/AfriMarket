import { SectionEmpty, SectionHeader } from '../sectionLayout';
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { COLORS } from '../../constants/theme';
import { fmtDate, STATUS_CHIP_OK, STATUS_CHIP_WARN } from '../meta';
import { CAMPAGNE_MODES, campaignHiddenReason, campaignVisible, modeLabel, TARGET_OPTIONS, TARGET_ROLES } from '../../lib/campaigns';
import { fcfa } from '../../lib/cart';
import { getProvider } from '../../lib/payments';
import { SEUIL_CONTRAT } from '../../lib/contract';
import { clearAuditLog } from '../../lib/audit';
import { useAdminCtx } from '../AdminContext';

export function SectionInfos() {
  const { infos, infoTitre, setInfoTitre, infoValeur, setInfoValeur, addInfo, removeInfo } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="📢" title="Informations dans l'application" hint="Ajoutez les informations utiles aux utilisateurs, comme le numéro de règlement AfriMarket pour que les livreurs règlent leur dû. Elles sont visibles sur l'écran Livraisons." />
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Titre (ex : Compte de règlement Livreur)</Text>
        <TextInput
          style={styles.settingInput}
          value={infoTitre}
          onChangeText={setInfoTitre}
          placeholder="Compte de règlement Livreur"
          placeholderTextColor={COLORS.muted}
        />
        <View style={{ height: 10 }} />
        <Text style={styles.fieldLabel}>Valeur (ex : 06181574 — numéro de paiement)</Text>
        <TextInput
          style={styles.settingInput}
          value={infoValeur}
          onChangeText={setInfoValeur}
          placeholder="06181574"
          placeholderTextColor={COLORS.muted}
        />
        <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 14 }]} onPress={addInfo}>
          <Text style={styles.miniBtnText}>Ajouter l'information</Text>
        </TouchableOpacity>
      </View>
      {infos.length === 0 ? (
        <SectionEmpty icon="📢" title="Aucune information" subtitle="Ajoutez une information pour la diffuser aux utilisateurs." />
      ) : infos.map((i) => (
        <View key={i.id} style={styles.card}>
          <Text style={styles.cardTitle}>{i.titre}</Text>
          <Text style={styles.cardMeta}>{i.valeur}</Text>
          <Text style={styles.cardMeta}>Ajoutée le {fmtDate(i.at)}</Text>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => removeInfo(i.id)}>
              <Text style={styles.miniBtnText}>Retirer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );
}

export function SectionParametres() {
  const { plat, setPlat, savePlat } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🎚️" title="Paramètres de la plateforme" hint="Appliqués immédiatement : montant minimum de commande, message d'accueil, carrousel des produits en vedette et code de sécurité admin (optionnel)." />
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Montant minimum de commande (FCFA) — 0 = pas de minimum</Text>
        <TextInput
          style={styles.settingInput}
          keyboardType="numeric"
          value={String(plat.minOrder ?? 0)}
          onChangeText={(v) => setPlat((p) => ({ ...p, minOrder: v }))}
          placeholder="0"
          placeholderTextColor={COLORS.muted}
        />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Message d'accueil (affiché en haut de l'accueil)</Text>
        <TextInput
          style={[styles.settingInput, { minHeight: 72 }]}
          value={plat.homeMessage || ''}
          onChangeText={(v) => setPlat((p) => ({ ...p, homeMessage: v }))}
          placeholder="Ex : Livraison offerte ce week-end à Ouagadougou !"
          placeholderTextColor={COLORS.muted}
          multiline
          textAlignVertical="top"
        />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Carrousel des produits en vedette (accueil)</Text>
        <View style={styles.operatorWrap}>
          {[{ key: true, label: 'Activé' }, { key: false, label: 'Désactivé' }].map((o) => {
            const active = plat.featuredCarousel === o.key;
            return (
              <TouchableOpacity
                key={String(o.key)}
                style={[styles.operatorChip, active && styles.severityChipActive]}
                onPress={() => setPlat((p) => ({ ...p, featuredCarousel: o.key }))}
                activeOpacity={0.8}
              >
                <Text style={[styles.operatorChipText, active && styles.severityChipActiveText]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Code admin (laissez vide pour désactiver)</Text>
        <TextInput
          style={styles.settingInput}
          value={plat.adminCode || ''}
          onChangeText={(v) => setPlat((p) => ({ ...p, adminCode: v }))}
          placeholder="ex : 1234"
          placeholderTextColor={COLORS.muted}
          secureTextEntry
        />
        <Text style={[styles.cardMeta, { marginTop: 8 }]}>
          {plat.adminCode ? '🔒 Demandé avant : suppression de produit/compte, signalement, fermeture, diffusion, décision sur les commandes, suppression d\'avis et réinitialisation.' : '🔓 Aucun code : toutes les actions de la console sont directement accessibles.'}
        </Text>
        <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 14 }]} onPress={savePlat}>
          <Text style={styles.miniBtnText}>Enregistrer les paramètres</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export function SectionAudit() {
  const { auditLog, reload, audit, requireCode } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="📒" title="Journal d'audit" count={auditLog.length} hint="Trace chronologique de toutes les actions sensibles effectuées depuis la console (modération, diffusion, réglages, décisions, export…). Conservez-la à titre de preuve." />
      {auditLog.length === 0 ? (
        <SectionEmpty icon="📒" title="Journal vide" subtitle="Les actions de la console apparaîtront ici au fil de l'eau." />
      ) : auditLog.slice(0, 60).map((e) => (
        <View key={e.id} style={styles.card}>
          <Text style={styles.cardTitle}>{e.action}</Text>
          {e.detail ? <Text style={styles.cardMeta}>{e.detail}</Text> : null}
          <Text style={styles.cardMeta}>Par {e.by} · {fmtDate(e.at)}</Text>
        </View>
      ))}
      {auditLog.length > 60 && <Text style={styles.cardMeta}>… et {auditLog.length - 60} autre(s).</Text>}
      {auditLog.length > 0 && (
        <TouchableOpacity
          style={[styles.miniBtn, styles.miniNo, { alignSelf: 'flex-start', marginTop: 8 }]}
          onPress={() => requireCode('Vider le journal', () => {
            Alert.alert('Vider le journal', 'Supprimer définitivement tout l\'historique d\'audit ?', [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Vider',
                style: 'destructive',
                onPress: async () => {
                  await clearAuditLog();
                  await audit('Journal d\'audit vidé', 'historique effacé');
                  await reload();
                },
              },
            ]);
          })}
        >
          <Text style={styles.miniBtnText}>Vider le journal</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

export function SectionCampagnes() {
  const { vendeursCount, boutiquesAdmin, pubReq, plat, setPlat, cams, campDraft, setCampDraft, savePlat, pickCampImage, pickCampMode, submitCamp, toggleCamp, delCamp, approverPub, refuserPub } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🎪" title="Campagnes & publicités" count={cams.filter((c) => c.actif).length} hint="Passez une photo à l'ouverture de l'app pendant une période, ciblable par rôle, par ville ou par thème d'intérêt. Le client peut la passer." />
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>1. Choisir un mode (option)</Text>
        <View style={styles.operatorWrap}>
          {CAMPAGNE_MODES.map((m) => {
            const sel = campDraft.mode === m.key;
            return (
              <TouchableOpacity key={m.key} style={[styles.operatorChip, sel && styles.severityChipActive]} onPress={() => pickCampMode(m)} activeOpacity={0.8}>
                <Text style={[styles.operatorChipText, sel && styles.severityChipActiveText]}>{m.emoji} {m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>2a. Photo de la page d'accueil (bannière verticale)</Text>
        {campDraft.image ? (
          <View style={styles.campDraftImgWrap}>
            <Image source={{ uri: campDraft.image }} style={styles.campDraftImg} />
            <TouchableOpacity style={styles.campDraftRemove} onPress={() => setCampDraft({ ...campDraft, image: null })}>
              <Text style={styles.campDraftRemoveText}>✕ Retirer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { alignSelf: 'flex-start' }]} onPress={() => pickCampImage('image')}>
            <Text style={[styles.miniBtnText, styles.miniGhostText]}>🖼️ Choisir la photo d'accueil</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>2b. Photo de chargement (affiche à l'ouverture de l'app)</Text>
        {campDraft.imageSplash ? (
          <View style={styles.campDraftImgWrap}>
            <Image source={{ uri: campDraft.imageSplash }} style={styles.campDraftImg} />
            <TouchableOpacity style={styles.campDraftRemove} onPress={() => setCampDraft({ ...campDraft, imageSplash: null })}>
              <Text style={styles.campDraftRemoveText}>✕ Retirer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { alignSelf: 'flex-start' }]} onPress={() => pickCampImage('imageSplash')}>
            <Text style={[styles.miniBtnText, styles.miniGhostText]}>🖼️ Choisir la photo de chargement</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>3. Thème / mots-clés (pour personnaliser la diffusion)</Text>
        <TextInput
          style={styles.settingInput}
          value={campDraft.theme}
          onChangeText={(v) => setCampDraft({ ...campDraft, theme: v })}
          placeholder="Ex : pagnes, wax, vêtements"
          placeholderTextColor={COLORS.muted}
        />
        <Text style={styles.formHint}>Chaque client garde l'historique de ses recherches et achats sur son téléphone. Cette pub photo est alors proposée en priorité à ceux dont l'historique correspond à ces mots-clés — la pub va aux gens intéressés.</Text>
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>4. Qui voit la pub ?</Text>
        <View style={styles.operatorWrap}>
          {TARGET_OPTIONS.map((t) => {
            const selT = campDraft.target === t.key;
            return (
              <TouchableOpacity key={t.key} style={[styles.operatorChip, selT && styles.severityChipActive]} onPress={() => setCampDraft({ ...campDraft, target: t.key, targetRole: '', targetVille: '' })} activeOpacity={0.8}>
                <Text style={[styles.operatorChipText, selT && styles.severityChipActiveText]}>{t.key === 'tous' ? '👥' : t.key === 'role' ? '🎭' : '📍'} {t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {campDraft.target === 'role' && (
          <View style={styles.operatorWrap}>
            {TARGET_ROLES.map((r) => {
              const selR = campDraft.targetRole === r;
              return (
                <TouchableOpacity key={r} style={[styles.operatorChip, selR && styles.severityChipActive]} onPress={() => setCampDraft({ ...campDraft, targetRole: r })} activeOpacity={0.8}>
                  <Text style={[styles.operatorChipText, selR && styles.severityChipActiveText]}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {campDraft.target === 'ville' && (
          <TextInput style={styles.settingInput} value={campDraft.targetVille} onChangeText={(v) => setCampDraft({ ...campDraft, targetVille: v })} placeholder="Ex : Ouagadougou" placeholderTextColor={COLORS.muted} />
        )}
        <Text style={styles.formHint}>Mode actif : uniquement la photo de chargement au démarrage (avec bouton « Passer »). Mode désactivé : la photo d'accueil en bannière. Le ciblage filtre qui reçoit la publicité.</Text>
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>5. Boutique à ouvrir quand le client touche la pub (option)</Text>
        <View style={styles.operatorWrap}>
          <TouchableOpacity style={[styles.operatorChip, !campDraft.linkBoutique && styles.severityChipActive]} onPress={() => setCampDraft({ ...campDraft, linkBoutique: '' })} activeOpacity={0.8}>
            <Text style={[styles.operatorChipText, !campDraft.linkBoutique && styles.severityChipActiveText]}>Aucun</Text>
          </TouchableOpacity>
          {(boutiquesAdmin || []).slice(0, 12).map((b) => {
            const selB = campDraft.linkBoutique === b.slug;
            return (
              <TouchableOpacity key={b.slug} style={[styles.operatorChip, selB && styles.severityChipActive]} onPress={() => setCampDraft({ ...campDraft, linkBoutique: b.slug })} activeOpacity={0.8}>
                <Text style={[styles.operatorChipText, selB && styles.severityChipActiveText]} numberOfLines={1}>{b.nom}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Titre</Text>
        <TextInput style={styles.settingInput} value={campDraft.title} onChangeText={(v) => setCampDraft({ ...campDraft, title: v })} placeholder="Ex : Vœux de Noël" placeholderTextColor={COLORS.muted} />
        <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Sous-titre</Text>
        <TextInput style={styles.settingInput} value={campDraft.sub} onChangeText={(v) => setCampDraft({ ...campDraft, sub: v })} placeholder="Ex : Promos de fin d'année" placeholderTextColor={COLORS.muted} />
        <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Période (optionnel — format AAAA-MM-JJ)</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput style={[styles.settingInput, { flex: 1 }]} value={campDraft.startAt} onChangeText={(v) => setCampDraft({ ...campDraft, startAt: v })} placeholder="Début" placeholderTextColor={COLORS.muted} />
          <TextInput style={[styles.settingInput, { flex: 1 }]} value={campDraft.endAt} onChangeText={(v) => setCampDraft({ ...campDraft, endAt: v })} placeholder="Fin" placeholderTextColor={COLORS.muted} />
        </View>
        <Text style={styles.formHint}>Sans date de début : visible dès l'activation. Une date de fin passée retire la bannière automatiquement (sauf réactivation).</Text>
        <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 6 }]} onPress={submitCamp}>
          <Text style={styles.miniBtnText}>➕ Créer la campagne</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sectWrap}>
        <Text style={styles.sectTitle}>Campagnes existantes</Text>
        {cams.length === 0 ? (
          <SectionEmpty icon="🎪" title="Aucune campagne" subtitle="Créez votre première campagne ci-dessus : elle apparaîtra en bannière sur l'accueil des clients." />
        ) : cams.map((cam) => (
          <View key={cam.id} style={styles.card}>
            <View style={styles.cardHead}>
              {cam.image ? (
                <Image source={{ uri: cam.image }} style={styles.campListImg} />
              ) : (
                <View style={[styles.campListImg, styles.campListImgNo]}>
                  <Text style={{ fontSize: 26 }}>{cam.emoji}</Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{cam.title || cam.mode}</Text>
                <Text style={styles.cardMeta}>{cam.emoji} {modeLabel(cam.mode)}{cam.theme ? ` · 🌟 ${cam.theme}` : ''}{cam.endAt ? ` · jusqu'au ${cam.endAt}` : ' · sans date'}{cam.target !== 'tous' ? ` · 🎯 ${cam.target === 'role' ? cam.targetRole : cam.targetVille}` : ''}</Text>
                <Text style={[styles.cardMeta, { marginTop: 2 }]}>👁 {cam.vues || 0} vue(s){cam.linkBoutique ? ' · 🏪 lien boutique' : ''}</Text>
                <Text style={[styles.cardMeta, { marginTop: 2 }, campaignVisible(cam) ? styles.campOn : styles.campOff]}>
                  {campaignVisible(cam)
                    ? '● En ligne — ouvrable (pub passable)'
                    : '○ Masquée' + (campaignHiddenReason(cam) === 'inactive' ? ' (inactive)' : campaignHiddenReason(cam) === 'debut' ? ` (début le ${cam.startAt})` : ` (fin dépassée le ${cam.endAt})`)}
                </Text>
              </View>
            </View>
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.miniBtn, cam.actif ? styles.miniNo : styles.miniOk, { flex: 1 }]} onPress={() => toggleCamp(cam)}>
                <Text style={styles.miniBtnText}>{cam.actif ? '■ Désactiver' : '▶ Activer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => delCamp(cam)}>
                <Text style={[styles.miniBtnText, styles.miniGhostText]}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.sectWrap}>
        <Text style={styles.sectTitle}>Publicité des vendeurs</Text>
        <Text style={styles.formHint}>Quand vous activez la publicité vendeur et que le seuil de comptes est atteint, chaque vendeur voit l'option « Faire de la publicité ». Ses demandes arrivent ici pour approbation.</Text>
        <View style={styles.card}>
          <View style={styles.rowBtns}>
            <TouchableOpacity
              style={[styles.miniBtn, plat.pubSellerEnabled ? styles.miniOk : styles.miniGhost, { flex: 1 }]}
              onPress={() => setPlat({ ...plat, pubSellerEnabled: !plat.pubSellerEnabled })}
            >
              <Text style={[styles.miniBtnText, plat.pubSellerEnabled ? null : styles.miniGhostText]}>
                {plat.pubSellerEnabled ? '✔ Publicité vendeur : OUVERTE' : '✖ Publicité vendeur : fermée'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 10 }} />
          <Text style={styles.fieldLabel}>Seuil de comptes vendeurs requis</Text>
          <TextInput
            style={styles.settingInput}
            keyboardType="numeric"
            value={String(plat.pubSellerMin ?? 50)}
            onChangeText={(v) => setPlat({ ...plat, pubSellerMin: v })}
            placeholder="50"
            placeholderTextColor={COLORS.muted}
          />
          <Text style={styles.formHint}>Actuellement : {vendeursCount} compte(s) vendeur enregistré(s).</Text>
          <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 10 }]} onPress={savePlat}>
            <Text style={styles.miniBtnText}>💾 Appliquer ces réglages</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectTitle, { marginTop: 10 }]}>Demandes en attente ({pubReq.length})</Text>
        {pubReq.length === 0 ? (
          <SectionEmpty icon="📭" title="Aucune demande" subtitle="Les vendeurs verront « Faire de la publicité » une fois la fonction activée — leurs demandes apparaîtront ici." />
        ) : pubReq.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHead}>
              {r.media ? (
                <Image source={{ uri: r.media }} style={styles.campListImg} />
              ) : (
                <View style={[styles.campListImg, styles.campListImgNo]}>
                  <Text style={{ fontSize: 26 }}>🖼️</Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{r.title || r.boutiqueNom || 'Sans titre'}</Text>
                <Text style={styles.cardMeta}>🧑 {r.sellerName} · {r.sellerPhone || '—'} · 🏪 {r.boutiqueNom || r.boutique}</Text>
                <Text style={styles.cardMeta}>⏱ {r.days} jour(s) · photo {r.theme ? `· 🌟 ${r.theme}` : ''}</Text>
              </View>
            </View>
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 1 }]} onPress={() => approverPub(r)}>
                <Text style={styles.miniBtnText}>✔ Valider et diffuser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => refuserPub(r)}>
                <Text style={styles.miniBtnText}>✖ Refuser</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

export function SectionDiffusion() {
  const { accounts, bTitle, setBTitle, bBody, setBBody, bRole, setBRole, requireCode, handleBroadcast } = useAdminCtx();
    const roles = ['Tous', 'Vendeur', 'Acheteur', 'Livreur'];
    const cibles = bRole === 'Tous'
      ? accounts.filter((a) => a.key)
      : accounts.filter((a) => a.key && a.role === bRole);
    return (
      <>
        <SectionHeader icon="📣" title="Diffusion (broadcast)" hint="Envoyez une notification à tous les vendeurs, acheteurs ou livreurs en un clic : annonce de mise à jour, promotion, changement de procédure…" />
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Titre de la notification</Text>
          <TextInput
            style={styles.settingInput}
            value={bTitle}
            onChangeText={setBTitle}
            placeholder="Ex : Mise à jour AfriMarket"
            placeholderTextColor={COLORS.muted}
          />
          <View style={{ height: 10 }} />
          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[styles.settingInput, { minHeight: 88 }]}
            value={bBody}
            onChangeText={setBBody}
            placeholder="Ex : Le compte de règlement des livreurs est le 06181574. Règle via USSD puis soumets ta preuve."
            placeholderTextColor={COLORS.muted}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.fieldLabel}>Destinataires</Text>
          <View style={styles.operatorWrap}>
            {roles.map((r) => {
              const active = bRole === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.operatorChip, active && styles.severityChipActive]}
                  onPress={() => setBRole(r)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.operatorChipText, active && styles.severityChipActiveText]}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.cardMeta}>{cibles.length} destinataire(s) concerné(s).</Text>
          <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 12 }]} onPress={() => requireCode('Diffusion (broadcast)', handleBroadcast)}>
            <Text style={styles.miniBtnText}>Envoyer la diffusion 📣</Text>
          </TouchableOpacity>
        </View>
      </>
    );
}

export function SectionRapports() {
  const { report, handleExportRapport, buildMonths } = useAdminCtx();
    const r = report;
    const months = buildMonths();
    return (
      <>
        <SectionHeader icon="📊" title="Rapports & statistiques" hint="Indicateurs calculés à partir des paiements, commandes et courses enregistrés. Actualisés à chaque ouverture de la console. Exportez le rapport en CSV depuis cette section." />
        {!r ? (
          <SectionEmpty icon="📊" title="Données indisponibles" subtitle="Les statistiques apparaîtront dès les premières ventes." />
        ) : (
          <>
            <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginBottom: 6 }]} onPress={handleExportRapport}>
              <Text style={styles.miniBtnText}>Exporter le rapport (CSV)</Text>
            </TouchableOpacity>
            <View style={styles.feeRow}>
              <View style={styles.feeCell}>
                <Text style={styles.feeValue}>{r.paidCount}</Text>
                <Text style={styles.feeLabel}>Paiements reçus</Text>
              </View>
              <View style={styles.feeCell}>
                <Text style={styles.feeValue}>{fcfa(r.totalVentes)}</Text>
                <Text style={styles.feeLabel}>Total ventes</Text>
              </View>
              <View style={styles.feeCell}>
                <Text style={styles.feeValue}>{r.ordersCount}</Text>
                <Text style={styles.feeLabel}>Commandes</Text>
              </View>
            </View>
            <View style={styles.feeRow}>
              <View style={styles.feeCell}>
                <Text style={styles.feeValue}>{fcfa(r.totalFrais)}</Text>
                <Text style={styles.feeLabel}>Frais collectés</Text>
              </View>
              <View style={styles.feeCell}>
                <Text style={styles.feeValue}>{fcfa(r.totalCommissions)}</Text>
                <Text style={styles.feeLabel}>Compensations</Text>
              </View>
              <View style={styles.feeCell}>
                <Text style={styles.feeValue}>{r.coursesLivrees}/{r.coursesDone || 0}</Text>
                <Text style={styles.feeLabel}>Livraisons finalisées</Text>
              </View>
            </View>

            <Text style={styles.subSection}>Ventes des 7 derniers jours</Text>
            <View style={styles.card}>
              {r.days.map((d) => (
                <View key={d.key} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{d.label}</Text>
                  <View style={styles.dayBarWrap}>
                    <View style={[styles.dayBar, { width: r.maxDay ? Math.max(5, (d.count / r.maxDay) * 100) + '%' : '5%' }]}>
                      {d.count > 0 ? <Text style={styles.dayBarText}>{d.count}</Text> : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {months.length > 0 && (
              <>
                <Text style={styles.subSection}>Ventes par mois ({months.length} dernier(s))</Text>
                <View style={styles.card}>
                  {months.map((m) => (
                    <View key={m.key} style={styles.dayRow}>
                      <Text style={styles.dayLabel}>{m.key.slice(2)}/{m.key.slice(0, 4)}</Text>
                      <View style={styles.monthBarWrap}>
                        <Text style={styles.monthBarText}>{fcfa(m.total)} · {m.count} paiement(s)</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.subSection}>Top produits</Text>
            {r.topProduits.length === 0 ? (
              <SectionEmpty icon="📦" title="Aucune vente" subtitle="Les meilleures ventes apparaîtront ici." />
            ) : r.topProduits.map((p, i) => (
              <View key={String(p.id || i)} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>#{i + 1} {p.title}</Text>
                    <Text style={styles.cardMeta}>{p.qty} vendu(s) · {fcfa(p.total)}</Text>
                  </View>
                </View>
              </View>
            ))}

            <Text style={styles.subSection}>Top vendeurs (CA payé)</Text>
            {r.topVendeurs.length === 0 ? (
              <SectionEmpty icon="👥" title="Aucune vente" subtitle="Les meilleurs vendeurs apparaîtront ici." />
            ) : r.topVendeurs.map((v, i) => (
              <View key={v.key} style={styles.card}>
                <Text style={styles.cardTitle}>#{i + 1} {v.key}</Text>
                <Text style={styles.cardMeta}>{v.count} paiement(s) · {fcfa(v.total)}</Text>
              </View>
            ))}

            <Text style={styles.subSection}>Répartition par opérateur</Text>
            <View style={styles.operatorWrap}>
              {r.operators.length === 0 ? (
                <Text style={styles.cardMeta}>Aucun paiement enregistré.</Text>
              ) : r.operators.map(([k, n]) => (
                <View key={k} style={styles.operatorChip}>
                  <Text style={styles.operatorChipText}>{k} : {n} paiement(s)</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </>
    );
}

export function SectionOutils() {
  const { requireCode, handleExport, handleReset } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🧰" title="Outils d'administration" hint="Exportez une sauvegarde complète des données de l'appareil ou réinitialisez l'environnement de démonstration." />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📦 Export des données</Text>
        <Text style={styles.cardMeta}>Génère un fichier JSON de toutes les clés « afrimarket_* » stockées sur cet appareil (comptes, boutiques, produits, commandes, paiements…).</Text>
        <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 12 }]} onPress={handleExport}>
          <Text style={styles.miniBtnText}>Exporter (JSON)</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🗑️ Réinitialiser la démo</Text>
        <Text style={styles.cardMeta}>Efface TOUTES les données de l'application pour repartir de zéro. Irréversible — pensez à exporter avant.</Text>
        <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { alignSelf: 'flex-start', marginTop: 12 }]} onPress={() => requireCode('Réinitialiser la démo', handleReset)}>
          <Text style={styles.miniBtnText}>Réinitialiser</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export function SectionCompta() {
  const { frais, settings, setSettings, commissions, handleSaveCommission } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="📊" title="Frais collectés" hint="Suivi des frais de paiement : part AfriMarket (marge opérateur) et montants nets reversés. Données actualisées à l'ouverture de la console." />
      {!frais || frais.count === 0 ? (
        <SectionEmpty icon="💼" title="Aucune opération facturée" subtitle="Les frais apparaîtront dès le premier paiement effectué." />
      ) : (
        <>
          <View style={styles.feeRow}>
            <View style={styles.feeCell}>
              <Text style={styles.feeValue}>{fcfa(frais.total)}</Text>
              <Text style={styles.feeLabel}>Frais collectés</Text>
            </View>
            <View style={styles.feeCell}>
              <Text style={styles.feeValue}>{fcfa(frais.totalNet)}</Text>
              <Text style={styles.feeLabel}>Net vendeurs</Text>
            </View>
            <View style={styles.feeCell}>
              <Text style={styles.feeValue}>{fcfa(frais.totalPayes)}</Text>
              <Text style={styles.feeLabel}>Payé acheteurs</Text>
            </View>
          </View>
          <Text style={styles.subSection}>Par opérateur</Text>
          <View style={styles.operatorWrap}>
            {frais.parOperateur.map((o) => (
              <View key={o.operatorKey} style={styles.operatorChip}>
                <Text style={styles.operatorChipText}>{getProvider(o.operatorKey).brand} : {fcfa(o.total)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.subSection}>Dernières opérations ({Math.min(frais.entries.length, 6)})</Text>
          {frais.entries.slice(0, 6).map((f) => (
            <View key={f.id} style={styles.card}>
              <Text style={styles.cardTitle}>{f.orderId} · {getProvider(f.operatorKey).brand}</Text>
              <Text style={styles.cardMeta}>
                Marchandise {fcfa(f.montant)} + frais {fcfa(f.frais)} = {fcfa(f.total)} · {fmtDate(f.createdAt)}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={styles.divider} />
      <SectionHeader icon="⚙️" title="Règle de compensation vendeur" hint={`Compensation prélevée sur le vendeur à partir de la Nième commande payée (seuil). Montant = taux (%) ou forfait fixe (le plus élevé des deux). Seuil 0 = désactivé.`}/>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingField}>
            <Text style={styles.fieldLabel}>Seuil (n° commande payée)</Text>
            <TextInput
              style={styles.settingInput}
              keyboardType="numeric"
              placeholder="ex : 20"
              placeholderTextColor={COLORS.muted}
              value={String(settings.seuil)}
              onChangeText={(v) => setSettings((s) => ({ ...s, seuil: v }))}
            />
          </View>
          <View style={styles.settingField}>
            <Text style={styles.fieldLabel}>Taux (%)</Text>
            <TextInput
              style={styles.settingInput}
              keyboardType="numeric"
              placeholder="ex : 3"
              placeholderTextColor={COLORS.muted}
              value={String(settings.taux)}
              onChangeText={(v) => setSettings((s) => ({ ...s, taux: v }))}
            />
          </View>
          <View style={styles.settingField}>
            <Text style={styles.fieldLabel}>Forfait (FCFA)</Text>
            <TextInput
              style={styles.settingInput}
              keyboardType="numeric"
              placeholder="ex : 300"
              placeholderTextColor={COLORS.muted}
              value={String(settings.forfait)}
              onChangeText={(v) => setSettings((s) => ({ ...s, forfait: v }))}
            />
          </View>
        </View>
        <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 14 }]} onPress={handleSaveCommission}>
          <Text style={styles.miniBtnText}>Enregistrer la règle</Text>
        </TouchableOpacity>
        <View style={[styles.operatorWrap, { marginTop: 14, marginBottom: 0 }]}>
          <View style={styles.operatorChip}>
            <Text style={styles.operatorChipText}>Total commissions prélevées : {fcfa(commissions.total)} · {commissions.count} vente(s)</Text>
          </View>
        </View>
      </View>
    </>
  );
}

export function SectionContrats() {
  const { contracts, handleResendContract, pendingContracts } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="📄" title="Contrats de partenariat" count={pendingContracts} hint={`Envoi automatique dès ${SEUIL_CONTRAT} ventes payées. Relancez les vendeurs qui n'ont pas encore accepté.`} />
      {contracts.length === 0 ? (
        <SectionEmpty icon="📄" title="Aucun contrat envoyé" subtitle={`L'envoi automatique démarre à ${SEUIL_CONTRAT} ventes payées par vendeur.`} />
      ) : contracts.map((c) => (
        <View key={c.sellerKey} style={styles.card}>
          <View style={styles.cardHead}>
            <View>
              <Text style={styles.cardTitle}>{c.sellerKey}</Text>
              <Text style={styles.cardMeta}>Envoyé le {fmtDate(c.sentAt)} · {c.paidCountAtSend} vente(s) payée(s)</Text>
            </View>
            <View style={[styles.statusChip, c.acceptedAt && styles.statusChipOk]}>
              <View style={[styles.statusDot, { backgroundColor: c.acceptedAt ? STATUS_CHIP_OK.dot : STATUS_CHIP_WARN.dot }]} />
              <Text style={styles.statusChipText}>{c.acceptedAt ? 'Accepté' : 'En attente'}</Text>
            </View>
          </View>
          <Text style={[styles.cardMeta, { fontWeight: '800', color: c.acceptedAt ? COLORS.kola : COLORS.piment, marginTop: 6 }]}>
            {c.acceptedAt ? `✓ Accepté le ${fmtDate(c.acceptedAt)}` : '⏳ Le vendeur n\'a pas encore accepté'}
          </Text>
          {!c.acceptedAt && (
            <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 10 }]} onPress={() => handleResendContract(c.sellerKey)}>
              <Text style={styles.miniBtnText}>Envoyer un rappel</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </>
  );
}

