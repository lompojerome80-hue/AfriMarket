import * as Location from 'expo-location';
import { Linking } from 'react-native';

export async function getCurrentPosition() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      maximumAge: 15000,
      timeout: 20000,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function deliveryPrice(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return null;
  return Math.max(1000, Math.ceil(distanceKm / 10) * 1000);
}

export function coordsLabel(c) {
  if (!c || c.lat == null || c.lng == null) return null;
  return `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
}

export async function openDirections(destLat, destLng, originLat, originLng) {
  const dest = `${destLat},${destLng}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving${
    originLat != null && originLng != null ? `&origin=${encodeURIComponent(`${originLat},${originLng}`)}` : ''
  }`;
  try { await Linking.openURL(url); } catch {}
}