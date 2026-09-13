import { StyleSheet } from 'react-native';

import { COLORS, SIZES, SHADOWS } from '../constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  content: { padding: SIZES.padding, paddingBottom: 40 },

  centerNotice: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 28, backgroundColor: COLORS.paper2,
  },
  centerIcon: { fontSize: 46, marginBottom: 14 },
  centerTitle: { fontSize: 19, fontWeight: '800', color: COLORS.ink, textAlign: 'center', marginBottom: 8 },
  centerText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  primaryBtn: {
    backgroundColor: COLORS.piment, borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 28,
    alignItems: 'center', marginTop: 18,
  },
  primaryBtnText: { color: COLORS.paper, fontSize: 14, fontWeight: '800' },

  refreshBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  refreshBtnText: { fontSize: 17, color: COLORS.paper },

  headerPanel: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.paper, borderRadius: 16,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.lineSoft, ...SHADOWS.sm,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.piment,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: COLORS.paper },
  headerInfo: { flex: 1, marginLeft: 13 },
  headerName: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  headerRole: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  headerUpdated: { fontSize: 11, color: COLORS.mutedSoft, marginTop: 2 },

  kpiWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  kpiCell: {
    width: '31.5%', marginRight: '1.4%', marginBottom: 10,
    backgroundColor: COLORS.paper, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.lineSoft,
    paddingVertical: 12, paddingHorizontal: 8,
    alignItems: 'center',
  },
  kpiIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  kpiIconText: { fontSize: 18 },
  kpiValue: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  kpiLabel: { fontSize: 11, color: COLORS.muted, textAlign: 'center', marginTop: 2 },

  tabsWrap: { marginBottom: 14 },
  menuBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.paper, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.lineSoft,
    paddingVertical: 13, paddingHorizontal: 14, ...SHADOWS.sm,
  },
  menuBtnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuBtnIcon: { fontSize: 17, marginRight: 9 },
  menuBtnLabel: { fontSize: 14, fontWeight: '700', color: COLORS.ink, flex: 1 },
  menuBtnBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.piment,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6, marginHorizontal: 8,
  },
  menuBtnBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  menuBtnDots: { fontSize: 18, color: COLORS.muted, marginLeft: 6 },

  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(15,14,35,0.92)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  previewClose: {
    position: 'absolute', top: 52, right: 20, zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  previewCloseText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  previewImage: { width: '100%', height: undefined, aspectRatio: 0.8, borderRadius: 12, backgroundColor: COLORS.navDark },
  previewLabel: { color: '#fff', fontSize: 13, marginTop: 14, textAlign: 'center' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,14,35,0.55)',
    justifyContent: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.paper, borderRadius: 18,
    padding: 18, ...SHADOWS.lg,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: COLORS.muted, lineHeight: 19, marginBottom: 12 },
  modalArea: {
    backgroundColor: COLORS.paper2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 12, minHeight: 90,
    fontSize: 13, color: COLORS.ink,
    textAlignVertical: 'top',
  },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.inkSoft, marginBottom: 6 },

  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },

  miniBtn: {
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.navDark,
  },
  miniBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  miniOk: { backgroundColor: COLORS.kola },
  miniNo: { backgroundColor: COLORS.piment },
  miniGhost: {
    backgroundColor: COLORS.paper,
    borderWidth: 1, borderColor: COLORS.line,
  },
  miniGhostText: { color: COLORS.ink },

  operatorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  operatorChip: {
    backgroundColor: COLORS.paper,
    borderWidth: 1, borderColor: COLORS.line,
    borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 13,
    alignItems: 'center',
  },
  operatorChipText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  severityChipActive: { backgroundColor: COLORS.piment, borderColor: COLORS.piment },
  severityChipActiveText: { color: '#fff', fontWeight: '700' },

  noteItem: {
    backgroundColor: COLORS.paper2, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.lineSoft,
    padding: 10, marginBottom: 8,
  },
  noteText: { fontSize: 13, color: COLORS.ink, lineHeight: 18 },
  noteMeta: { fontSize: 10, color: COLORS.mutedSoft, marginTop: 5 },

  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(15,14,35,0.55)',
    justifyContent: 'flex-end',
  },
  menuCard: {
    backgroundColor: COLORS.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 28, maxHeight: '78%',
  },
  menuHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  menuTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  menuClose: { fontSize: 18, color: COLORS.muted, padding: 4 },
  menuList: { paddingHorizontal: 16, paddingBottom: 8 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.paper2, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.lineSoft,
    paddingVertical: 11, paddingHorizontal: 12, marginBottom: 7,
  },
  menuRowActive: { backgroundColor: '#FFF3F0', borderColor: COLORS.piment },
  menuRowIcon: { fontSize: 16, marginRight: 10 },
  menuRowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.ink },
  menuRowLabelActive: { color: COLORS.piment, fontWeight: '800' },
  menuBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.piment,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  menuBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  menuCheck: { color: COLORS.kola, fontSize: 15, fontWeight: '800' },

  alertBox: {
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#F6DFC3',
    borderRadius: 14, padding: 13, marginBottom: 14,
  },
  alertTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  alertText: { fontSize: 12, color: COLORS.muted, lineHeight: 18, marginTop: 4 },

  queueRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.paper, borderRadius: 13,
    borderWidth: 1, borderColor: COLORS.lineSoft,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
  },
  queueIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  queueLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.ink, marginLeft: 6 },
  queueBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.piment,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  queueBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  queueDone: { fontSize: 11, color: COLORS.kola, fontWeight: '700' },
  queueArrow: { fontSize: 15, color: COLORS.mutedSoft, marginLeft: 8 },

  divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 16 },

  feeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  feeCell: {
    flex: 1,
    backgroundColor: COLORS.paper, borderRadius: 13,
    borderWidth: 1, borderColor: COLORS.lineSoft,
    paddingVertical: 12, paddingHorizontal: 10,
    alignItems: 'center',
  },
  feeValue: { fontSize: 14, fontWeight: '800', color: COLORS.ink, textAlign: 'center' },
  feeLabel: { fontSize: 10, color: COLORS.muted, textAlign: 'center', marginTop: 3 },

  card: {
    backgroundColor: COLORS.paper, borderRadius: 15,
    borderWidth: 1, borderColor: COLORS.lineSoft,
    padding: 14, marginBottom: 11, ...SHADOWS.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  cardMeta: { fontSize: 11.5, color: COLORS.muted, lineHeight: 17, marginTop: 3 },

  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.paper2, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.lineSoft,
    paddingVertical: 5, paddingHorizontal: 9,
  },
  statusChipOk: { backgroundColor: '#EAF7EF', borderColor: '#CBECDA' },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusChipText: { fontSize: 11, fontWeight: '700', color: COLORS.ink },

  thumbs: { flexDirection: 'row', gap: 8, marginTop: 4 },
  thumb: {
    width: 78, height: 78, borderRadius: 11,
    backgroundColor: COLORS.paper2,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.line },

  montantText: { fontWeight: '800', color: COLORS.piment },

  disputeBox: {
    backgroundColor: '#FFF6F4', borderWidth: 1, borderColor: '#F6D8D2',
    borderRadius: 11, padding: 10, marginTop: 8,
  },
  disputeLabel: { fontSize: 11, fontWeight: '700', color: COLORS.piment, marginBottom: 3 },
  disputeText: { fontSize: 13, color: COLORS.ink, lineHeight: 18 },

  ticketMsg: {
    backgroundColor: COLORS.paper2, borderRadius: 11,
    padding: 11, marginTop: 8,
    fontSize: 13, color: COLORS.ink, lineHeight: 19,
  },
  replyInput: {
    backgroundColor: COLORS.paper2, borderRadius: 11,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 10, minHeight: 62, marginTop: 8,
    fontSize: 13, color: COLORS.ink, textAlignVertical: 'top',
  },

  subSection: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginTop: 14, marginBottom: 8 },

  backRow: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 2, marginBottom: 8 },
  backRowText: { fontSize: 13, fontWeight: '700', color: COLORS.piment },

  settingRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  settingField: { flex: 1 },
  settingInput: {
    backgroundColor: COLORS.paper, borderRadius: 11,
    borderWidth: 1, borderColor: COLORS.line,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: COLORS.ink, marginBottom: 10,
  },

  sectWrap: { marginTop: 12 },
  sectTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 8 },

  formHint: { fontSize: 11.5, color: COLORS.muted, lineHeight: 17, marginTop: 3, marginBottom: 4 },

  campDraftImgWrap: { marginTop: 4 },
  campDraftImg: { width: '100%', height: 170, borderRadius: 12, backgroundColor: COLORS.paper2 },
  campDraftRemove: { marginTop: 6, alignSelf: 'flex-start' },
  campDraftRemoveText: { fontSize: 12, fontWeight: '700', color: COLORS.piment },

  campListImg: { width: 64, height: 64, borderRadius: 10, backgroundColor: COLORS.paper2 },
  campListImgNo: { alignItems: 'center', justifyContent: 'center' },

  campOn: { color: COLORS.kola, fontWeight: '700' },
  campOff: { color: COLORS.mutedSoft },

  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dayLabel: { width: 52, fontSize: 11, fontWeight: '600', color: COLORS.muted },
  dayBarWrap: { flex: 1, flexDirection: 'row' },
  dayBar: {
    backgroundColor: COLORS.piment, borderRadius: 7,
    minHeight: 22, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  monthBarWrap: { flex: 1 },
  monthBarText: { fontSize: 12, color: COLORS.ink, fontWeight: '700' },
});