import { DeviceEventEmitter } from 'react-native';

export function emitScan(code) {
  DeviceEventEmitter.emit('SCAN_RESULT', code);
}

export function onScanResult(cb) {
  return DeviceEventEmitter.addListener('SCAN_RESULT', cb);
}