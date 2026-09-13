import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { emitScan } from '../src/lib/scanEvents';
import AppBar from '../src/components/AppBar';
import { COLORS } from '../src/constants/theme';

export default function QrScanScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    emitScan(String(data || '').trim());
    setTimeout(() => navigation.goBack(), 350);
  };

  return (
    <View style={styles.container}>
      <AppBar title="Scanner un QR code" onBack={() => navigation.goBack()} />
      <View style={styles.area}>
        {!permission ? (
          <ActivityIndicator color={COLORS.piment} />
        ) : !permission.granted ? (
          <View style={styles.permBox}>
            <Text style={styles.permText}>Autorisation caméra requise pour scanner un QR code.</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Autoriser la caméra</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleScan}
          >
            <View style={styles.overlay}>
              <View style={styles.frame} />
              <Text style={styles.hint}>Placez le code QR dans le cadre</Text>
            </View>
          </CameraView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  area: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 240, height: 240,
    borderWidth: 3, borderColor: COLORS.or,
    borderRadius: 20, backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 24, color: '#fff', fontSize: 14, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
  },
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  permBtn: { backgroundColor: COLORS.piment, borderRadius: 100, paddingVertical: 12, paddingHorizontal: 24 },
  permBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});