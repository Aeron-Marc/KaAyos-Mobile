import { useRef, useState, useCallback } from 'react';
import { StyleSheet, Animated, PanResponder, Dimensions, TextInput, FlatList, KeyboardAvoidingView, Platform, Text, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';
import * as api from '@/lib/api';

const SIZE = 56;
const MARGIN = 16;
const TABS_HEIGHT = 56;
const BOTTOM_START = TABS_HEIGHT + MARGIN + 48;

type ChatMsg = {
  id: string;
  type: 'user' | 'bot';
  text: string;
  workers?: any[];
  mapHtml?: string;
  suggestions?: string[];
};

export function FloatingStar() {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = Dimensions.get('window');

  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: '0', type: 'bot', text: 'Hi! How can I help you today?', suggestions: ['How do I book a worker?', 'What areas do you serve?', 'How are workers verified?'] },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const toggle = useCallback(() => {
    if (open) {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setVisible(false);
        setOpen(false);
      });
    } else {
      setOpen(true);
      setVisible(true);
      Animated.spring(anim, { toValue: 1, stiffness: 180, damping: 22, useNativeDriver: true }).start();
    }
  }, [open, anim]);

  const sendMessage = async (text: string) => {
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', text }]);
    setLoading(true);

    const history = messages.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.text }));
    try {
      const data = await api.chatSuggest(text, history);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: data.reply,
        workers: data.workers || [],
        mapHtml: data.mapHtml || '',
        suggestions: data.suggestions || [],
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: 'Sorry, something went wrong.',
        suggestions: ['I need a plumber', 'I need an electrician'],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const startPos = useRef({ x: 0, y: 0 });

  const MIN_X = -(W - SIZE - 2 * MARGIN);
  const MAX_X = 0;
  const MIN_Y = BOTTOM_START - (H - insets.top - SIZE - MARGIN * 2);
  const MAX_Y = BOTTOM_START - (TABS_HEIGHT + MARGIN);

  const corners = [
    { x: 0, y: 0 },
    { x: MIN_X, y: 0 },
  ];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPos.current = { x: (pan.x as any)._value, y: (pan.y as any)._value };
      },
      onPanResponderMove: (_, g) => {
        const tx = Math.max(MIN_X, Math.min(MAX_X, startPos.current.x + g.dx));
        const ty = Math.max(MIN_Y, Math.min(MAX_Y, startPos.current.y + g.dy));
        pan.setValue({ x: tx, y: ty });
      },
      onPanResponderRelease: (_, g) => {
        const moved = Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5;
        if (!moved) {
          toggle();
          return;
        }
        const cx = (pan.x as any)._value;
        const cy = (pan.y as any)._value;
        let nearest = corners[0];
        let minDist = Infinity;
        for (const c of corners) {
          const d = (cx - c.x) ** 2 + (cy - c.y) ** 2;
          if (d < minDist) { minDist = d; nearest = c; }
        }
        Animated.spring(pan, {
          toValue: nearest,
          stiffness: 120,
          damping: 15,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });
  const panelScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const panelOpacity = anim;
  const panelTranslateY = anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  const renderMessage = ({ item }: { item: ChatMsg }) => {
    if (item.type === 'user') {
      return (
        <View style={ov.msgRowRight}>
          <View style={ov.userBubble}><Text style={ov.userText}>{item.text}</Text></View>
        </View>
      );
    }
    return (
      <View style={ov.msgRowLeft}>
        <View style={ov.msgContent}>
          <View style={ov.botBubble}><Text style={ov.botText}>{item.text}</Text></View>
          {item.workers?.map(w => (
            <PressableScale key={w.id} style={ov.workerCard} onPress={() => { toggle(); router.push(`/worker/${w.id}`); }}>
              <View style={ov.wa}><Text style={ov.wat}>{w.initials || w.name?.charAt(0)}</Text></View>
              <View style={ov.wi}>
                <Text style={ov.wn} numberOfLines={1}>{w.name}</Text>
                <Text style={ov.wc} numberOfLines={1}>{w.category}</Text>
                <View style={ov.wm}>
                  <Ionicons name="star" size={11} color={Colors.star} />
                  <Text style={ov.wr}>{w.rating}</Text>
                  <View style={ov.mb}><Text style={ov.mt}>{w.match_percent}%</Text></View>
                </View>
              </View>
            </PressableScale>
          ))}
          {item.mapHtml ? (
            <View style={ov.mapWrap}>
              <WebView source={{ html: item.mapHtml }} style={ov.map} scrollEnabled={false} javaScriptEnabled domStorageEnabled />
            </View>
          ) : null}
          {item.suggestions?.length ? (
            <View style={ov.chipRow}>
              {item.suggestions.map((s, i) => (
                <TouchableOpacity key={i} style={ov.chip} onPress={() => sendMessage(s)} activeOpacity={0.7}>
                  <Text style={ov.chipText} numberOfLines={1}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <>
      <Animated.View
        style={[
          styles.button,
          { right: MARGIN, bottom: BOTTOM_START },
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name={open ? "close" : "sparkles-outline"} size={22} color="#fff" />
      </Animated.View>

      {(open || visible) && (
        <Animated.View
          pointerEvents="box-none"
          style={[ov.backdrop, { opacity: backdropOpacity }]}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={toggle} />
        </Animated.View>
      )}

      {(open || visible) && (
        <Animated.View
          style={[
            ov.panel,
            {
              left: MARGIN,
              right: MARGIN,
              top: insets.top + 50,
              bottom: BOTTOM_START + SIZE + 12,
              opacity: panelOpacity,
              transform: [{ scale: panelScale }, { translateY: panelTranslateY }],
            },
          ]}
        >
          <View style={ov.header}>
            <View style={ov.hLeft}>
              <View style={ov.hAvatar}><Ionicons name="sparkles-outline" size={16} color="#fff" /></View>
              <Text style={ov.hTitle}>AI Suggestions</Text>
            </View>
            <PressableScale onPress={toggle} style={ov.closeBtn}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </PressableScale>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={ov.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={loading ? (
              <View style={ov.thinking}><Text style={ov.thinkingText}>Thinking...</Text></View>
            ) : null}
            renderItem={renderMessage}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={ov.inputBar}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="What do you need?"
                placeholderTextColor={Colors.icon}
                style={ov.input}
                editable={!loading}
              />
              <PressableScale haptics onPress={() => sendMessage(input.trim())} style={[ov.sendBtn, !input.trim() && ov.sendBtnDisabled]}>
                <Ionicons name="send" size={16} color="#fff" />
              </PressableScale>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 8,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});

const ov = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
    zIndex: 101,
  },
  panel: {
    position: 'absolute',
    backgroundColor: Colors.background,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 102,
    elevation: 12,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  hLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hAvatar: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  closeBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, gap: 12, paddingBottom: 8 },
  msgRowRight: { flexDirection: 'row', justifyContent: 'flex-end' },
  msgRowLeft: { flexDirection: 'row', gap: 0 },
  msgContent: { flex: 1, gap: 6 },
  userBubble: { backgroundColor: Colors.primary, padding: 10, borderRadius: 14, borderBottomRightRadius: 4, maxWidth: '85%', alignSelf: 'flex-end' },
  userText: { color: '#fff', fontSize: 14, lineHeight: 19 },
  botBubble: { backgroundColor: Colors.surface, padding: 10, borderRadius: 14, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  botText: { color: Colors.text, fontSize: 14, lineHeight: 19 },
  workerCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  wa: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  wat: { color: '#fff', fontSize: 12, fontWeight: '700' },
  wi: { flex: 1, gap: 1 },
  wn: { fontSize: 13, fontWeight: '600', color: Colors.text },
  wc: { fontSize: 11, color: Colors.textSecondary },
  wm: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  wr: { fontSize: 11, fontWeight: '600', color: Colors.text, marginRight: 4 },
  mb: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, backgroundColor: Colors.successLight },
  mt: { fontSize: 10, fontWeight: '600', color: Colors.success },
  mapWrap: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, height: 260 },
  map: { height: 260 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '500', color: Colors.primary },
  thinking: { padding: 10, borderRadius: 14, borderBottomLeftRadius: 4, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignSelf: 'flex-start' },
  thinkingText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  inputBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, height: 36, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  sendBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
