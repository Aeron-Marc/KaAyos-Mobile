import { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  View,
  Alert,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Message } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useAuth } from '@/lib/AuthContext';

export default function ConversationScreen() {
  const { id, bookingId, name } = useLocalSearchParams<{ id: string; bookingId?: string; name?: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [otherName, setOtherName] = useState(name || '');
  const flatListRef = useRef<FlatList>(null);

  const userId = user?.id;
  const otherId = Number(id);

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api.getMessages();
      const filtered = data.filter(
        m => (m.sender_id === otherId && m.receiver_id === userId) ||
             (m.sender_id === userId && m.receiver_id === otherId)
      );
      // Strictly chronological ascending: oldest -> newest
      const sorted = filtered.sort((a, b) => a.id - b.id);
      const anyMsg = sorted[0];
      if (anyMsg && !otherName) {
        const foundName = anyMsg.sender_id === userId ? anyMsg.receiver_name : anyMsg.sender_name;
        setOtherName(foundName);
      }
      setMessages(sorted);
    } catch (e) {
      console.error('Failed to fetch messages', e);
    }
  }, [userId, otherId, otherName]);

  useEffect(() => {
    if (userId) {
      fetchMessages().finally(() => {
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      });
    }
  }, [userId, fetchMessages]);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;
    const text = input.trim();
    setInput('');

    try {
      await api.sendMessage({
        sender_id: userId,
        receiver_id: otherId,
        booking_id: bookingId ? Number(bookingId) : undefined,
        message: text,
      });
      await fetchMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleAttachPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to share photos in chat.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploadingPhoto(true);
      const res = await api.uploadChatPhoto(result.assets[0].uri);
      await api.sendMessage({
        sender_id: userId!,
        receiver_id: otherId,
        booking_id: bookingId ? Number(bookingId) : undefined,
        message: `[Photo] ${res.url}`,
      });
      await fetchMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to send photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios' ? true : keyboardVisible}
      >
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </PressableScale>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{otherName || 'Chat'}</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          style={styles.flex}
          data={loading ? [] : messages}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={44} color={Colors.icon} />
              {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
              ) : (
                <Text style={styles.emptyText}>No messages yet. Start a conversation!</Text>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender_id === userId;
            const isPhoto = item.message.startsWith('[Photo] ');
            const photoUrl = isPhoto ? item.message.replace('[Photo] ', '').trim() : null;

            return (
              <View style={[styles.row, isMine ? styles.userRow : styles.botRow]}>
                <View style={[styles.bubble, isMine ? styles.userBubble : styles.botBubble]}>
                  {isPhoto && photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.chatPhotoBubble} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.bubbleText, isMine && styles.userBubbleText]}>
                      {item.message}
                    </Text>
                  )}
                  <Text style={[styles.timeText, isMine ? styles.userTimeText : styles.botTimeText]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handleAttachPhoto}
            disabled={uploadingPhoto}
            activeOpacity={0.7}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="camera-outline" size={22} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor={Colors.icon}
            style={styles.chatInput}
            onFocus={() => {
              setKeyboardVisible(true);
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
            }}
          />
          <PressableScale haptics onPress={sendMessage} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color="#fff" />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  messagesList: { padding: 20, gap: 12, flexGrow: 1 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', marginBottom: 4 },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 16 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: Colors.text },
  userBubbleText: { color: '#fff' },
  timeText: { fontSize: 11, marginTop: 4 },
  userTimeText: { color: 'rgba(255,255,255,0.7)' },
  botTimeText: { color: Colors.textMuted },
  inputBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10, alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  attachBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  chatInput: { flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  sendBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  chatPhotoBubble: { width: 220, height: 180, borderRadius: 12, marginBottom: 4 },
});
