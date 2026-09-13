import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import { getCartCount } from '../lib/cart';

export default function CartBadge({ refreshKey }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    getCartCount().then((c) => {
      if (mounted) setCount(c);
    });
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const SIZE = 20;

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: COLORS.piment,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  text: {
    color: COLORS.white,
    fontSize: SIZES.xs,
    fontWeight: '700',
    lineHeight: SIZE,
  },
});
