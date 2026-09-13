import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useFocusEffect, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from './screens/HomeScreen';
import BoutiquesListScreen from './screens/BoutiquesListScreen';
import CartScreen from './screens/CartScreen';
import AccountScreen from './screens/AccountScreen';
import BoutiqueScreen from './screens/BoutiqueScreen';
import SearchScreen from './screens/SearchScreen';
import CreateBoutiqueScreen from './screens/CreateBoutiqueScreen';
import CommandesScreen from './screens/CommandesScreen';
import LivraisonsScreen from './screens/LivraisonsScreen';
import CreateCourseScreen from './screens/CreateCourseScreen';
import PayScreen from './screens/PayScreen';
import ReceiptScreen from './screens/ReceiptScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import MesAchatsScreen from './screens/MesAchatsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import MessagesScreen from './screens/MessagesScreen';
import ThreadScreen from './screens/ThreadScreen';
import AdminScreen from './screens/AdminScreen';
import PubliciteScreen from './screens/PubliciteScreen';
import HelpScreen from './screens/HelpScreen';
import QrScanScreen from './screens/QrScanScreen';
import ContractScreen from './screens/ContractScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SplashScreen from './src/components/SplashScreen';
import SeasonalSplash from './src/components/SeasonalSplash';
import { getCartCount } from './src/lib/cart';
import { getCurrentUser, userKey } from './src/lib/auth';
import { registerAccountForPush } from './src/lib/push';
import { autoSync } from './src/lib/sync';
import { getSellerContractState } from './src/lib/contract';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

console.log('BUNDLE_VERROU_Y4Z2_CHARGEPAR_L_APP');

const C = {
  navDark: '#0F0E23',
  piment: '#E62E04',
  inactive: '#7C7A90',
};

