import { SectionEmpty, SectionHeader } from '../sectionLayout';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { COLORS } from '../../constants/theme';
import { fcfa } from '../../lib/cart';
import { fmtDate, STATUS_CHIP_ERR, STATUS_CHIP_OK, STATUS_CHIP_WARN } from '../meta';
import { useAdminCtx } from '../AdminContext';

export function SectionProduits() {
  const { prodQuery, setProdQuery, modLog, openModeration, visibleProducts } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🛍️" title="Modération des produits" count={visibleProducts.length} hint="Supprimez les produits inappropriés, illicites ou interdits. Le motif saisi avant suppression est notifié au vendeur concerné." />
      <TextInput
        style={[styles.settingInput, { marginBottom: 12 }]}
        value={prodQuery}
        onChangeText={setProdQuery}
        placeholder="Rechercher un produit, une boutique, un vendeur…"
        placeholderTextColor={COLORS.muted}
      />
      {visibleProducts.length === 0 ? (
        <SectionEmpty icon="🛍️" title="Aucun produit à modérer" subtitle="Les produits des boutiques apparaîtront ici." />
      ) : visibleProducts.map((p) => (
        <View key={String(p.id)} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{p.title}</Text>
              <Text style={styles.cardMeta}>🏪 {p.boutiqueName || p.boutique_nom || 'Boutique'}</Text>
              <Text style={styles.cardMeta}>Vendeur : {p.ownerKey || (p.boutique_id ? 'Boutique Supabase' : '—')}</Text>
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

      <View style={styles.divider} />
      <SectionHeader icon="📁" title="Historique de modération" count={modLog.length} hint="Trace des suppressions de produits décidées par la modération." />
      {modLog.length === 0 ? (
        <SectionEmpty icon="📁" title="Aucune suppression" subtitle="Les décisions de modération apparaîtront ici." />
      ) : modLog.slice(0, 20).map((m) => (
        <View key={m.id} style={styles.card}>
          <Text style={styles.cardTitle}>{m.title}</Text>
          <Text style={styles.cardMeta}>🏪 {m.boutique || '—'} · Vendeur {m.ownerKey || '—'}</Text>
          <Text style={[styles.cardMeta, { color: COLORS.piment, fontWeight: '700', marginTop: 4 }]}>Motif : {m.reason || '—'}</Text>
          <Text style={styles.cardMeta}>Par {m.by || 'Admin'} · {fmtDate(m.at)}</Text>
        </View>
      ))}
    </>
  );
}

export function SectionCommandes() {
  const { orders, ordersQ, setOrdersQ, paymentsAll, resoudreCommande } = useAdminCtx();
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const q = norm(ordersQ);
    const payIdx = {};
    for (const p of paymentsAll) payIdx[p.orderId] = p;
    const filtered = orders.filter((o) => {
      if (!q) return true;
      const hay = norm([
        o.numero, o.id, o.client?.name, o.client?.phone, o.clientKey,
        ...(o.items || []).map((i) => i.title || i.name),
      ].join(' '));
      return hay.includes(q);
    });
    return (
      <>
        <SectionHeader icon="🧾" title="Toutes les commandes" count={orders.length} hint="Recherchez par numéro, client, téléphone ou produit. Pour un paiement en escrow (payé), vous pouvez décider un remboursement ou une libération des fonds." />
        <TextInput
          style={[styles.settingInput, { marginBottom: 12 }]}
          value={ordersQ}
          onChangeText={setOrdersQ}
          placeholder="Rechercher (numéro, client, téléphone, produit)…"
          placeholderTextColor={COLORS.muted}
        />
        {filtered.length === 0 ? (
          <SectionEmpty icon="🧾" title="Aucune commande" subtitle="Les commandes des acheteurs apparaîtront ici." />
        ) : filtered.slice(0, 40).map((o) => {
          const p = payIdx[o.id];
          const itemsSum = (o.items || []).reduce((s, it) => s + (Number(it.qty) || 1), 0);
          return (
            <View key={o.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{o.numero}</Text>
                  <Text style={styles.cardMeta}>{o.client?.name || o.clientKey} · {o.client?.phone || '—'} · {fmtDate(o.created_at)}</Text>
                  <Text style={styles.cardMeta}>
                    {itemsSum} article(s) · {fcfa(o.total)}
                    {o.coupon ? ` · promo ${o.coupon.code} (-${fcfa(o.coupon.remise)})` : ''}
                  </Text>
                </View>
                <View style={styles.statusChip}>
                  <View style={[styles.statusDot, { backgroundColor: o.status === 'livree' ? STATUS_CHIP_OK.dot : STATUS_CHIP_WARN.dot }]} />
                  <Text style={styles.statusChipText}>{o.status === 'livree' ? 'Livrée' : 'En cours'}</Text>
                </View>
              </View>
              {p ? (
                <>
                  <Text style={styles.cardMeta}>
                    Paiement : {p.operator} · {fcfa(p.total || (p.montant + (p.frais || 0)))}
                    {' ('}{p.status === 'paye' ? 'en escrow' : p.status === 'dispute' ? 'litige' : p.status === 'rembourse' || p.status === 'rembourse_admin' ? 'remboursé' : p.status === 'libere_admin' ? 'libéré (admin)' : p.status === 'confirme' ? 'libéré' : p.status}{')'} · {p.reference}
                  </Text>
                  {p.status === 'paye' && (
                    <View style={styles.rowBtns}>
                      <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => resoudreCommande(o.id, 'rembourse')}>
                        <Text style={styles.miniBtnText}>Rembourser</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { flex: 1 }]} onPress={() => resoudreCommande(o.id, 'libere')}>
                        <Text style={styles.miniBtnText}>Libérer au vendeur</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.cardMeta}>Paiement : non enregistré.</Text>
              )}
            </View>
          );
        })}
      </>
    );
}

export function SectionCoupons() {
  const { coupons, cCode, setCCode, cType, setCType, cValue, setCValue, cMaxUses, setCMaxUses, handleCreateCoupon, handleToggleCoupon, handleDeleteCoupon } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🎫" title="Coupons & codes promo" count={coupons.length} hint="Créez des codes de remise (pourcentage ou montant) avec un plafond d'utilisations. Le client saisit le code au moment du paiement." />
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Code (ex : BIENVENUE-10)</Text>
        <TextInput
          style={styles.settingInput}
          value={cCode}
          onChangeText={setCCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="BIENVENUE-10"
          placeholderTextColor={COLORS.muted}
        />
        <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Type de remise</Text>
        <View style={styles.operatorWrap}>
          {[{ key: 'percent', label: 'Pourcentage (%)' }, { key: 'amount', label: 'Montant (FCFA)' }].map((t) => {
            const active = cType === t.key;
            return (
              <TouchableOpacity key={t.key} style={[styles.operatorChip, active && styles.severityChipActive]} onPress={() => setCType(t.key)} activeOpacity={0.8}>
                <Text style={[styles.operatorChipText, active && styles.severityChipActiveText]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.fieldLabel}>Valeur</Text>
        <TextInput
          style={styles.settingInput}
          keyboardType="numeric"
          value={cValue}
          onChangeText={setCValue}
          placeholder={cType === 'percent' ? '10' : '1000'}
          placeholderTextColor={COLORS.muted}
        />
        <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Nombre max d'utilisations</Text>
        <TextInput
          style={styles.settingInput}
          keyboardType="numeric"
          value={cMaxUses}
          onChangeText={setCMaxUses}
          placeholder="100"
          placeholderTextColor={COLORS.muted}
        />
        <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 14 }]} onPress={handleCreateCoupon}>
          <Text style={styles.miniBtnText}>Créer le coupon</Text>
        </TouchableOpacity>
      </View>
      {coupons.length === 0 ? (
        <SectionEmpty icon="🎫" title="Aucun coupon" subtitle="Les codes promo créés apparaîtront ici." />
      ) : coupons.map((c) => (
        <View key={c.id} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>🎟️ {c.code}</Text>
              <Text style={styles.cardMeta}>
                {c.type === 'percent' ? `-${c.value}%` : `-${fcfa(c.value)}`} · {c.uses}/{c.maxUses} utilisations
              </Text>
              <Text style={styles.cardMeta}>Créé le {fmtDate(c.at)}</Text>
            </View>
            <View style={[styles.statusChip, c.actif && styles.statusChipOk]}>
              <View style={[styles.statusDot, { backgroundColor: c.actif ? COLORS.kola : COLORS.muted }]} />
              <Text style={styles.statusChipText}>{c.actif ? 'Actif' : 'Désactivé'}</Text>
            </View>
          </View>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.miniBtn, c.actif ? styles.miniNo : styles.miniOk, { flex: 1 }]} onPress={() => handleToggleCoupon(c.code)}>
              <Text style={styles.miniBtnText}>{c.actif ? 'Désactiver' : 'Activer'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => handleDeleteCoupon(c.code)}>
              <Text style={[styles.miniBtnText, styles.miniGhostText]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );
}

export function SectionOperateurs() {
  const { providers, updProvider, saveProviders } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🔌" title="Opérateurs Mobile Money" hint="Activez ou désactivez un opérateur dans l'écran de paiement et ajustez son taux de frais (%). Si tous sont désactivés, la liste par défaut est réactivée par sécurité." />
      {providers.map((p) => (
        <View key={p.key} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{p.icon} {p.brand}</Text>
              <Text style={styles.cardMeta}>Taux de base : {p.baseFeePct}%</Text>
            </View>
            <View style={[styles.statusChip, p.actif && styles.statusChipOk]}>
              <View style={[styles.statusDot, { backgroundColor: p.actif ? COLORS.kola : COLORS.muted }]} />
              <Text style={styles.statusChipText}>{p.actif ? 'Actif' : 'Désactivé'}</Text>
            </View>
          </View>
          <View style={[styles.settingRow, { alignItems: 'flex-end' }]}>
            <View style={styles.settingField}>
              <Text style={styles.fieldLabel}>Taux de frais (%)</Text>
              <TextInput
                style={styles.settingInput}
                keyboardType="numeric"
                value={p.feePct}
                onChangeText={(v) => updProvider(p.key, { feePct: v })}
                placeholder={String(p.baseFeePct)}
                placeholderTextColor={COLORS.muted}
              />
            </View>
            <TouchableOpacity
              style={[styles.miniBtn, p.actif ? styles.miniNo : styles.miniOk, { marginBottom: 2 }]}
              onPress={() => updProvider(p.key, { actif: !p.actif })}
              activeOpacity={0.85}
            >
              <Text style={styles.miniBtnText}>{p.actif ? 'Désactiver' : 'Activer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 6 }]} onPress={saveProviders}>
        <Text style={styles.miniBtnText}>Enregistrer les opérateurs</Text>
      </TouchableOpacity>
    </>
  );
}

export function SectionLivraisons() {
  const { zones, zVille, setZVille, zFrais, setZFrais, addZoneItem, deleteZoneItem } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="📍" title="Zones & frais de livraison" count={zones.length} hint="Définissez les villes desservies et le montant de livraison. Le client choisit sa zone avant le paiement : les frais sont ajoutés au total de la commande." />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingField}>
            <Text style={styles.fieldLabel}>Ville</Text>
            <TextInput
              style={styles.settingInput}
              value={zVille}
              onChangeText={setZVille}
              placeholder="ex : Ouagadougou"
              placeholderTextColor={COLORS.muted}
            />
          </View>
          <View style={styles.settingField}>
            <Text style={styles.fieldLabel}>Frais (FCFA)</Text>
            <TextInput
              style={styles.settingInput}
              keyboardType="numeric"
              value={zFrais}
              onChangeText={setZFrais}
              placeholder="ex : 1500"
              placeholderTextColor={COLORS.muted}
            />
          </View>
        </View>
        <TouchableOpacity style={[styles.miniBtn, styles.miniOk, { alignSelf: 'flex-start', marginTop: 14 }]} onPress={addZoneItem}>
          <Text style={styles.miniBtnText}>Ajouter la zone</Text>
        </TouchableOpacity>
      </View>
      {zones.length === 0 ? (
        <SectionEmpty icon="📍" title="Aucune zone" subtitle="Créez votre première zone de livraison, ou laissez vide pour ne pas proposer de frais de livraison." />
      ) : zones.map((z) => (
        <View key={z.id} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>📌 {z.ville}</Text>
              <Text style={styles.cardMeta}>{fcfa(Number(z.frais) || 0)} de frais de livraison</Text>
            </View>
          </View>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => deleteZoneItem(z)}>
              <Text style={styles.miniBtnText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );
}

export function SectionAvis() {
  const { reviews, handleDeleteReview } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🗣️" title="Avis clients" count={reviews.length} hint="Modérez les avis inappropriés (insultes, hors sujet, faux avis). La suppression retire l'avis de la fiche produit." />
      {reviews.length === 0 ? (
        <SectionEmpty icon="🗣️" title="Aucun avis" subtitle="Les avis laissés par les clients sur les produits apparaîtront ici." />
      ) : reviews.slice(0, 40).map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{r.productTitle}</Text>
              <Text style={styles.cardMeta}>{r.boutique || '—'} · {r.nom || 'Client'} · {r.note ? '★'.repeat(Math.max(0, Math.min(5, r.note))) : 'Sans note'} · {fmtDate(r.created_at)}</Text>
            </View>
          </View>
          {r.comment ? <Text style={styles.ticketMsg}>« {r.comment} »</Text> : null}
          <View style={styles.rowBtns}>
            <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => handleDeleteReview(r)}>
              <Text style={styles.miniBtnText}>Supprimer l'avis</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );
}

export function SectionAvant() {
  const { prodQuery, setProdQuery, featured, boutiquesAdmin, basculerBoutiqueAvant, basculerProduitAvant, visibleProducts } = useAdminCtx();
    const featuredSlug = new Set(featured.boutiques);
    const featuredId = new Set(featured.produits);
    const fCount = featured.boutiques.length + featured.produits.length;
    return (
      <>
        <SectionHeader icon="⭐" title="Boutiques & produits en avant" count={fCount} hint="Les boutiques « Sélectionnées » s'affichent en tête du catalogue avec un badge ⭐. Mettez en avant les produits que vous souhaitez promouvoir." />
        <Text style={styles.subSection}>Boutiques ({boutiquesAdmin.length})</Text>
        {boutiquesAdmin.length === 0 ? (
          <SectionEmpty icon="🏪" title="Aucune boutique" subtitle="Créez des boutiques depuis l'application pour les gérer ici." />
        ) : boutiquesAdmin.map((b) => {
          const active = featuredSlug.has(b.slug);
          return (
            <View key={b.slug || b.nom} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{b.nom}</Text>
                  <Text style={styles.cardMeta}>{b.ville || '—'}</Text>
                </View>
                <View style={[styles.statusChip, active && styles.statusChipOk]}>
                  <View style={[styles.statusDot, { backgroundColor: active ? COLORS.or : COLORS.muted }]} />
                  <Text style={styles.statusChipText}>{active ? 'En avant ⭐' : 'Standard'}</Text>
                </View>
              </View>
              <View style={styles.rowBtns}>
                <TouchableOpacity style={[styles.miniBtn, active ? styles.miniGhost : styles.miniOk, { flex: 1 }]} onPress={() => basculerBoutiqueAvant(b.slug)}>
                  <Text style={[styles.miniBtnText, active && styles.miniGhostText]}>{active ? 'Retirer ⭐' : 'Mettre en avant'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={styles.divider} />
        <Text style={styles.subSection}>Produits ({visibleProducts.length})</Text>
        <TextInput
          style={[styles.settingInput, { marginBottom: 12 }]}
          value={prodQuery}
          onChangeText={setProdQuery}
          placeholder="Rechercher un produit à mettre en vedette…"
          placeholderTextColor={COLORS.muted}
        />
        {visibleProducts.length === 0 ? (
          <SectionEmpty icon="🛍️" title="Aucun produit" subtitle="Les produits des boutiques apparaîtront ici." />
        ) : visibleProducts.slice(0, 30).map((p) => {
          const active = featuredId.has(String(p.id));
          return (
            <View key={String(p.id)} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{p.title}</Text>
                  <Text style={styles.cardMeta}>🏪 {p.boutiqueName || p.boutique_nom || 'Boutique'}</Text>
                </View>
                <View style={[styles.statusChip, active && styles.statusChipOk]}>
                  <View style={[styles.statusDot, { backgroundColor: active ? COLORS.or : COLORS.muted }]} />
                  <Text style={styles.statusChipText}>{active ? 'Vedette' : 'Standard'}</Text>
                </View>
              </View>
              <View style={styles.rowBtns}>
                <TouchableOpacity style={[styles.miniBtn, active ? styles.miniGhost : styles.miniOk, { flex: 1 }]} onPress={() => basculerProduitAvant(p.id)}>
                  <Text style={[styles.miniBtnText, active && styles.miniGhostText]}>{active ? 'Retirer ⭐' : '⭐ Mettre en vedette'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </>
    );
}

export function SectionSignalements() {
  const { reports, modererReport, ignorerReport, newReports } = useAdminCtx();
  return (
    <>
      <SectionHeader icon="🚨" title="Signalements clients (produits)" count={newReports} hint="Les clients signalent un produit depuis sa fiche (🚩). Modérez-le — le motif sera notifié au vendeur — ou ignorez le signalement." />
      {reports.length === 0 ? (
        <SectionEmpty icon="🚨" title="Aucun signalement" subtitle="Les signalements envoyés par les clients apparaîtront ici." />
      ) : reports.map((rep) => (
        <View key={rep.id} style={styles.card}>
          <View style={styles.cardHead}>
            {rep.img ? (
              <Image source={{ uri: rep.img }} style={[styles.thumb, { marginRight: 10 }]} />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty, { marginRight: 10 }]}><Text>📦</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{rep.title}</Text>
              <Text style={styles.cardMeta}>Signalé par {rep.reporterName || 'Client'} · {fmtDate(rep.at)}</Text>
              <Text style={[styles.cardMeta, { color: COLORS.piment, fontWeight: '700', marginTop: 2 }]}>Motif : {rep.motif || '—'}</Text>
            </View>
            {rep.status === 'nouveau' ? (
              <View style={styles.statusChip}><View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_ERR.dot }]} /><Text style={styles.statusChipText}>Nouveau</Text></View>
            ) : rep.status === 'ignore' ? (
              <View style={styles.statusChip}><View style={[styles.statusDot, { backgroundColor: STATUS_CHIP_OK.dot }]} /><Text style={styles.statusChipText}>Ignoré</Text></View>
            ) : (
              <View style={[styles.statusChip, styles.statusChipOk]}><View style={[styles.statusDot, { backgroundColor: COLORS.piment }]} /><Text style={styles.statusChipText}>Traité</Text></View>
            )}
          </View>
          {rep.status === 'nouveau' && (
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.miniBtn, styles.miniNo, { flex: 1 }]} onPress={() => modererReport(rep)}>
                <Text style={styles.miniBtnText}>Modérer le produit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.miniBtn, styles.miniGhost, { flex: 1 }]} onPress={() => ignorerReport(rep)}>
                <Text style={[styles.miniBtnText, styles.miniGhostText]}>Ignorer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </>
  );
}

