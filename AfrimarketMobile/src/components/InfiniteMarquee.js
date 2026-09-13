import React, { useEffect, useRef } from 'react';
import { View, Animated, ScrollView, StyleSheet, Easing } from 'react-native';

export default function InfiniteMarquee({
  items, renderItem, height, itemWidth, gap = 12,
  speed = 60, direction = 'rtl', children,
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const count = items.length;
  const render = renderItem || children;
  const isLtr = direction === 'ltr';
  const cycleWidth = count * (itemWidth + gap);

  useEffect(() => {
    if (count <= 1) return;
    const durationMs = (cycleWidth / Math.max(1, speed)) * 1000;
    translateX.setValue(isLtr ? -cycleWidth : 0);
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: isLtr ? 0 : -cycleWidth,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [count, cycleWidth, speed, isLtr, translateX]);

  if (!render) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      style={{ height }}
    >
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX }] }}>
        {Array.from({ length: count * 2 }).map((_, i) => (
          <View key={i} style={[styles.slot, { width: itemWidth, height, marginRight: gap }]}>
            {render(items[i % count])}
          </View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  slot: { overflow: 'hidden' },
});