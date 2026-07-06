import React, { useMemo, useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform,
} from "react-native";
import { Picker as RNPicker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";
import { INITIAL_USERS, INITIAL_PRODUCTS, isPremiumActive } from "./data/seed";

import HomeScreen from "./screens/HomeScreen";
import ProductScreen from "./screens/ProductScreen";
import CartScreen from "./screens/CartScreen";
import VendorScreen from "./screens/VendorScreen";
import SubscriptionScreen from "./screens/SubscriptionScreen";
import AdminScreen from "./screens/AdminScreen";

export default function App() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [currentUserId, setCurrentUserId] = useState("u-3");
  const [view, setView] = useState("home");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [toast, setToast] = useState("");

  const currentUser = users.find((u) => u.id === currentUserId);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        const matchesCat = category === "Toutes" || p.category === category;
        const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
        return matchesCat && matchesSearch;
      }),
    [products, category, search]
  );

  const cartItems = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) })).filter((c) => c.product);
  const cartTotal = cartItems.reduce((sum, c) => sum + c.product.price * c.qty, 0);
  const cartCount = cartItems.reduce((sum, c) => sum + c.qty, 0);

  const addToCart = (productId, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (existing) return prev.map((c) => (c.productId === productId ? { ...c, qty: c.qty + qty } : c));
      return [...prev, { productId, qty }];
    });
    showToast("Ajouté au panier");
  };

  const removeFromCart = (productId) => setCart((prev) => prev.filter((c) => c.productId !== productId));

  const checkout = () => {
    setCart([]);
    showToast("Commande confirmée");
    setView("home");
  };

  const becomeVendor = () => {
    setUsers((prev) => prev.map((u) => (u.id === currentUserId ? { ...u, role: "vendor", subscription: "free" } : u)));
    showToast("Vous êtes maintenant vendeur");
  };

  const subscribePremium = () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUserId ? { ...u, subscription: "premium", subscriptionExpiry: expiry.toISOString().slice(0, 10) } : u))
    );
    showToast("Abonnement Premium activé");
  };

  const cancelPremium = () => {
    setUsers((prev) => prev.map((u) => (u.id === currentUserId ? { ...u, subscription: "free", subscriptionExpiry: null } : u)));
    showToast("Abonnement annulé");
  };

  const addProduct = (data) => {
    const newProduct = { id: "p" + Date.now(), vendorId: currentUserId, sold: 0, rating: 0, ...data };
    setProducts((prev) => [newProduct, ...prev]);
    showToast("Produit publié");
  };

  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast("Produit supprimé");
  };

  const adminSetPremium = (userId, premium) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (!premium) return { ...u, subscription: "free", subscriptionExpiry: null };
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        return { ...u, subscription: "premium", subscriptionExpiry: expiry.toISOString().slice(0, 10) };
      })
    );
  };

  const adminToggleBan = (userId) => setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, banned: !u.banned } : u)));

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const goHome = () => { setView("home"); setSelectedProductId(null); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={goHome} style={styles.logoRow}>
          <Ionicons name="storefront-outline" size={20} color="#fff" />
          <Text style={styles.logo}>Afri<Text style={{ color: "#FEF3C7" }}>Market</Text></Text>
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onFocus={goHome}
            placeholder="Rechercher un produit..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
          <Ionicons name="search" size={16} color={colors.primary} style={{ marginRight: 8 }} />
        </View>
        <TouchableOpacity onPress={() => setView("cart")} style={{ marginLeft: 10 }}>
          <Ionicons name="cart-outline" size={24} color="#fff" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sélecteur d'utilisateur — mode démo (remplacer par une vraie authentification) */}
      <View style={styles.userBar}>
        <Text style={styles.userBarLabel}>Connecté en tant que :</Text>
        <View style={styles.pickerWrap}>
          {Platform.OS === "web" ? (
            <select
              value={currentUserId}
              onChange={(e) => { setCurrentUserId(e.target.value); goHome(); }}
              style={{ border: "none", background: "transparent", fontSize: 12 }}
            >
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          ) : (
            <RNPicker
              selectedValue={currentUserId}
              onValueChange={(v) => { setCurrentUserId(v); goHome(); }}
              style={{ height: 32, width: 220 }}
              itemStyle={{ fontSize: 12 }}
            >
              {users.map((u) => <RNPicker.Item key={u.id} label={`${u.name} (${u.role})`} value={u.id} />)}
            </RNPicker>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 16 }}>
        <TouchableOpacity onPress={goHome} style={styles.navBtn}><Text style={styles.navText}>Boutique</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setView("vendor")} style={styles.navBtn}><Text style={styles.navText}>Espace vendeur</Text></TouchableOpacity>
        {currentUser?.role === "vendor" && !isPremiumActive(currentUser) && (
          <TouchableOpacity onPress={() => setView("subscription")} style={styles.navBtn}><Text style={styles.navText}>Passer Premium</Text></TouchableOpacity>
        )}
        {currentUser?.role === "admin" && (
          <TouchableOpacity onPress={() => setView("admin")} style={styles.navBtn}><Text style={styles.navText}>Administration</Text></TouchableOpacity>
        )}
      </ScrollView>

      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {currentUser?.banned && (
          <View style={styles.banBanner}><Text style={styles.banText}>Ce compte a été suspendu par l'administrateur.</Text></View>
        )}

        {view === "home" && (
          <HomeScreen
            products={filteredProducts}
            users={users}
            category={category}
            setCategory={setCategory}
            onOpenProduct={(id) => { setSelectedProductId(id); setView("product"); }}
            onAddToCart={addToCart}
          />
        )}

        {view === "product" && selectedProduct && (
          <ProductScreen
            product={selectedProduct}
            vendor={users.find((u) => u.id === selectedProduct.vendorId)}
            onBack={goHome}
            onAddToCart={addToCart}
            onBuyNow={(id, qty) => { addToCart(id, qty); setView("cart"); }}
          />
        )}

        {view === "cart" && (
          <CartScreen items={cartItems} total={cartTotal} onRemove={removeFromCart} onCheckout={checkout} onBack={goHome} />
        )}

        {view === "vendor" && (
          <VendorScreen
            currentUser={currentUser}
            products={products.filter((p) => p.vendorId === currentUserId)}
            isPremiumActive={isPremiumActive(currentUser)}
            onBecomeVendor={becomeVendor}
            onAddProduct={addProduct}
            onDeleteProduct={deleteProduct}
            onGoSubscription={() => setView("subscription")}
          />
        )}

        {view === "subscription" && (
          <SubscriptionScreen
            currentUser={currentUser}
            isPremiumActive={isPremiumActive(currentUser)}
            onSubscribe={subscribePremium}
            onCancel={cancelPremium}
          />
        )}

        {view === "admin" && currentUser?.role === "admin" && (
          <AdminScreen
            users={users}
            products={products}
            isPremiumActive={isPremiumActive}
            onSetPremium={adminSetPremium}
            onToggleBan={adminToggleBan}
            onDeleteProduct={deleteProduct}
          />
        )}
      </View>

      {!!toast && (
        <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  logoRow: { flexDirection: "row", alignItems: "center", marginRight: 8 },
  logo: { color: "#fff", fontWeight: "800", fontSize: 15, marginLeft: 4 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 8 },
  searchInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: colors.text },
  cartBadge: { position: "absolute", top: -6, right: -8, backgroundColor: "#FEF08A", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  cartBadgeText: { fontSize: 9, fontWeight: "700", color: colors.primary },
  userBar: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 4 },
  userBarLabel: { color: "#fff", fontSize: 11, marginRight: 6 },
  pickerWrap: { backgroundColor: "#fff", borderRadius: 6, flex: 1 },
  navRow: { backgroundColor: "rgba(255,255,255,0.08)", flexGrow: 0, paddingVertical: 8 },
  navBtn: { paddingVertical: 2 },
  navText: { color: "#fff", fontSize: 13 },
  banBanner: { backgroundColor: "#FEE2E2", padding: 10 },
  banText: { color: "#B91C1C", fontSize: 12 },
  toast: { position: "absolute", bottom: 24, alignSelf: "center", backgroundColor: "#111827", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  toastText: { color: "#fff", fontSize: 13 },
});
