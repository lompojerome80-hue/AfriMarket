import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotification } from './notifications';

export const SEUIL_CONTRAT = 20;
export const CONTRAT_VERSION = 1;

const REGISTRY_KEY = 'afrimarket_contracts_registry';

export const CONTRAT_TITRE = "CONTRAT DE PARTENARIAT ET DE SERVICES « AFRI » — VENDEUR";

export const CONTRAT_TEXTE = [
  { title: 'PRÉAMBULE', body: 'Le présent contrat de partenariat et de services (ci-après le « Contrat ») est conclu entre, d\'une part, la plateforme AfriMarket (ci-après la « Plateforme »), opérateur d\'un service numérique de commerce électronique sur mobile, et, d\'autre part, le Vendeur, titulaire d\'un compte utilisateur sur ladite Plateforme, dont les informations d\'identification (numéro de téléphone, nom, pièces d\'identité, localisation) ont été fournies lors de la création du compte ou de l\'activation du profil Vendeur.\n\nLe Vendeur reconnaît que la Plateforme n\'est ni un vendeur, ni un dépositaire des marchandises, ni un transporteur, mais un simple intermédiaire technique mettant en relation un Vendeur, des Acheteurs et des Livreurs, et sécurisant les flux financiers associés.\n\nEn cochant la case d\'acceptation électronique (ou en pressant le bouton « J\'ai lu et j\'accepte les conditions »), le Vendeur reconnaît avoir disposé du temps nécessaire pour lire le présent Contrat, en comprendre la portée, et y adhérer sans réserve. Il est rappelé au Vendeur que la signature électronique vaut signature au sens des règles applicables au commerce électronique, et que sa valeur probante est identique à celle d\'une signature manuscrite.' },
  { title: 'ARTICLE 1 — OBJET', body: 'Le présent Contrat a pour objet de définir les conditions dans lesquelles la Plateforme met à la disposition du Vendeur un ensemble d\'outils et de services, à savoir : (a) la création et la gestion d\'une boutique virtuelle et de fiches produits ; (b) la mise en relation avec des Acheteurs ; (c) la mise en relation avec des Livreurs indépendants ; (d) la sécurisation des paiements et des fonds par un mécanisme d\'intermédiation financière (escrow) ; (e) le règlement des litiges ; (f) l\'historisation des transactions ; et (g) tout service annexe accessoire.\n\nLe Vendeur demeure seul responsable de ses produits, de leur qualité, de leur conformité, de leur licéité, de leurs descriptions, de leurs prix, et de l\'exécution de ses obligations envers l\'Acheteur. La Plateforme n\'intervient en aucune façon dans la chaîne logistique, le stockage, la manipulation ou le transport physique des marchandises, lesquels relèvent exclusivement de la responsabilité du Vendeur et, le cas échéant, du Livreur.' },
  { title: 'ARTICLE 2 — COMPTE ET INFORMATIONS', body: '2.1 Le Vendeur garantit l\'exactitude des informations communiquées lors de son inscription (identité, numéro de téléphone, adresse, numéro d\'entreprise le cas échéant) et s\'engage à les actualiser sans délai dans le cas d\'un changement.\n\n2.2 Le Vendeur est seul responsable de la confidentialité de son numéro de téléphone qui lui sert d\'identifiant, ainsi que de l\'usage du téléphone sur lequel son compte est activé. Toute transaction réalisée depuis son compte est réputée accomplie par lui.\n\n2.3 Le Vendeur s\'interdit de créer de multiples comptes dans le but de contourner les règles définies au présent Contrat, de détourner les seuils de compensation, de démultiplier artificiellement les évaluations ou de toute autre manière de contourner le fonctionnement de la Plateforme.\n\n2.4 Le Vendeur reconnaît que les numéros de téléphone des Acheteurs sont des données à caractère personnel protégées. Lesdits numéros sont masqués sur les interfaces du Vendeur et ne sont accessibles, le temps de la prestation de livraison, qu\'aux Livreurs indépendants désignés.' },
  { title: 'ARTICLE 3 — COMPENSATION ET COMMISSION PLATEFORME', body: '3.1 Pour l\'usage de la Plateforme, le Vendeur accepte qu\'une compensation puisse être prélevée sur le produit de ses ventes selon les règles suivantes : une commission (taux et/ou forfait) définie par la Plateforme, assise sur le montant de chaque vente, n\'étant due qu\'à compter de la vingtième (20e) vente payée réalisée par le Vendeur.\n\n3.2 La commission n\'est ni remboursable, ni reportable. Elle est calculée automatiquement par la Plateforme au moment du paiement et portée à la connaissance du Vendeur dans son tableau de revenus (ligne « dont compensation AfriMarket prélevée »).\n\n3.3 La Plateforme se réserve le droit de faire évoluer les taux, forfaits et seuils de compensation, moyennant une information préalable du Vendeur ; tout changement est réputé accepté par la poursuite de l\'utilisation de la Plateforme par le Vendeur.' },
  { title: 'ARTICLE 4 — FRAIS DE TRANSACTION MOBILE MONEY', body: 'Les frais techniques d\'intermédiation mobile money (1 % à 1,5 % selon l\'opérateur : Orange, MTN, Wave, Moov) sont supportés par l\'Acheteur au moment du paiement et correspondent aux droits d\'usage des réseaux de monnaie électronique et des agrégateurs de paiement. Ces frais ne constituent ni un revenu du Vendeur, ni un revenu de la Plateforme, et ne sont pas reversés. Le Vendeur est payé du montant net de sa vente, compte tenu de la compensation visée à l\'article 3.' },
  { title: 'ARTICLE 5 — SÉCURISATION DES FONDS (ESCROW)', body: '5.1 Les sommes dues au titre de chaque vente sont immobilisées auprès de la Plateforme dès le paiement par l\'Acheteur.\n\n5.2 Les fonds sont libérés au profit du Vendeur lorsque la commande a été notée comme reçue par l\'Acheteur (confirmation de réception).\n\n5.3 Si l\'Acheteur ouvre un litige, les fonds demeurent immobilisés jusqu\'à la résolution du litige selon l\'article 9.\n\n5.4 Le Vendeur ne peut prétendre au déblocage de fonds pour une commande non confirmée ou en litige.' },
  { title: 'ARTICLE 6 — OBLIGATIONS DU VENDEUR', body: '6.1 Le Vendeur s\'engage à : (a) vendre ses propres produits ou des produits dont il a le droit de disposer ; (b) garantir la conformité, la qualité, la disponibilité et la licéité des produits proposés ; (c) honorer toute commande payée dans les délais annoncés ; (d) préparer le colis avec ses informations de récupération (code de récupération) ; (e) répondre aux messages des Acheteurs dans des délais raisonnables ; (f) ne pas publier de contenus illicites, trompeurs, contrefaisants ou contraires aux bonnes mœurs ; (g) ne pas tenter de se soustraire aux règles du présent Contrat.\n\n6.2 Le Vendeur est expressément informé que les ventes conclues hors de la Plateforme, notamment par échange de coordonnées, ne bénéficient d\'aucune protection (ni sécurisation des fonds, ni livraison supervisée, ni service de litige).' },
  { title: 'ARTICLE 7 — INTERDICTIONS ET PROTECTION DE LA PLATEFORME', body: '7.1 Le Vendeur s\'interdit de : (a) contacter un Acheteur hors de la Plateforme afin de conclure une transaction en fraude du présent Contrat ; (b) communiquer ou tenter de communiquer des numéros de téléphone, adresses physiques, identifiants de messagerie personnelle ou toute autre coordonnée à des fins de transaction hors Plateforme ; (c) détourner un Livreur à des fins personnelles ou contracter directement avec un Livreur ; (d) solliciter un paiement hors du dispositif sécurisé ; (e) publier son propre numéro dans ses fiches produits.\n\n7.2 La Plateforme peut, par des dispositifs techniques (masquage des numéros, modération des échanges, journalisation des alertes de partage de coordonnées), détecter les infractions. Le Vendeur reconnaît avoir été informé du fonctionnement de ces dispositifs.' },
  { title: 'ARTICLE 8 — SANCTIONS', body: '8.1 En cas de manquement aux articles 2, 6 ou 7, la Plateforme pourra, selon la gravité : (a) adresser un avertissement ; (b) suspendre la boutique ; (c) conserver tout ou partie de la compensation légitimement due ; (d) geler les fonds en attente de livraison jusqu\'à contrôle ; (e) exclure temporairement ou définitivement le Vendeur.\n\n8.2 Le Vendeur est informé que la Plateforme se réserve, à titre de mesure préventive, la possibilité de signaler les comportements frauduleux aux autorités compétentes.\n\n8.3 En cas de litige avec l\'Acheteur, la Plateforme pourra, à titre conservatoire, bloquer les fonds concernés ainsi que tout fonds du même compte jusqu\'à la résolution du litige.' },
  { title: 'ARTICLE 9 — LITIGES ET MÉDIATION', body: '9.1 L\'Acheteur dispose d\'un droit d\'ouvrir un litige pour toute commande payée non reçue, non conforme ou litigieuse.\n\n9.2 Le litige est instruit par la Plateforme. Le Vendeur sera informé et devra, le cas échéant, apporter les éléments de preuve de l\'expédition (codes, courses, échanges) dans un délai raisonnable.\n\n9.3 Au terme de l\'instruction, la Plateforme décide soit le remboursement de l\'Acheteur, soit la libération des fonds au profit du Vendeur. Si le litige résulte d\'une fraude du Vendeur, les fonds pourront être intégralement remboursés à l\'Acheteur sans indemnité pour le Vendeur.' },
  { title: 'ARTICLE 10 — NOTIFICATIONS ET COMMUNICATIONS', body: 'Le Vendeur accepte de recevoir des notifications relatives à la Plateforme (ventes, paiements, litiges, mises à jour du Contrat, alertes de conformité) sur son téléphone. Ces notifications n\'ont pas valeur de facture ; les flux financiers sont consultables dans son tableau de revenus.' },
  { title: 'ARTICLE 11 — DURÉE ET RÉSILIATION', body: '11.1 Le présent Contrat entre en vigueur à la date de son acceptation électronique par le Vendeur et demeure en vigueur pendant toute la durée de l\'utilisation de la Plateforme.\n\n11.2 Le Vendeur peut y mettre fin à tout moment en cessant d\'utiliser la Plateforme. La Plateforme peut y mettre fin à tout moment, avec ou sans préavis, en cas de manquement du Vendeur.\n\n11.3 À la cessation du Contrat, les commandes en cours demeurent régies par ses dispositions, notamment pour le déblocage des fonds.\n\n11.4 Le présent Contrat est évolutif. Toute modification sera notifiée au Vendeur et sera réputée acceptée par la poursuite de l\'utilisation de la Plateforme.' },
  { title: 'ARTICLE 12 — RESPONSABILITÉ', body: '12.1 La responsabilité de la Plateforme est limitée aux obligations découlant du présent Contrat et à la bonne exécution des outils techniques.\n\n12.2 En aucun cas la Plateforme ne saurait être responsable des dommages indirects, des pertes de chiffre d\'affaires, des interruptions de service, des pannes des réseaux de télécommunication des opérateurs de monnaie électronique, ni des actes des Livreurs indépendants.\n\n12.3 Le Vendeur est seul responsable de la qualité et de la conformité des produits vendus et de toute responsabilité civile ou pénale en résultant.\n\n12.4 L\'activité de Vendeur sur la Plateforme est une activité indépendante ; le Vendeur n\'est ni salarié, ni préposé, ni mandataire de la Plateforme.' },
  { title: 'ARTICLE 13 — DONNÉES ET CONFIDENTIALITÉ', body: '13.1 Les données collectées (identité, téléphone, transactions, échanges) sont traitées dans le but exclusif de fournir le service.\n\n13.2 Le Vendeur accepte que les numéros soient masqués entre Acheteurs et Vendeurs et communiqués uniquement aux Livreurs désignés le temps de la livraison.\n\n13.3 Le Vendeur ne saurait utiliser les données des Acheteurs ou des Livreurs obtenues par quelque moyen que ce soit à des fins étrangères à la Plateforme.' },
  { title: 'ARTICLE 14 — FORCE MAJEURE', body: 'La responsabilité de la Plateforme ne peut être engagée en cas d\'événement présentant les caractères de force majeure (notamment : défaillance des réseaux de télécommunication, indisponibilité des agrégateurs de paiement, événements naturels, émeutes, grèves, dysfonctionnements généralisés du réseau Internet).' },
  { title: 'ARTICLE 15 — INFORMATIONS PRÉ-CONTRACTUELLES', body: '15.1 Le Vendeur reconnaît avoir reçu, avant toute conclusion du présent Contrat, les informations suivantes : (a) l\'identité et les coordonnées de la Plateforme ; (b) la description précise des services ; (c) le prix et les conditions des services, notamment la compensation prévue à l\'article 3 ; (d) les caractéristiques essentielles des services ; (e) les délais d\'exécution raisonnables ; (f) l\'absence de droit de rétractation pour les services numériques pleinement exécutés, dans les limites prévues par les textes applicables.\n\n15.2 Le récapitulatif de ces informations est accessible dans le présent Contrat et dans l\'aide de la Plateforme.' },
  { title: 'ARTICLE 16 — DROIT APPLICABLE ET ATTRIBUTION DE COMPÉTENCE', body: '16.1 Le présent Contrat est soumis au droit burkinabè.\n\n16.2 Tout différend né de son interprétation ou de son exécution sera soumis à la recherche d\'une solution amiable préalable (service de médiation de la Plateforme), puis, à défaut d\'accord, aux juridictions compétentes.\n\n16.3 Le fait pour l\'une des parties de ne pas se prévaloir d\'un manquement n\'emporte pas renonciation à s\'en prévaloir ultérieurement.' },
  { title: 'ARTICLE 17 — ACCEPTATION ÉLECTRONIQUE', body: 'Le Vendeur déclare avoir pris connaissance de l\'intégralité du présent Contrat (vingt-deux pages), avoir eu la faculté de le conserver et de l\'interroger, et l\'accepter expressément et sans réserve en pressant le bouton « J\'ai lu et j\'accepte les conditions ». L\'absence de lecture effective, la rapidité de l\'acceptation ou l\'impossibilité matérielle de lire l\'intégralité du texte n\'emportent aucune réserve et ne sauraient affecter la validité de l\'acceptation.' },
].map((s, i) => ({ n: i + 1, ...s }));

