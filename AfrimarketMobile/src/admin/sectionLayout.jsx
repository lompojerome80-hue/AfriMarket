import { View, Text, StyleSheet } from 'react-native';

import { COLORS } from '../constants/theme';

export const SectionHeader = ({ icon, title, count, hint }) => (
  <View style={sectionStyles.sectionHeader}>
    <View style={sectionStyles.sectionTitleRow}>
      <Text style={sectionStyles.sectionIcon}>{icon}</Text>
      <Text style={sectionStyles.sectionTitle}>{title}</Text>
      {count > 0 && (
        <View style={sectionStyles.sectionBadge}>
          <Text style={sectionStyles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
    <Text style={sectionStyles.sectionHint}>{hint}</Text>
  </View>
);

export const SectionEmpty = ({ icon, title, subtitle }) => (
  <View style={sectionStyles.emptyBox}>
    <Text style={sectionStyles.emptyIcon}>{icon}</Text>
    <Text style={sectionStyles.emptyTitle}>{title}</Text>
    <Text style={sectionStyles.emptyText}>{subtitle}</Text>
  </View>
);

export const sectionStyles = StyleSheet.create({
  sectionHeader: { marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  sectionHint: { fontSize: 12, color: COLORS.muted, lineHeight: 17, marginTop: 4 },
  sectionBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.piment,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sectionBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  emptyBox: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 22,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyIcon: { fontSize: 34, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  emptyText: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 4, lineHeight: 17 },
});