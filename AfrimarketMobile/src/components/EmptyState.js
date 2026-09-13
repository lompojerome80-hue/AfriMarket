import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.wrap}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.btn} activeOpacity={0.75} onPress={onAction}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.xxl,
  },
  icon: {
    fontSize: 56,
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.base,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SIZES.md,
  },
  btn: {
    backgroundColor: COLORS.or,
    borderRadius: SIZES.radiusSm,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  btnText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
});
