import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export function Stars({ value = 0, size = 12 }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(value) ? "star" : "star-outline"}
          size={size}
          color={i <= Math.round(value) ? colors.amber : "#D1D5DB"}
          style={{ marginRight: 1 }}
        />
      ))}
    </View>
  );
}

const TONES = {
  orange: { bg: "#FFEDE6", fg: colors.primary },
  gray: { bg: colors.grayBg, fg: colors.gray },
  green: { bg: colors.greenBg, fg: colors.green },
  gold: { bg: colors.amberBg, fg: "#92400E" },
};

export function Badge({ children, tone = "orange" }) {
  const t = TONES[tone] || TONES.orange;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "600" },
});
