import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  useAudioRecorder, useAudioRecorderState,
  RecordingPresets, requestRecordingPermissionsAsync,
  useAudioPlayer, useAudioPlayerStatus,
} from 'expo-audio';
import { getMessages, sendMessage, markThreadRead } from '../src/lib/messaging';
import { getCurrentUser } from '../src/lib/auth';
import { looksLikeContact } from '../src/lib/privacy';
import AppBar from '../src/components/AppBar';
import { COLORS } from '../src/constants/theme';

function VoiceBubble({ uri }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const fmt = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  return (
    <TouchableOpacity onPress={() => status.playing ? player.pause() : player.play()} style={styles.voiceBtn}>
      <Text style={styles.voiceBtnText}>{status.playing ? '⏸' : '▶'}</Text>
      <Text style={styles.voiceDur}>{fmt(status.duration || 0)}</Text>
    </TouchableOpacity>
  );
}

export default function ThreadScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { threadId } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState('moi');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [hasPermission, setHasPermission] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const res = await requestRecordingPermissionsAsync();
      setHasPermission(res.granted);
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const load = useCallback(async () => {
    const user = await getCurrentUser();
    setUserId(user?.key || 'moi');
    await markThreadRead(threadId, user?.key);
    setMessages(await getMessages(threadId));
  }, [threadId]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 1500);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const actuallySend = async (t) => {
    await sendMessage(threadId, { from: userId, text: t });
    setText('');
    load();
  };

  const handleSendText = async () => {
    const t = text.trim();
    if (!t) return;
    if (looksLikeContact(t)) {
      Alert.alert(
        'Échange de coordonnées',
        '📵 AfriMarket masque les contacts : les coordonnées personnelles divulguées ici ne sont protégées d\'aucune façon. Une vente conclue hors plateforme n\'a ni escrow, ni livraison, ni recours.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Envoyer quand même', style: 'destructive', onPress: () => actuallySend(t) },
        ]
      );
      return;
    }
    await actuallySend(t);
  };

  const handleRecord = async () => {
    if (hasPermission === false) return;
    if (recorderState.isRecording) {
      await recorder.stop();
      const uri = recorder.uri || recorderState?.url || null;
      if (uri) {
        await sendMessage(threadId, { from: userId, audioUri: uri });
        load();
      }
    } else {
      await recorder.record();
    }
  };

  const renderMsg = ({ item }) => {
    const mine = item.from === userId;
    return (
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        {item.text ? (
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
        ) : item.audioUri ? (
          <VoiceBubble uri={item.audioUri} />
        ) : null}
        <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
          {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <AppBar title="Conversation" onBack={() => navigation.goBack()} />
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMsg}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>Pas encore de messages</Text>}
      />
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.micBtn, recorderState.isRecording && styles.micBtnActive]}
          onPress={handleRecord}
        >
          <Text style={styles.micBtnText}>{recorderState.isRecording ? '⏹' : '🎤'}</Text>
        </TouchableOpacity>
        {recorderState.isRecording && (
          <Text style={styles.recDuration}>{Math.floor((recorderState.durationMillis || 0) / 1000)}s</Text>
        )}
        <TextInput
          style={styles.textInput}
          placeholder={recorderState.isRecording ? 'Enregistrement…' : 'Votre message…'}
          placeholderTextColor={COLORS.mutedSoft}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSendText}
          returnKeyType="send"
          editable={!recorderState.isRecording}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSendText} activeOpacity={0.8}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper2 },
  list: { padding: 16, paddingBottom: 10 },
  empty: { textAlign: 'center', color: COLORS.mutedSoft, marginTop: 40 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#FFF0EB', borderBottomRightRadius: 4 },
  bubbleOther: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  bubbleTextMine: { color: COLORS.piment },
  bubbleTime: { fontSize: 10, color: COLORS.mutedSoft, marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { textAlign: 'right' },
  voiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceBtnText: { fontSize: 18 },
  voiceDur: { fontSize: 13, color: COLORS.ink, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderTopWidth: 1, borderTopColor: COLORS.line,
    paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 20,
  },
  micBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.paper2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.line, marginRight: 8,
  },
  micBtnActive: { backgroundColor: COLORS.piment, borderColor: COLORS.piment },
  micBtnText: { fontSize: 18 },
  recDuration: { fontSize: 13, color: COLORS.piment, fontWeight: '700', marginRight: 6 },
  textInput: {
    flex: 1, backgroundColor: COLORS.paper2, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: COLORS.ink,
    borderWidth: 1, borderColor: COLORS.line,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.piment, alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});