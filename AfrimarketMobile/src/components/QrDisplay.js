import React, { useMemo } from 'react';
import { View } from 'react-native';
import QRCode from 'qrcode-generator';

export default function QrDisplay({ value, size = 180, dark = '#0F0E23', light = '#ffffff', quiet = 8 }) {
  const matrix = useMemo(() => {
    const qr = QRCode(0, 'L');
    qr.addData(String(value || ''));
    qr.make();
    return qr;
  }, [value]);

  const count = matrix.getModuleCount();
  const cell = Math.max(1, Math.floor((size - quiet * 2) / count));

  return (
    <View style={{ padding: quiet, backgroundColor: light, borderRadius: 12, alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {Array.from({ length: count }).map((_, c) => (
            <View
              key={c}
              style={{ width: cell, height: cell, backgroundColor: matrix.isDark(r, c) ? dark : light }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}