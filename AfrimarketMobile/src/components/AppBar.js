import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../constants/theme';

export default function AppBar({ title, onBack, right, children, style, flush }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }, style]}>
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        ) : flush ? null : (
          <View style={styles.spacer} />
        )}
        {title ? (
          typeof title === 'string' ? (
            <Text style={[styles.title, flush && styles.titleFlush]} numberOfLines={1}>{title}</Text>
          ) : (
            <View style={[styles.titleBox, flush && styles.titleBoxFlush]}>{title}</View>
          )
        ) : (
          <View style={[styles.grow, flush && styles.growFlush]} />
        )}
        <View style={styles.right}>{right}</View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.navDark,
    paddingBottom: 14,
    paddingHorizontal: SIZES.padding,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  spacer: { width: 40 },
  grow: { flex: 1 },
  growFlush: { flex: 1 },
  titleBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  titleBoxFlush: { marginLeft: 0 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: '#fff', fontSize: 30, lineHeight: 32, marginTop: -2 },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  titleFlush: { marginLeft: 0 },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});