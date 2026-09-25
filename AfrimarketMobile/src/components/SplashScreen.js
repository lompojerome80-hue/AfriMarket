import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { getCampaignsLocal, pickCampaignForUser, incrementCampaignVues } from '../lib/campaigns';
import { getCurrentUser } from '../lib/auth';
import { getTrackingProfile } from '../lib/tracking';

export default function SplashScreen({ onDone, onAdPress }) {
  const [ready, setReady] = useState(false);
  const [splashPhoto, setSplashPhoto] = useState(null);
  const [adLink, setAdLink] = useState(null);
  const progress = useRef(new Animated.Value(0)).current;
  const finishRef = useRef(false);
  const insets = useSafeAreaInsets();

  const finish = () => {
    if (!finishRef.current) {
      finishRef.current = true;
      if (onDone) onDone();
    }
  };

  useEffect(() => {
    let un = false;
    Promise.all([getCampaignsLocal(), getCurrentUser(), getTrackingProfile()])
      .then(([cams, user, profile]) => {
        if (un) return;
        const cam = pickCampaignForUser(cams, user, profile);
        if (cam && cam.imageSplash) {
          setSplashPhoto(cam.imageSplash);
          setAdLink(cam.linkBoutique || null);
          incrementCampaignVues(cam.id).catch(() => {});
        }
        setReady(true);
      })
      .catch(() => {
        if (!un) setReady(true);
      });
    return () => {
      un = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isAd = !!(adLink && splashPhoto);
    const start = Date.now();
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 2400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      const elapsed = Date.now() - start;
      setTimeout(finish, Math.max(0, (isAd ? 8000 : 700) - elapsed));
    });
    const safety = setTimeout(finish, isAd ? 12000 : 5000);
    return () => clearTimeout(safety);
  }, [ready]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isAd = !!(adLink && splashPhoto);

  const handleAdTap = () => {
    if (!adLink) return;
    if (onAdPress) onAdPress({ linkBoutique: adLink });
    finish();
  };

  if (!ready) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.wordmark}>
            Afri<Text style={styles.accent}>Market</Text>
          </Text>
          <Text style={styles.tagline}>La marketplace du Burkina Faso 🇧🇫</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {splashPhoto ? (
        <Image source={{ uri: splashPhoto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.center}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.wordmark}>
            Afri<Text style={styles.accent}>Market</Text>
          </Text>
          <Text style={styles.tagline}>La marketplace du Burkina Faso 🇧🇫</Text>
        </View>
      )}

      {isAd ? (
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleAdTap} />
      ) : null}

      {isAd ? (
        <View style={[styles.skipWrap, { top: insets.top + 12 }]}>
          <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.8}>
            <Text style={styles.skipText}>⏭ Passer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.bottom, splashPhoto ? styles.bottomOverPhoto : null, { paddingBottom: splashPhoto ? (insets.bottom > 0 ? insets.bottom + 16 : 40) : 56 }]}>
        {isAd ? (
          <TouchableOpacity style={styles.ctaBtn} onPress={handleAdTap} activeOpacity={0.85}>
            <Text style={styles.ctaBtnText}>🛍️ Voir la boutique</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width }]} />
        </View>
        <Text style={styles.loadingText}>{isAd ? 'Publicité passable' : 'Chargement...'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navDark,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 24,
    marginBottom: 20,
  },
  wordmark: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },
  accent: {
    color: COLORS.or,
  },
  tagline: {
    color: '#9C99B6',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
  },
  skipWrap: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
  },
  skipBtn: {
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
  boutiqueChip: {
    backgroundColor: 'rgba(15,14,35,0.75)',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  boutiqueChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ctaBtn: {
    backgroundColor: COLORS.piment,
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bottom: {
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingBottom: 56,
  },
  bottomOverPhoto: {
    paddingBottom: 40,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.piment,
  },
  loadingText: {
    color: '#9C99B6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    letterSpacing: 1,
  },
});