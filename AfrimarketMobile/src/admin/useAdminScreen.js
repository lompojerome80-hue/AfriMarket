import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { getCurrentUser, getAllDossiers, setDossierStatus, ROLE_ADMIN } from '../lib/auth';
import { getPendingSettlements, approveSettlement, rejectSettlement } from '../lib/deliveries';
import { getAllPaiements, resolveDispute, getFraisCollectes, getCommissionSettings, setCommissionSettings, getCommissionsCollectees, getProviderConfigForAdmin, saveProviderSettings, adminResolvePayment } from '../lib/payments';
import { getAllTickets, closeTicket } from '../lib/support';
import { getAllContractsStatus, resendContractNotification, SEUIL_CONTRAT } from '../lib/contract';
import { pushNotification } from '../lib/notifications';
import { getAllOrders } from '../lib/orders';
import { getCoupons, createCoupon, toggleCoupon, deleteCoupon } from '../lib/coupons';
import { getAdminInfos, saveAdminInfos, getAccountFlags, addFlag, notifyFlag, liftFlag, closeFlaggedAccount, reopenFlaggedAccount, deleteAccountByKey, getModerationLog, getAccountsWithFlags, getSellerBoutiqueNames, broadcastNotification, getFeatured, toggleFeaturedBoutique, toggleFeaturedProduct, getBoutiquesForAdmin, getProductReports, setProductReportStatus, getAllDuesOverview, getAdminReport, exportAllData, resetDemoData } from '../lib/admin';
import { getAllProducts, adminDeleteProduct, getAllReviews, deleteProductReview } from '../lib/products';
import { getPlatformSettings, savePlatformSettings, getZones, addZone, deleteZone, verifyAdminCode } from '../lib/settings';
import { getAuditLog, logAudit } from '../lib/audit';
import { getNotesForAccount, addAccountNote } from '../lib/notes';
import { getCampaigns, createCampaignWithImage, setCampaignActive, deleteCampaign } from '../lib/campaigns';
import { getPubRequests, approvePubRequest, deletePubRequest } from '../lib/pub';
import { fcfa } from '../lib/cart';
import { COLORS } from '../constants/theme';
export function useAdminScreen() {
  const [admin, setAdmin] = useState(null);
  const [section, setSection] = useState('apercu');
  const [menuOpen, setMenuOpen] = useState(false);

  const [dossiers, setDossiers] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [litiges, setLitiges] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [advice, setAdvice] = useState({});
  const [frais, setFrais] = useState(null);
  const [settings, setSettings] = useState({ seuil: 0, taux: 0, forfait: 0 });
  const [commissions, setCommissions] = useState({ total: 0, count: 0 });
  const [contracts, setContracts] = useState([]);
  const [preview, setPreview] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [infos, setInfos] = useState([]);
  const [infoTitre, setInfoTitre] = useState('');
  const [infoValeur, setInfoValeur] = useState('');
  const [products, setProducts] = useState([]);
  const [prodQuery, setProdQuery] = useState('');
  const [accounts, setAccounts] = useState([]);
  const vendeursCount = accounts.filter((a) => a.role === 'Vendeur').length;
  const [flags, setFlags] = useState([]);
  const [modLog, setModLog] = useState([]);
  const [reason, setReason] = useState('');
  const [reasonModal, setReasonModal] = useState(null);
  const [flagModal, setFlagModal] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagSeverity, setFlagSeverity] = useState('avertissement');
  const [viewCompte, setViewCompte] = useState(null);
  const [viewProducts, setViewProducts] = useState([]);
  const [viewBoutiques, setViewBoutiques] = useState([]);

  const [featured, setFeatured] = useState({ boutiques: [], produits: [] });
  const [boutiquesAdmin, setBoutiquesAdmin] = useState([]);
  const [reports, setReports] = useState([]);
  const [duesOv, setDuesOv] = useState([]);
  const [report, setReport] = useState(null);
  const [bTitle, setBTitle] = useState('');
  const [bBody, setBBody] = useState('');
  const [bRole, setBRole] = useState('Tous');
  const [orders, setOrders] = useState([]);
  const [ordersQ, setOrdersQ] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [cCode, setCCode] = useState('');
  const [cType, setCType] = useState('percent');
  const [cValue, setCValue] = useState('');
  const [cMaxUses, setCMaxUses] = useState('');
  const [providers, setProviders] = useState([]);
  const [paymentsAll, setPaymentsAll] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [zones, setZones] = useState([]);
  const [zVille, setZVille] = useState('');
  const [zFrais, setZFrais] = useState('');
  const [reviews, setReviews] = useState([]);
  const [pubReq, setPubReq] = useState([]);
  const [plat, setPlat] = useState({ minOrder: 0, homeMessage: '', featuredCarousel: true, adminCode: '', pubSellerEnabled: false, pubSellerMin: 50 });
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [codeOk, setCodeOk] = useState(false);
  const [codePrompt, setCodePrompt] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [cams, setCams] = useState([]);
  const [campDraft, setCampDraft] = useState({ mode: 'special', emoji: '⭐', image: null, imageSplash: null, theme: '', target: 'tous', targetRole: '', targetVille: '', linkBoutique: '', title: '', sub: '', startAt: '', endAt: '' });
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!viewCompte) {
        setViewProducts([]);
        setViewBoutiques([]);
        return;
      }
      const names = await getSellerBoutiqueNames(viewCompte.key);
      if (!mounted) return;
      setViewBoutiques(names);
      setViewProducts(
        products.filter(
          (p) =>
            String(p.ownerKey || '') === String(viewCompte.key) ||
            names.includes(p.boutiqueName) ||
            names.includes(p.boutique_nom)
        )
      );
    })();
    return () => { mounted = false; };
  }, [viewCompte, products]);
  const reload = useCallback(async () => {
    const u = await getCurrentUser();
    setAdmin(u);
    if (!u || u.role !== ROLE_ADMIN) return;
    const [d, s, l, t, fr, st, co, ct] = await Promise.all([
      (await getAllDossiers()).filter((x) => x.docStatus !== 'verifie'),
      (await getPendingSettlements()).filter((x) => x.status === 'en_attente' && x.montant > 0),
      (await getAllPaiements()).filter((x) => x.status === 'dispute'),
      (await getAllTickets()).filter((x) => x.status === 'ouvert'),
      getFraisCollectes(),
      getCommissionSettings(),
      getCommissionsCollectees(),
      getAllContractsStatus(),
    ]);
    setDossiers(d);
    setSettlements(s);
    setLitiges(l);
    setTickets(t);
    setFrais(fr);
    setSettings(st);
    setCommissions(co);
    setContracts(ct);
    const extras = await Promise.all([
      getAdminInfos(),
      getAllProducts(),
      getAccountsWithFlags(),
      getAccountFlags(),
      getModerationLog(),
      getFeatured(),
      getBoutiquesForAdmin(),
      getProductReports(),
      getAllDuesOverview(),
      getAdminReport(),
      getAllOrders(),
      getCoupons(),
      getProviderConfigForAdmin(),
      getAllPaiements(),
      getAuditLog(),
      getZones(),
      getAllReviews(),
      getPlatformSettings(),
      getCampaigns(),
      getPubRequests(),
    ]);
    setInfos(extras[0]);
    setProducts(extras[1]);
    setAccounts(extras[2]);
    setFlags(extras[3]);
    setModLog(extras[4]);
    setFeatured(extras[5]);
    setBoutiquesAdmin(extras[6]);
    setReports(extras[7]);
    setDuesOv(extras[8]);
    setReport(extras[9]);
    setOrders(extras[10]);
    setCoupons(extras[11]);
    setProviders(extras[12].map((p) => ({ ...p, feePct: String(p.feePct), actif: p.actif === false ? false : true })));
    setPaymentsAll(extras[13]);
    setAuditLog(extras[14]);
    setZones(extras[15]);
    setReviews(extras[16]);
    setPlat(extras[17]);
    setCams(extras[18]);
    setPubReq(extras[19]);
    setLastUpdate(new Date());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const audit = (action, detail) => logAudit({ action, detail, by: admin?.name || 'Admin' });

  const requireCode = (title, onOk) => {
    if (codeOk || !plat.adminCode) { onOk(); return; }
    setCodeInput('');
    setCodePrompt({ title, onOk });
  };

  const submitCode = async () => {
    const ok = await verifyAdminCode(codeInput);
    if (!ok) {
      Alert.alert('Code incorrect', 'Le code d\'administration saisi est invalide.');
      return;
    }
    setCodeOk(true);
    const onOk = codePrompt?.onOk;
    setCodePrompt(null);
    setCodeInput('');
    if (onOk) onOk();
  };

const handleDossierStatus = async (key, status) => {
    await setDossierStatus(key, status);
    await audit('Dossier livreur', `${key} -> ${status}`);
    await pushNotification(key, {
      title: status === 'verifie' ? 'Dossier vérifié ✓' : 'Dossier rejeté',
      body:
        status === 'verifie'
          ? 'Félicitations ! Votre dossier livreur a été validé. Vous pouvez accepter des courses.'
          : 'Votre dossier livreur a été rejeté. Soumettez de nouveaux documents pour reprendre les courses.',
      type: 'info',
    });
    await reload();
    Alert.alert(status === 'verifie' ? 'Dossier vérifié ✓' : 'Dossier rejeté', 'Le statut a été notifié au livreur.');
  };

  const confirmRejectDossier = (key, name) => {
    Alert.alert('Rejeter le dossier', `Rejeter le dossier de ${name || key} ? Le livreur devra soumettre de nouveaux documents.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Rejeter', style: 'destructive', onPress: () => handleDossierStatus(key, 'rejete') },
    ]);
  };

  const confirmSettleApprove = (key, montant) => {
    Alert.alert('Confirmer le règlement', `Confirmer que ${key} a bien réglé ${fcfa(montant)} ? Le dû sera remis à zéro et le compte débloqué.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          await approveSettlement(key);
          await audit('Règlement confirmé', `${key} · ${fcfa(montant)}`);
          await reload();
          Alert.alert('Règlement confirmé �S', `${fcfa(montant)} marqués comme réglés pour ${key}.`);
        },
      },
    ]);
  };

  const confirmRejectSett = (key) => {
    Alert.alert('Rejeter le règlement', `Rejeter la preuve de ${key} ? Le dû est conservé et le compte reste inchangé.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rejeter',
        style: 'destructive',
        onPress: async () => {
          await rejectSettlement(key);
          await audit('Règlement rejeté', key);
          await reload();
          Alert.alert('Règlement rejeté', 'Le livreur a été notifié.');
        },
      },
    ]);
  };

  const handleResolve = (orderId, action) => {
    Alert.alert(
      'Résolution du litige',
      action === 'rembourse'
        ? 'Rembourser le client et prélever le vendeur ?'
        : 'Libérer les fonds au vendeur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: action === 'rembourse' ? 'Rembourser' : 'Libérer',
          onPress: async () => {
            const res = await resolveDispute(orderId, action);
            if (res.ok) {
              await audit('Litige', `${orderId} �  ${action === 'rembourse' ? 'remboursement' : 'libération'}`);
              Alert.alert('Litige résolu �S', 'Le statut a été notifié aux deux parties.');
            } else {
              Alert.alert('Attention', res.message || 'Impossible de résoudre.');
            }
            await reload();
          },
        },
      ]
    );
  };

  const handleCloseTicket = async (id) => {
    const rep = advice[id] || '';
    const res = await closeTicket(id, rep);
    if (res.ok) {
      await audit('Ticket clôturé', `${id} � ${(rep || '').slice(0, 80)}`);
      Alert.alert('Ticket clôturé �S', 'Le client a été notifié.');
    } else {
      Alert.alert('Erreur', res.error);
    }
    await reload();
  };

  const handleSaveCommission = async () => {
    const saved = await setCommissionSettings(settings);
    setSettings(saved);
    await audit('Règle de compensation', `seuil ${saved.seuil} · taux ${saved.taux}% · forfait ${saved.forfait}`);
    Alert.alert(
      'Règle enregistrée �S',
      saved.seuil > 0
        ? `Compensation à partir de la commande payée n°${saved.seuil} : ${saved.taux > 0 ? saved.taux + '%' : ''}${saved.taux > 0 && saved.forfait > 0 ? ' ou minimum ' : ''}${saved.forfait > 0 ? saved.forfait + ' FCFA' : '0 FCFA'}.`
        : 'Compensation désactivée (seuil à 0 = aucun frais vendeur).'
    );
  };

  const handleResendContract = async (sellerKey) => {
    const ok = await resendContractNotification(sellerKey);
    Alert.alert(
      ok ? 'Rappel envoyé �S' : 'Aucun contrat',
      ok
        ? `Une notification de rappel a été déposée pour ${sellerKey}.`
        : `${sellerKey} n'a pas encore de contrat envoyé (moins de ${SEUIL_CONTRAT} ventes).`
    );
  };

  /* ������ Informations plateforme ������ */
  const addInfo = async () => {
    const titre = infoTitre.trim();
    const valeur = infoValeur.trim();
    if (!titre || !valeur) {
      Alert.alert('Champs requis', 'Renseignez un titre et une valeur pour l\'information.');
      return;
    }
    const next = [...infos, {
      id: 'in_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      titre,
      valeur,
      at: new Date().toISOString(),
    }];
    await saveAdminInfos(next);
    setInfos(next);
    setInfoTitre('');
    setInfoValeur('');
    await audit('Information ajoutée', `${titre} : ${valeur}`);
    Alert.alert('Information enregistrée �S', 'Elle est maintenant visible dans l\'application.');
  };

  const removeInfo = (id) => {
    Alert.alert('Supprimer l\'information', 'Retirer cette information de l\'application ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const next = infos.filter((i) => i.id !== id);
          await saveAdminInfos(next);
          await audit('Information retirée', `id ${id}`);
          setInfos(next);
        },
      },
    ]);
  };

  /* ������ Diffusion ������ */
  const handleBroadcast = async () => {
    const title = bTitle.trim();
    const body = bBody.trim();
    if (!title || !body) {
      Alert.alert('Champs requis', 'Indiquez un titre et un message à diffuser.');
      return;
    }
    const { count } = await broadcastNotification({ role: bRole, title, body });
    await audit('Diffusion', `Cible ${bRole} · ${count} compte(s) � « ${title} »`);
    Alert.alert('Diffusion envoyée �x�', `${count} compte(s) notifié(s) en tant que ${bRole}.`);
    await reload();
    setBTitle('');
    setBBody('');
  };

  /* ������ Boutiques / produits en avant ������ */
  const basculerBoutiqueAvant = async (slug) => {
    await toggleFeaturedBoutique(slug);
    await audit('Boutique en avant', `basculé ${slug}`);
    await reload();
  };

  const basculerProduitAvant = async (id) => {
    await toggleFeaturedProduct(id);
    await audit('Produit en vedette', `basculé ${id}`);
    await reload();
  };

  /* ������ Signalements produits ������ */
  const modererReport = (rep) => {
    requireCode('Modérer un produit signalé', () => {
      const prod = products.find((p) => String(p.id) === String(rep.productId));
      if (!prod) {
        Alert.alert('Produit introuvable', 'Ce produit a peut-être déjà été supprimé. Marquez ce signalement comme ignoré.', [
          { text: 'Annuler' },
          { text: 'Ignorer', onPress: async () => { await setProductReportStatus(rep.id, 'ignore'); await audit('Signalement ignoré', rep.id); await reload(); } },
        ]);
        return;
      }
      setReason('');
      setReasonModal({ type: 'produit', payload: prod, reportId: rep.id });
    });
  };

  const ignorerReport = (rep) => {
    Alert.alert('Ignorer le signalement', 'Clôturer ce signalement sans supprimer le produit ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Ignorer',
        onPress: async () => {
          await setProductReportStatus(rep.id, 'ignore');
          await audit('Signalement ignoré', rep.id);
          await reload();
        },
      },
    ]);
  };

  /* ������ Dûs livreurs ������ */
  const relancerLivreur = (du) => {
    Alert.alert('Relancer le livreur', `Envoyer un rappel de règlement à ${du.name || du.key} (${fcfa(du.montant)} restants) ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Relancer',
        onPress: async () => {
          await pushNotification(du.key, {
            title: 'Rappel de règlement',
            body: `Bonjour ${du.name || ''}, votre dû est de ${fcfa(du.montant)} FCFA${du.jour ? ` (à jour au ${du.jour})` : ''}. Réglez-le via USSD puis soumettez la preuve dans votre espace Livraisons pour débloquer le compte.`,
            type: 'alerte',
          });
          await audit('Rappel règlement', `${du.name || du.key} · ${fcfa(du.montant)}`);
          await reload();
          Alert.alert('Rappel envoyé �S', 'Le livreur a été notifié.');
        },
      },
    ]);
  };

  /* ������ Export / réinitialisation ������ */
  const handleExport = async () => {
    const { json, count } = await exportAllData();
    const uri = FileSystem.documentDirectory + 'afrimarket_export_' + Date.now() + '.json';
    try {
      await FileSystem.writeAsStringAsync(uri, json);
      await audit('Export JSON', `${count} clés`);
      Alert.alert('Export créé �S', `${count} clé(s) de données exportées.\nFichier : ${uri}`);
    } catch (e) {
      Alert.alert('Export impossible', String(e && e.message || 'Erreur lors de l\'écriture du fichier.'));
    }
  };

  const handleReset = async () => {
    Alert.alert(
      'Réinitialiser la démo',
      'Supprimer TOUTES les données AfriMarket (comptes, boutiques, produits, commandes, règlements, notifications⬦) et repartir de zéro ? Action irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Dernière confirmation',
              'Toutes les données seront définitivement effacées. Le compte admin actuel disparaît aussi : vous devrez recréer un compte.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Tout effacer',
                  style: 'destructive',
                  onPress: async () => {
                    const n = await resetDemoData();
                    await audit('Réinitialisation démo', `${n} entrées supprimées`);
                    await reload();
                    Alert.alert('Démo réinitialisée', `${n} entrées supprimées.`);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  /* ������ Coupons & codes promo ������ */
  const handleCreateCoupon = async () => {
    const code = cCode.trim();
    const value = Number(cValue);
    if (!code || !(value > 0)) {
      Alert.alert('Champs requis', 'Indiquez un code et une valeur de remise.');
      return;
    }
    const res = await createCoupon({ code, type: cType, value, maxUses: Number(cMaxUses) || 1 });
    if (!res.ok) {
      Alert.alert('Impossible', res.error);
      return;
    }
    setCCode('');
    setCValue('');
    setCMaxUses('');
    await audit('Coupon créé', `${res.coupon.code} · -${cType === 'percent' ? res.coupon.value + '%' : fcfa(res.coupon.value)} · ${res.coupon.maxUses} usages`);
    await reload();
    Alert.alert(
      'Coupon créé �x}�',
      `Code ${res.coupon.code} : -${cType === 'percent' ? res.coupon.value + '%' : fcfa(res.coupon.value)} · ${res.coupon.maxUses} usage(s).`
    );
  };

  const handleToggleCoupon = async (code) => {
    const before = coupons.find((c) => c.code === code);
    await toggleCoupon(code);
    await audit('Coupon ' + (before && before.actif ? 'désactivé' : 'activé'), code);
    await reload();
  };

  const handleDeleteCoupon = (code) => {
    Alert.alert('Supprimer le coupon', `Supprimer le code ${code} ? Il ne sera plus accepté au paiement.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteCoupon(code);
          await audit('Coupon supprimé', code);
          await reload();
        },
      },
    ]);
  };

  /* ������ Opérateurs Mobile Money ������ */
  const updProvider = (key, patch) =>
    setProviders((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const saveProviders = async () => {
    const map = {};
    for (const p of providers) {
      map[p.key] = { actif: p.actif !== false, feePct: Math.max(0, Number(p.feePct) || 0) };
    }
    await saveProviderSettings(map);
    await audit('Opérateurs sauvegardés', providers.map((p) => `${p.key}:${p.actif !== false ? 'ON' : 'OFF'}·${p.feePct || 0}%`).join(', '));
    Alert.alert('Opérateurs enregistrés �S', 'Les activations et taux de frais sont appliqués à l\'écran de paiement.');
    await reload();
  };

  /* ������ Commandes ������ */
  const resoudreCommande = (orderId, action) => {
    requireCode('Décision administration', () => {
      Alert.alert(
        action === 'rembourse' ? 'Rembourser la commande' : 'Libérer les fonds',
        action === 'rembourse'
          ? 'Rembourser le client et annuler cette commande (décision administration) ? Les articles seront réapprovisionnés et les deux parties notifiées.'
          : 'Libérer le paiement au vendeur, sans attendre la confirmation du client (décision administration) ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: action === 'rembourse' ? 'Rembourser' : 'Libérer',
            style: action === 'rembourse' ? 'destructive' : 'default',
            onPress: async () => {
              const res = await adminResolvePayment(orderId, action);
              if (res.ok) await audit('Commande (admin)', `${orderId} �  ${action === 'rembourse' ? 'remboursement + stock restauré' : 'libération des fonds'}`);
              Alert.alert(res.ok ? 'Action effectuée' : 'Impossible', res.ok ? 'Les deux parties ont été notifiées.' : res.error);
              await reload();
            },
          },
        ]
      );
    });
  };

  /* ������ Zones de livraison ������ */
  const addZoneItem = async () => {
    const v = zVille.trim();
    const f = Number(zFrais);
    if (!v || !(f >= 0)) {
      Alert.alert('Champs requis', 'Indiquez la ville et les frais de livraison (0 autorisé).');
      return;
    }
    const res = await addZone({ ville: v, frais: f });
    if (!res.ok) {
      Alert.alert('Impossible', res.error);
      return;
    }
    await audit('Zone créée', `${v} · ${fcfa(f)}`);
    setZVille('');
    setZFrais('');
    await reload();
  };

  const deleteZoneItem = (zone) => {
    Alert.alert('Supprimer la zone', `Retirer la zone de livraison « ${zone.ville} » ? Elle ne sera plus proposée au paiement.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteZone(zone.id);
          await audit('Zone supprimée', zone.ville);
          await reload();
        },
      },
    ]);
  };

  /* ������ Avis clients ������ */
  const handleDeleteReview = (rev) => {
    requireCode('Supprimer un avis', () => {
      Alert.alert('Supprimer l\'avis', `Effacer l'avis de ${rev.nom || 'Client'} sur « ${rev.productTitle || 'ce produit'} » ?`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteProductReview(rev.productId, rev.id);
            await audit('Avis supprimé', `${rev.nom || ''} sur « ${rev.productTitle || ''} »`);
            await reload();
            if (!res.ok) Alert.alert('Attention', res.error);
          },
        },
      ]);
    });
  };

  /* ������ Paramètres plateforme ������ */
  const savePlat = async () => {
    const next = await savePlatformSettings({
      minOrder: Math.max(0, Number(plat.minOrder) || 0),
      homeMessage: String(plat.homeMessage || '').trim(),
      featuredCarousel: !!plat.featuredCarousel,
      adminCode: String(plat.adminCode || '').trim(),
      pubSellerEnabled: !!plat.pubSellerEnabled,
      pubSellerMin: Math.max(1, Number(plat.pubSellerMin) || 50),
    });
    setPlat(next);
    await audit('Paramètres mis à jour',
      `min ${next.minOrder} · message ${next.homeMessage ? 'oui' : 'non'} · carrousel ${next.featuredCarousel ? 'on' : 'off'} · code admin ${next.adminCode ? 'défini' : 'désactivé'}`);
    Alert.alert('Paramètres enregistrés �S',
      next.adminCode ? 'Le code admin sera désormais demandé avant certaines actions sensibles de la console.' : 'Aucun code admin configuré : les actions sensibles sont directement accessibles.');
  };

  /* ������ Rapport mensuel + export CSV ������ */
  const buildMonths = () => {
    const mm = {};
    for (const p of paymentsAll) {
      if (!p.createdAt) continue;
      const k = String(p.createdAt).slice(0, 7);
      mm[k] = mm[k] || { count: 0, total: 0 };
      mm[k].count += 1;
      mm[k].total += Number(p.montant) || 0;
    }
    return Object.keys(mm).sort().slice(-6).map((k) => ({ key: k, ...mm[k] }));
  };

  const handleExportRapport = async () => {
    if (!report) return;
    const months = buildMonths();
    const lines = [
      'Rapport AfriMarket',
      'Rubrique;Reference;Montant_FCFA',
      ...report.days.map((d) => `Jour;${d.key};${d.total || 0}`),
      ...(months.length ? months.map((m) => `Mois;${m.key};${m.total}`) : []),
      ...report.topProduits.map((p) => `Produit;${String(p.title).replace(/;/g, ',')};${p.total}`),
      ...report.topVendeurs.map((v) => `Vendeur;${String(v.key).replace(/;/g, ',')};${v.total}`),
    ];
    const uri = FileSystem.documentDirectory + 'afrimarket_rapport_' + Date.now() + '.csv';
    try {
      await FileSystem.writeAsStringAsync(uri, lines.join('\n'));
      await audit('Rapport CSV exporté', `${months.length} mois · ${report.days.length} jours`);
      Alert.alert('Rapport exporté �S', `Fichier CSV créé.\n${uri}`);
    } catch (e) {
      Alert.alert('Export impossible', String(e && e.message || 'Erreur d\'écriture.'));
    }
  };

  /* ������ Modération produits ������ */
  const openModeration = (product) => {
    requireCode('Supprimer un produit', () => {
      setReason('');
      setReasonModal({ type: 'produit', payload: product });
    });
  };

  const confirmReasonAction = async () => {
    if (!reasonModal) return;
    const { type, payload } = reasonModal;
    const detail = reason.trim();
    if (!detail) {
      Alert.alert('Motif requis', 'Expliquez le motif : il sera envoyé au vendeur (ex : produit interdit, contenu inapproprié⬦).');
      return;
    }
    if (type === 'produit') {
      const res = await adminDeleteProduct({
        id: payload.id,
        slug: payload.slug || null,
        boutiqueName: payload.boutiqueName || payload.boutique_nom || '',
        ownerKey: payload.ownerKey || null,
        title: payload.title,
        reason: detail,
        adminName: admin.name,
      });
      if (res.ok) await audit('Produit supprimé', `« ${payload.title} » · motif : ${detail}`);
      if (res.ok && reasonModal.reportId) {
        await setProductReportStatus(reasonModal.reportId, 'traite');
      }
      await reload();
      Alert.alert(res.ok ? 'Produit supprimé �xa�' : 'Attention', res.message);
    } else if (type === 'compte') {
      const res = await deleteAccountByKey(payload.key, admin.key);
      if (res.ok) await audit('Compte supprimé', `${payload.name || payload.key} · motif : ${detail}`);
      await reload();
      if (res.ok) Alert.alert('Compte supprimé', `${payload.name || payload.key} a été supprimé (compte et boutique associée).`);
      else Alert.alert('Impossible', res.error);
    }
    setReasonModal(null);
    setReason('');
  };

  /* ������ Signalements de comptes ������ */
  const openFlag = (account) => {
    requireCode('Signaler un compte', () => {
      setFlagReason('');
      setFlagSeverity('avertissement');
      setFlagModal({ account });
    });
  };

  const submitFlag = async () => {
    if (!flagModal) return;
    const a = flagModal.account;
    const detail = flagReason.trim();
    if (!detail) {
      Alert.alert('Motif requis', 'Décrivez le problème (manquement constaté, comportement frauduleux, produit illicite⬦) pour notifier le concerné.');
      return;
    }
    const flag = await addFlag({
      key: a.key,
      name: a.name || '',
      phone: a.phone || null,
      role: a.role || '',
      severity: flagSeverity,
      reason: detail,
      adminName: admin.name,
    });
    await audit('Compte signalé', `${a.name || a.key} · ${flagSeverity} � ${detail}`);
    await reload();
    setFlagModal(null);
    Alert.alert('Compte signalé �x:�️', `Notification envoyée à ${flag.name || flag.key} � suivez l'évolution dans la vue Signalements.`);
  };

  const notifierFlag = async (flag) => {
    await notifyFlag(flag.key, { ...flag });
    Alert.alert('Avertissement relancé �S', 'Une nouvelle notification a été envoyée au concerné.');
  };

  const leverFlag = (flag) => {
    requireCode('Lever un signalement', () => {
      Alert.alert('Lever le signalement', `Clôturer le signalement de ${flag.name || flag.key} ? L'intéressé sera notifié que le signalement est levé.`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Lever',
          onPress: async () => {
            await liftFlag(flag.id);
            await audit('Signalement levé', `${flag.name || flag.key}`);
            await reload();
          },
        },
      ]);
    });
  };

  const fermerCompte = (flag) => {
    requireCode('Fermer un compte', () => {
      Alert.alert(
        'Fermer le compte',
        `Fermer définitivement le compte de ${flag.name || flag.key} ? Il ne pourra plus se connecter et sera notifié.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Fermer le compte',
            style: 'destructive',
            onPress: async () => {
              await closeFlaggedAccount(flag.id, flag.reason);
              await audit('Compte fermé', `${flag.name || flag.key}`);
              await reload();
            },
          },
        ]
      );
    });
  };

  const rouvrirCompte = (flag) => {
    Alert.alert('Rouvrir le compte', `Rouvrir le compte de ${flag.name || flag.key} ? L'intéressé sera notifié.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rouvrir',
        onPress: async () => {
          await reopenFlaggedAccount(flag.id);
          await audit('Compte rouvert', `${flag.name || flag.key}`);
          await reload();
        },
      },
    ]);
  };

  const supprimerCompte = (account) => {
    requireCode('Supprimer un compte', () => {
      Alert.alert(
        'Supprimer définitivement',
        `Supprimer le compte de ${account.name || account.key} ? Le compte, sa boutique et ses produits seront effacés. Action irréversible.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              const res = await deleteAccountByKey(account.key, admin.key);
              if (res.ok) await audit('Compte supprimé', `${account.name || account.key}`);
              await reload();
              if (res.ok) Alert.alert('Compte supprimé', 'Le compte et les données associées ont été effacés.');
              else Alert.alert('Impossible', res.error);
            },
          },
        ]
      );
    });
  };

  const openNote = async (account) => {
    const notes = await getNotesForAccount(account.key);
    setNoteText('');
    setNoteModal({ account, notes });
  };

  const addNote = async () => {
    if (!noteModal) return;
    const t = noteText.trim();
    if (!t) return;
    const notes = await addAccountNote({ accountKey: noteModal.account.key, text: t, by: admin.name });
    setNoteModal({ ...noteModal, notes });
    setNoteText('');
  };

  const pendingContracts = contracts.filter((c) => !c.acceptedAt).length;
  const flaggedActive = flags.filter((f) => f.status === 'actif').length;
  const newReports = reports.filter((r) => r.status === 'nouveau').length;
  const totalPending = dossiers.length + settlements.length + litiges.length + tickets.length + pendingContracts + flaggedActive + newReports;
  const allQuiet = totalPending === 0;

  const KPIS = [
    { key: 'dossiers', label: 'Dossiers à vérifier', icon: '�x��', value: dossiers.length, accent: COLORS.or },
    { key: 'reglements', label: 'Règlements en attente', icon: '�x�', value: settlements.length, accent: '#0E9F6E' },
    { key: 'litiges', label: 'Litiges ouverts', icon: '�a️', value: litiges.length, accent: COLORS.piment },
    { key: 'tickets', label: 'Tickets support', icon: '�x}�', value: tickets.length, accent: '#8A63D2' },
    { key: 'comptes', label: 'Comptes signalés', icon: '�x:�️', value: flaggedActive, accent: '#D35400' },
    { key: 'frais', label: 'Frais collectés', icon: '�x�', value: frais ? fcfa(frais.total) : fcfa(0), accent: COLORS.kola },
    { key: 'signalements', label: 'Signalements produits', icon: '�xa�', value: newReports, accent: COLORS.or },
  ];

  const countFor = (key) => {
    switch (key) {
      case 'dossiers': return dossiers.length;
      case 'reglements': return settlements.length;
      case 'litiges': return litiges.length;
      case 'tickets': return tickets.length;
      case 'contrats': return pendingContracts;
      case 'comptes': return flaggedActive;
      case 'signalements': return newReports;
      case 'campagnes': return cams.filter((c) => c.actif).length;
      default: return 0;
    }
  };

  const sectionBadge = (key) => (countFor(key) > 0 ? countFor(key) : null);
  const visibleProducts = products.filter((p) => p.boutiqueName || p.ownerKey || p.boutique_id)
    .filter((p) => {
      const q = prodQuery.trim().toLowerCase();
      if (!q) return true;
      return String(p.title || '').toLowerCase().includes(q)
        || String(p.boutiqueName || p.boutique_nom || '').toLowerCase().includes(q)
        || String(p.ownerKey || '').toLowerCase().includes(q);
    });
  const pickCampImage = async (field) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission refusée', 'Autorisez l�"accès à la galerie pour importer une photo.');
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!r.canceled && r.assets?.[0]?.uri) setCampDraft({ ...campDraft, [field]: r.assets[0].uri });
    } catch {}
  };

const pickCampMode = (mode) => {
    setCampDraft({ ...campDraft, mode: mode.key, emoji: mode.emoji, title: mode.title, sub: mode.sub });
  };

  const submitCamp = async () => {
    const draft = campDraft;
    if (!draft.image && !draft.emoji) {
      Alert.alert('Visuel requis', 'Choisissez un mode saisonnier ou importez une photo.');
      return;
    }
    if (draft.target === 'role' && !draft.targetRole) {
      Alert.alert('Ciblage incomplet', 'Choisissez le rôle qui verra cette publicité.');
      return;
    }
    if (draft.target === 'ville' && !String(draft.targetVille || '').trim()) {
      Alert.alert('Ciblage incomplet', 'Indiquez la ville ciblée.');
      return;
    }
    const cam = await createCampaignWithImage({ ...draft });
    await audit('Campagne créée', `« ${cam.title || cam.mode} »${cam.endAt ? ' · jusqu\'au ' + cam.endAt : ' · sans date'}`);
    setCams(await getCampaigns());
    setCampDraft({ mode: 'special', emoji: '⭐', image: null, imageSplash: null, theme: '', target: 'tous', targetRole: '', targetVille: '', linkBoutique: '', title: '', sub: '', startAt: '', endAt: '' });
    const scheduled = cam.startAt && cam.startAt > new Date().toISOString().slice(0, 10);
    Alert.alert('Campagne lancée �S', scheduled
      ? `Elle sera visible à partir du ${cam.startAt}.`
      : 'Mode actif : la photo s\'affiche à l\'ouverture de l\'app (pub passable). Désactivez-le en un clic quand la période est passée.');
  };

  const toggleCamp = async (cam) => {
    const next = await setCampaignActive(cam.id, !cam.actif);
    await audit('Campagne ' + (cam.actif ? 'désactivée' : 'activée'), cam.title || cam.mode);
    setCams(next);
  };

  const delCamp = (cam) => {
    Alert.alert('Supprimer la campagne ?', `« ${cam.title || cam.mode} » sera supprimée définitivement.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          const next = await deleteCampaign(cam.id);
          await audit('Campagne supprimée', cam.title || cam.mode);
          setCams(next);
        },
      },
    ]);
  };

  const approverPub = async (req) => {
    Alert.alert('Valider la publicité ?', `« ${req.title || req.boutiqueNom} » de ${req.sellerName} sera diffusée ${req.days} jour(s).`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Valider et diffuser',
        onPress: async () => {
          const r = await approvePubRequest(req.id);
          if (!r.ok) {
            Alert.alert('Erreur', r.error);
            return;
          }
          setCams(await getCampaigns());
          setPubReq(await getPubRequests());
          await audit('Publicité vendeur validée', `${req.title || req.boutiqueNom} · ${req.days} jour(s)`);
          Alert.alert('Campagne créée �S', `Votre campagne « ${r.cam.title} » est en ligne (pub passable, ciblage �x� Tous).`);
        },
      },
    ]);
  };

  const refuserPub = (req) => {
    Alert.alert('Refuser la demande ?', `La demande de ${req.sellerName} sera supprimée.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Refuser', style: 'destructive',
        onPress: async () => {
          setPubReq(await deletePubRequest(req.id));
          await audit('Publicité vendeur refusée', req.title || req.boutiqueNom);
        },
      },
    ]);
  };
  return {
    admin,
    section,
    setSection,
    menuOpen,
    setMenuOpen,
    dossiers,
    settlements,
    litiges,
    tickets,
    advice,
    setAdvice,
    frais,
    settings,
    setSettings,
    commissions,
    contracts,
    preview,
    setPreview,
    lastUpdate,
    refreshing,
    infos,
    setInfos,
    infoTitre,
    setInfoTitre,
    infoValeur,
    setInfoValeur,
    products,
    prodQuery,
    setProdQuery,
    accounts,
    vendeursCount,
    flags,
    modLog,
    reason,
    setReason,
    reasonModal,
    setReasonModal,
    flagModal,
    setFlagModal,
    flagReason,
    setFlagReason,
    flagSeverity,
    setFlagSeverity,
    viewCompte,
    setViewCompte,
    viewProducts,
    viewBoutiques,
    featured,
    boutiquesAdmin,
    reports,
    duesOv,
    report,
    bTitle,
    setBTitle,
    bBody,
    setBBody,
    bRole,
    setBRole,
    orders,
    ordersQ,
    setOrdersQ,
    coupons,
    cCode,
    setCCode,
    cType,
    setCType,
    cValue,
    setCValue,
    cMaxUses,
    setCMaxUses,
    providers,
    setProviders,
    paymentsAll,
    auditLog,
    zones,
    zVille,
    setZVille,
    zFrais,
    setZFrais,
    reviews,
    pubReq,
    plat,
    setPlat,
    noteModal,
    setNoteModal,
    noteText,
    setNoteText,
    codeOk,
    codePrompt,
    setCodePrompt,
    codeInput,
    setCodeInput,
    cams,
    campDraft,
    setCampDraft,
    reload,
    onRefresh,
    audit,
    requireCode,
    submitCode,
    handleDossierStatus,
    confirmRejectDossier,
    confirmSettleApprove,
    confirmRejectSett,
    handleResolve,
    handleCloseTicket,
    handleSaveCommission,
    handleResendContract,
    addInfo,
    removeInfo,
    handleBroadcast,
    basculerBoutiqueAvant,
    basculerProduitAvant,
    modererReport,
    ignorerReport,
    relancerLivreur,
    handleExport,
    handleReset,
    handleCreateCoupon,
    handleToggleCoupon,
    handleDeleteCoupon,
    updProvider,
    saveProviders,
    resoudreCommande,
    addZoneItem,
    deleteZoneItem,
    handleDeleteReview,
    savePlat,
    handleExportRapport,
    openModeration,
    confirmReasonAction,
    openFlag,
    submitFlag,
    notifierFlag,
    leverFlag,
    fermerCompte,
    rouvrirCompte,
    supprimerCompte,
    openNote,
    addNote,
    pickCampImage,
    pickCampMode,
    submitCamp,
    toggleCamp,
    delCamp,
    approverPub,
    refuserPub,
    pendingContracts,
    flaggedActive,
    newReports,
    totalPending,
    allQuiet,
    KPIS,
    countFor,
    sectionBadge,
    buildMonths,
    visibleProducts,
  };
}
