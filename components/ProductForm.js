import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, Alert, ActionSheetIOS, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { CATEGORIES } from "../data/seed";

export default function ProductForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise", "Autorisez l'accès à vos photos pour ajouter des images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.7,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise", "Autorisez l'accès à l'appareil photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 5));
    }
  };

  const chooseSource = () => {
    if (images.length >= 5) {
      Alert.alert("Limite atteinte", "5 photos maximum par produit.");
      return;
    }
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Annuler", "Prendre une photo", "Choisir dans la galerie"], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) takePhoto(); if (idx === 2) pickFromLibrary(); }
      );
    } else {
      Alert.alert("Ajouter une photo", "", [
        { text: "Prendre une photo", onPress: takePhoto },
        { text: "Choisir dans la galerie", onPress: pickFromLibrary },
        { text: "Annuler", style: "cancel" },
      ]);
    }
  };

  const submit = () => {
    if (!title || !price || !stock || images.length === 0) {
      setError("Le titre, le prix, le stock et au moins une photo sont obligatoires.");
      return;
    }
    onSubmit({ title, price: Number(price), stock: Number(stock), category: cat, description, images });
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Nouveau produit</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.label}>Titre du produit</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex : Sac à main en cuir" />

      <Text style={styles.label}>Catégorie</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} onPress={() => setCat(c)} style={[styles.chip, cat === c && styles.chipActive]}>
            <Text style={[styles.chipText, cat === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.label}>Prix (FCFA)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" />
        </View>
        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.label}>Stock</Text>
          <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="0" />
        </View>
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: "top" }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Décrivez votre produit..."
        multiline
      />

      <Text style={styles.label}>Photos (jusqu'à 5)</Text>
      <View style={styles.imgRow}>
        {images.map((uri, i) => (
          <View key={i} style={styles.imgWrap}>
            <Image source={{ uri }} style={styles.img} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}>
              <Ionicons name="close" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {images.length < 5 && (
          <TouchableOpacity style={styles.addImgBtn} onPress={chooseSource}>
            <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={submit}>
        <Text style={styles.submitText}>Publier le produit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontWeight: "600", fontSize: 15, color: colors.text },
  error: { color: colors.red, fontSize: 12, marginBottom: 8 },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: colors.text },
  row: { flexDirection: "row" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginRight: 6, backgroundColor: "#fff" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: "#fff" },
  imgRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  imgWrap: { width: 64, height: 64, borderRadius: 8, overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  removeBtn: { position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, padding: 2 },
  addImgBtn: { width: 64, height: 64, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 16 },
  submitText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
