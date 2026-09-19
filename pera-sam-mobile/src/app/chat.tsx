import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { useScalePress } from '../components/AnimatedUI';



// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    requestId: string;
    isCompany: string;
    otherPartyName: string;
  }>();

  const requestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const isCompany = params.isCompany === '1';
  const otherPartyName = (Array.isArray(params.otherPartyName) ? params.otherPartyName[0] : params.otherPartyName) || (isCompany ? 'User' : 'Company');

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { animatedStyle: sendBtnAnim, onPressIn, onPressOut } = useScalePress();

  // ── Fetch messages ─────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!requestId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('request_messages')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);

      // Mark unread messages as read
      if (user) {
        await (supabase as any)
          .from('request_messages')
          .update({ is_read: true })
          .eq('request_id', requestId)
          .neq('sender_id', user.id)
          .eq('is_read', false);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [requestId, user]);

  useEffect(() => {
    fetchMessages();

    if (!requestId) return;

    // Real-time subscription for new messages
    const channel = supabase
      .channel(`chat-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read if it's from the other party
          if (user && newMsg.sender_id !== user.id) {
            (supabase as any)
              .from('request_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, fetchMessages, user]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !user || !requestId) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      request_id: requestId,
      sender_id: user.id,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error } = await (supabase as any)
        .from('request_messages')
        .insert({
          request_id: requestId,
          sender_id: user.id,
          content,
          is_read: false,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Message) : m)));
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  // ── Render message bubble ─────────────────────────────────────────────
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const time = new Date(item.created_at);
    const timeStr = time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    // Show date separator if first message or different day
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDate =
      !prevMsg ||
      new Date(prevMsg.created_at).toDateString() !== time.toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <View style={styles.datePill}>
              <Text style={styles.dateLabel}>
                {time.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: time.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                })}
              </Text>
            </View>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
          {!isMe && (
            <View style={styles.bubbleAvatar}>
              <Text style={styles.bubbleAvatarText}>
                {otherPartyName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            {/* Gradient background for own messages */}
            {isMe && (
              <>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: 18, borderBottomRightRadius: 4 }]} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: 18, borderBottomRightRadius: 4 }]} />
              </>
            )}
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
              {item.content}
            </Text>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                {timeStr}
              </Text>
              {isMe && (
                <Ionicons
                  name={item.is_read ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={item.is_read ? '#a5f3fc' : 'rgba(255,255,255,0.5)'}
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        {/* Gradient accent bar */}
        <View style={styles.headerGradient}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.5 }]} />
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={BrandColors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {otherPartyName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{otherPartyName}</Text>
            <Text style={styles.headerSubtitle}>
              {isCompany ? 'Customer' : 'Service Provider'}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.indigo} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatIcon}>
              <Ionicons name="chatbubbles-outline" size={40} color={BrandColors.indigo} />
            </View>
            <Text style={styles.emptyChatTitle}>Start a conversation</Text>
            <Text style={styles.emptyChatDesc}>
              Send a message to {otherPartyName} about your repair request.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={BrandColors.mutedForeground}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
          </View>
          <Animated.View style={sendBtnAnim}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!newMessage.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={!newMessage.trim() || sending}
            >
              {/* Gradient send button */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: 24 }]} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: 24 }]} />
              {sending ? (
                <ActivityIndicator size="small" color={BrandColors.white} />
              ) : (
                <Ionicons name="send" size={20} color={BrandColors.white} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BrandColors.white,
    gap: 12,
    ...Shadows.sm,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: BrandColors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BrandColors.indigo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.white,
  },
  headerName: { ...Typography.label, color: BrandColors.foreground, fontSize: 15 },
  headerSubtitle: { ...Typography.caption, color: BrandColors.mutedForeground },

  // Chat container
  chatContainer: { flex: 1 },
  messageList: { padding: 16, paddingBottom: 8 },

  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: BrandColors.border },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: BrandColors.muted,
    borderRadius: BorderRadius.full,
  },
  dateLabel: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    fontWeight: '700',
  },

  // Bubbles
  bubbleRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },

  bubbleAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BrandColors.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bubbleAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.purple,
  },

  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 18,
    overflow: 'hidden',
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: BrandColors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },

  bubbleText: { fontSize: 15, lineHeight: 21, position: 'relative', zIndex: 1 },
  bubbleTextMe: { color: BrandColors.white },
  bubbleTextOther: { color: BrandColors.foreground },

  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
    position: 'relative',
    zIndex: 1,
  },
  bubbleTime: { fontSize: 10, fontWeight: '600' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeOther: { color: BrandColors.mutedForeground },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: BrandColors.white,
    borderTopWidth: 0,
    gap: 10,
    ...Shadows.sm,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BrandColors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    backgroundColor: BrandColors.background,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: BrandColors.foreground,
    maxHeight: 80,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.glow(BrandColors.indigo),
  },
  sendBtnDisabled: { opacity: 0.4 },

  // Loading / Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyChatIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: BrandColors.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyChatTitle: { ...Typography.h3, color: BrandColors.foreground, marginBottom: 8 },
  emptyChatDesc: {
    ...Typography.body,
    color: BrandColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
});