async function readRegistry() {
  try { return JSON.parse(await AsyncStorage.getItem(REGISTRY_KEY)) || {}; } catch { return {}; }
}

async function writeRegistry(registry) {
  await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export async function getSellerContractState(sellerKey) {
  const registry = await readRegistry();
  return registry[sellerKey] || { sent: false, acceptedAt: null, version: null };
}

export async function maybeSendContract(sellerKey, paidCount) {
  const registry = await readRegistry();
  const current = registry[sellerKey] || {};
  if (paidCount < SEUIL_CONTRAT || current.sent) return current;
  const next = {
    ...current,
    sent: true,
    acceptedAt: current.acceptedAt || null,
    version: CONTRAT_VERSION,
    sentAt: new Date().toISOString(),
    paidCountAtSend: paidCount,
  };
  registry[sellerKey] = next;
  await writeRegistry(registry);
  await pushNotification(sellerKey, {
    title: '📄 Contrat de partenariat requis',
    body: `Après ${paidCount} ventes, vous devez accepter le contrat de partenariat AfriMarket. Accédez à votre compte pour le consulter et l'accepter.`,
    type: 'contrat',
  });
  return next;
}

export async function acceptContract(sellerKey) {
  const registry = await readRegistry();
  const current = registry[sellerKey] || {};
  const next = {
    ...current,
    sent: true,
    acceptedAt: new Date().toISOString(),
    version: CONTRAT_VERSION,
  };
  registry[sellerKey] = next;
  await writeRegistry(registry);
  return next;
}

export async function getAllContractsStatus() {
  const registry = await readRegistry();
  return Object.entries(registry).map(([sellerKey, value]) => ({ sellerKey, ...value }));
}

export async function resendContractNotification(sellerKey) {
  const state = await getSellerContractState(sellerKey);
  if (!state.sent) return false;
  await pushNotification(sellerKey, {
    title: '📄 Rappel — contrat de partenariat',
    body: 'Votre contrat de partenariat AfriMarket vous attend. Consultez-le dans votre compte.',
    type: 'contrat_rappel',
  });
  return true;
}