function TabIcon({ emoji, color, badge }) {
  return (
    <View>
      <Text style={{ fontSize: 22, opacity: color === C.piment ? 1 : 0.7 }}>{emoji}</Text>
      {badge > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

function CartTabIcon({ color }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = async () => setCount(await getCartCount());
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);
  return <TabIcon emoji="🛒" color={color} badge={count} />;
}

function MainTabs({ user: userProp }) {
  const [role, setRole] = useState(() => (userProp && userProp.role ? userProp.role : null));
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const u = await getCurrentUser();
        if (active) setRole(u?.role || null);
      })();
      return () => { active = false; };
    }, [userProp])
  );

  const courierOnly = role === 'Livreur';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.piment,
        tabBarInactiveTintColor: C.inactive,
        tabBarStyle: {
          backgroundColor: C.navDark,
          borderTopColor: '#1E1D3E',
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {courierOnly && (
        <Tab.Screen
          name="Disponibles"
          component={LivraisonsScreen}
          initialParams={{ section: 'disponibles' }}
          options={{
            tabBarLabel: 'Disponibles',
            tabBarIcon: ({ color }) => <TabIcon emoji="🛵" color={color} />,
          }}
        />
      )}
      {courierOnly && (
        <Tab.Screen
          name="EnCours"
          component={LivraisonsScreen}
          initialParams={{ section: 'encours' }}
          options={{
            tabBarLabel: 'En cours',
            tabBarIcon: ({ color }) => <TabIcon emoji="📦" color={color} />,
          }}
        />
      )}
      {!courierOnly && (
        <Tab.Screen
          name="Accueil"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Accueil',
            tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
          }}
        />
      )}
      {!courierOnly && (
        <Tab.Screen
          name="BoutiquesTab"
          component={BoutiquesListScreen}
          options={{
            tabBarLabel: 'Boutiques',
            tabBarIcon: ({ color }) => <TabIcon emoji="🏪" color={color} />,
          }}
        />
      )}
      {!courierOnly && (
        <Tab.Screen
          name="Panier"
          component={CartScreen}
          options={{
            tabBarLabel: 'Panier',
            tabBarIcon: ({ color }) => <CartTabIcon color={color} />,
          }}
        />
      )}
      <Tab.Screen
        name="Compte"
        component={AccountScreen}
        options={{
          tabBarLabel: 'Compte',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [contractOpenedFor, setContractOpenedFor] = useState(null);
  const pendingAdRef = useRef(null);
  const triesAdRef = useRef(0);
  const userAdRef = useRef(null);
  userAdRef.current = user;
  const readyAdRef = useRef(false);
  readyAdRef.current = ready;
  const suppressSeasonalRef = useRef(false);

  const openPendingAd = useCallback(() => {
    const cam = pendingAdRef.current;
    if (!cam || !cam.linkBoutique) return;
    if (navigationRef.isReady() && readyAdRef.current && userAdRef.current) {
      pendingAdRef.current = null;
      triesAdRef.current = 0;
      navigationRef.navigate('BoutiqueDetail', { slug: cam.linkBoutique });
      return;
    }
    triesAdRef.current += 1;
    if (triesAdRef.current > 240) {
      pendingAdRef.current = null;
      triesAdRef.current = 0;
      return;
    }
    setTimeout(openPendingAd, 120);
  }, []);

  const handleAdPress = useCallback(
    (cam) => {
      if (!cam || !cam.linkBoutique) return;
      pendingAdRef.current = cam;
      triesAdRef.current = 0;
      suppressSeasonalRef.current = true;
      openPendingAd();
    },
    [openPendingAd]
  );

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (pendingAdRef.current) openPendingAd();
    }, 120);
    return () => clearTimeout(t);
  }, [ready, pendingAdRef, openPendingAd]);

  useEffect(() => {
    const check = async () => {
      try {
        const u = await getCurrentUser();
        if (!u || u.role !== 'Vendeur') return;
        const st = await getSellerContractState(userKey(u));
        if (st.sent && !st.acceptedAt && contractOpenedFor !== u.key && navigationRef.isReady()) {
          setContractOpenedFor(u.key);
          navigationRef.navigate('Contrat', { gate: true });
        }
      } catch {
        /* silencieux */
      }
    };
    check();
    const iv = setInterval(check, 3000);
    return () => clearInterval(iv);
  }, [contractOpenedFor]);

  useEffect(() => {
    if (!user) return;
    registerAccountForPush(userKey(user));
    autoSync(user);
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      (async () => {
        const u = await getCurrentUser();
        if (u) autoSync(u);
      })();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let sub = null;
    let mounted = true;
    (async () => {
      try {
        const mod = await import('expo-notifications');
        if (!mounted) return;
        sub = mod.addNotificationResponseReceivedListener((resp) => {
          const content = resp && resp.notification && resp.notification.request && resp.notification.request.content;
          const data = content && content.data;
          if (!data || !navigationRef.isReady()) return;
          try {
            if (data.slug) navigationRef.navigate('BoutiqueDetail', { slug: data.slug });
            else if (data.threadId) navigationRef.navigate('Thread', { threadId: data.threadId });
          } catch {}
        });
      } catch {}
    })();
    return () => {
      mounted = false;
      if (sub && sub.remove) sub.remove();
    };
  }, []);

  if (!ready) {
    return (
      <SplashScreen
        onDone={async () => {
          setUser(await getCurrentUser());
          setReady(true);
        }}
        onAdPress={handleAdPress}
      />
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerBackTitle: 'Retour',
        }}
      >
        {!user ? (
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingScreen
                {...props}
                onLoggedIn={(u) => {
                  setUser(u);
                  if (pendingAdRef.current) {
                    triesAdRef.current = 0;
                    openPendingAd();
                  }
                }}
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="MainTabs">
              {(props) => <MainTabs {...props} userProp={user} />}
            </Stack.Screen>
            <Stack.Screen name="BoutiqueDetail" component={BoutiqueScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="CreateBoutique" component={CreateBoutiqueScreen} />
            <Stack.Screen name="Commandes" component={CommandesScreen} />
            <Stack.Screen name="Livraisons" component={LivraisonsScreen} />
            <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
            <Stack.Screen name="Pay" component={PayScreen} />
            <Stack.Screen name="Receipt" component={ReceiptScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="MesAchats" component={MesAchatsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Messages" component={MessagesScreen} />
            <Stack.Screen name="Thread" component={ThreadScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="Publicite" component={PubliciteScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="QrScan" component={QrScanScreen} />
            <Stack.Screen
              name="Contrat"
              component={ContractScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
          </>
        )}
      </Stack.Navigator>
      </NavigationContainer>
      <SeasonalSplash trigger={user} onAdPress={handleAdPress} suppressTrigger={suppressSeasonalRef} />
    </>
  );
}

const s = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: C.piment, borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
