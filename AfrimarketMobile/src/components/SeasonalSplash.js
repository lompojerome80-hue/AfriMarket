import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Image, StyleSheet, Animated, Easing, Text, TouchableOpacity } from 'react-native';
import { getCampaignsLocal, pickCampaignForUser, incrementCampaignVues } from '../lib/campaigns';
import { getCurrentUser } from '../lib/auth';
import { getTrackingProfile } from '../lib/tracking';

export default function SeasonalSplash({ trigger, onAdPress, suppressTrigger }) {
  const [cam, setCam] = useState(null);
  const [visible, setVisible] = useState(false);
  const wasBackground = useRef(false);
  const firstRun = useRef(true);
  const lastTrigger = useRef(trigger);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const countedRef = useRef(null);

  const showSplash = () => {
    Promise.all([getCampaignsLocal(), getCurrentUser(), getTrackingProfile()])
      .then(([cams, user, profile]) => {
        const c = pickCampaignForUser(cams, user, profile);
        if (c && c.imageSplash) {
          setCam(c);
          setVisible(true);
          if (countedRef.current !== c.id) {
            countedRef.current = c.id;
            incrementCampaignVues(c.id).catch(() => {});
          }
        } else {
          setCam(null);
          setVisible(false);
        }
      })
      .catch(() => {
        setVisible(false);
      });
  };

  const hide = () => {
    clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 0, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(
      () => setVisible(false)
    );
  };

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      lastTrigger.current = trigger;
      return;
    }
    if (trigger !== lastTrigger.current) {
      lastTrigger.current = trigger;
      if (suppressTrigger && suppressTrigger.current) {
        suppressTrigger.current = false;
        return;
      }
      showSplash();
    }
  }, [trigger]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        wasBackground.current = true;
      } else if (state === 'active') {
        if (wasBackground.current) {
          showSplash();
        }
        wasBackground.current = false;
      }
    });
    return () => {
      sub.remove();
      clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    clearTimeout(timer.current);
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    timer.current = setTimeout(hide, 8000);
  }, [visible, cam]);

  if (!visible || !cam) return null;

  const canLink = cam.linkBoutique && onAdPress;

  const handleTap = () => {
    if (!canLink) return;
    onAdPress(cam);
    hide();
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]} pointerEvents="auto">
      {cam.imageSplash ? (
        <Image source={{ uri: cam.imageSplash }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Afri{'\u00A0'}Market</Text>
        </View>
      )}

      {canLink ? (
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleTap}>
          <View style={styles.linkCtrlWrap}>
            <View style={styles.linkCtrl}>
              <Text style={styles.linkCtrlText}>🛍️ Voir la boutique</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.badgeWrap}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cam.theme ? `Thème : ${cam.theme}` : 'Publicité'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.skipBtn} onPress={hide} activeOpacity={0.8}>
        <Text style={styles.skipText}>⏭ Passer</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    backgroundColor: '#0F0E23',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  badgeWrap: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
  },
  badge: {
    backgroundColor: 'rgba(15,14,35,0.7)',
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkCtrlWrap: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
  },
  linkCtrl: {
    backgroundColor: '#E62E04',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  linkCtrlText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  skipBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(15,14,35,0.65)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1,
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  skipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});