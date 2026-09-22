import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const NATIVE = Platform.OS !== 'web';

export const SECURE_KEYS = {
  session: 'afrimarket__secure_session',
  otp: 'afrimarket__secure_otp',
  syncCreds: 'afrimarket__secure_sync',
  adminCode: 'afrimarket__secure_admin_code',
};

async function getItem(key) {
  if (NATIVE) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value != null) return value;
    } catch (err) {
      console.warn('SecureStore read fallback', err);
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch (err) {
    console.warn('SecureStore fallback read failed', err);
    return null;
  }
}

async function setItem(key, value) {
  if (NATIVE) {
    try {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(key).catch(() => {});
      return;
    } catch (err) {
      console.warn('SecureStore write fallback', err);
    }
  }
  await AsyncStorage.setItem(key, value);
}

async function removeItem(key) {
  if (NATIVE) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn('SecureStore delete fallback', err);
    }
  }
  await AsyncStorage.removeItem(key).catch(() => {});
}

const secure = { getItem, setItem, removeItem };

export default secure;