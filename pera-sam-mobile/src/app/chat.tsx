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
  Linking,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { useAppTheme } from '../lib/ThemeContext';
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
  request_id?: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isDark, colors } = useAppTheme();

  const params = useLocalSearchParams<{
    requestId?: string;
    technicianId?: string;
    recipientName?: string;
    recipientPhone?: string;
    specialty?: string;
    isCompany?: string;
    otherPartyName?: string;
  }>();

  const requestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const isCompany = params.isCompany === '1';
  const technicianName =
    (Array.isArray(params.recipientName) ? params.recipientName[0] : params.recipientName) ||
    (Array.isArray(params.otherPartyName) ? params.otherPartyName[0] : params.otherPartyName) ||
    (isCompany ? 'User' : 'Certified Technician');
  const technicianPhone =
    (Array.isArray(params.recipientPhone) ? params.recipientPhone[0] : params.recipientPhone) ||
    '+94 81 238 8888';
  const specialty =
    (Array.isArray(params.specialty) ? params.specialty[0] : params.specialty) ||
    'Acoustic Diagnostic Specialist';

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { animatedStyle: sendBtnAnim, onPressIn, onPressOut } = useScalePress();

  // ── Fetch messages ─────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!requestId) {
      // In direct technician chat or demo mode, provide welcome greeting
      setMessages([
        {
          id: 'welcome-msg-1',
          sender_id: 'technician-auto',
          content: t('autoReplyGreeting'),
          is_read: true,
          created_at: new Date(Date.now() - 60000).toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('request_messages')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const fetched = (data as Message[]) || [];
      if (fetched.length === 0) {
        setMessages([
          {
            id: 'welcome-msg-1',
            sender_id: 'technician-auto',
            content: t('autoReplyGreeting'),
            is_read: true,
            created_at: new Date(Date.now() - 60000).toISOString(),
          },
        ]);
      } else {
        setMessages(fetched);
      }

      // Mark unread messages as read
      if (user) {
        await (supabase as any)
          .from('request_messages')
          .update({ is_read: true })
          .eq('request_id', requestId)
          .neq('sender_id', user.id)
          .eq('is_read', false);
      }
    } catch {
      // Fallback message
      setMessages([
        {
          id: 'welcome-msg-1',
          sender_id: 'technician-auto',
          content: t('autoReplyGreeting'),
          is_read: true,
          created_at: new Date(Date.now() - 60000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [requestId, user, t]);

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
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

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

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // ── Call Technician Handler ────────────────────────────────────────────
  const handleCallTechnician = () => {
    Alert.alert(
      t('callTechnicianAlertTitle'),
      `${t('callTechnicianAlertMsg')} ${technicianName} (${technicianPhone})?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('callNow'),
          onPress: () => {
            Linking.openURL(`tel:${technicianPhone}`).catch(() => {
              Alert.alert('Calling Failed', 'Could not open phone dialer on this device.');
            });
          },
        },
      ]
    );
  };

  // ── Send SMS Handler ───────────────────────────────────────────────────
  const handleSmsTechnician = () => {
    const smsUrl = `sms:${technicianPhone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(
      'Hello, I am contacting you via the PERA-SAM mobile app regarding equipment acoustic diagnostics.'
    )}`;
    Linking.openURL(smsUrl).catch(() => {
      Alert.alert('SMS Failed', 'Could not open SMS app on this device.');
    });
  };

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const senderId = user?.id || 'current-user';
    const optimisticMsg: Message = {
      id: tempId,
      request_id: requestId,
      sender_id: senderId,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    if (!requestId) {
      // Simulate technician direct interactive reply
      setTimeout(() => {
        const replyMsg: Message = {
          id: `reply-${Date.now()}`,
          sender_id: 'technician-auto',
          content: `Thanks for the details. I am reviewing your machine acoustic profile and will get back to you shortly. You can also call me directly at ${technicianPhone}.`,
          is_read: true,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, replyMsg]);
        setSending(false);
      }, 1200);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('request_messages')
        .insert({
          request_id: requestId,
          sender_id: senderId,
          content,
          is_read: false,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Message) : m)));
      }
    } catch {
      // Keep optimistic message
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === (user?.id || 'current-user');
    const time = new Date(item.created_at);
    const timeStr = time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDate =
      !prevMsg ||
      new Date(prevMsg.created_at).toDateString() !== time.toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              {new Date(item.created_at).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
          </View>
        )}

        <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}>
          {!isMe && (
            <View
              style={[
                styles.senderAvatar,
                { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.25)' : BrandColors.indigoLight },
              ]}
            >
              <Ionicons name="construct" size={14} color={colors.indigo} />
            </View>
          )}

          <View
            style={[
              styles.bubble,
              isMe
                ? [styles.myBubble, { backgroundColor: colors.indigo }]
                : [
                    styles.otherBubble,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ],
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                isMe
                  ? styles.myBubbleText
                  : [styles.otherBubbleText, { color: colors.foreground }],
              ]}
            >
              {item.content}
            </Text>
            <View style={styles.bubbleMeta}>
              <Text
                style={[
                  styles.timeText,
                  isMe ? styles.myTimeText : { color: colors.mutedForeground },
                ]}
              >
                {timeStr}
              </Text>
              {isMe && (
                <Ionicons
                  name={item.is_read ? 'checkmark-done' : 'checkmark'}
                  size={12}
                  color="rgba(255,255,255,0.7)"
                  style={styles.checkIcon}
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header with Call & SMS Buttons */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text
            style={[styles.headerName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {technicianName}
          </Text>
          <View style={styles.headerStatusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerStatusText} numberOfLines={1}>
              {specialty}
            </Text>
          </View>
        </View>

        {/* ── Direct Phone Call & SMS Actions in Header ───────────────────── */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerCallBtn}
            onPress={handleCallTechnician}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={16} color={BrandColors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerSmsBtn,
              { backgroundColor: colors.muted },
            ]}
            onPress={handleSmsTechnician}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.indigo} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            {t('loading')}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              borderTopWidth: 1,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            placeholder={t('typeMessagePlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />

          <Animated.View style={sendBtnAnim}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: colors.indigo },
                !newMessage.trim() && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={BrandColors.white} />
              ) : (
                <Ionicons name="send" size={18} color={BrandColors.white} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    ...Shadows.sm,
  },
  backBtn: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BrandColors.success,
  },
  headerStatusText: {
    fontSize: 12,
    color: BrandColors.success,
    fontWeight: '500',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCallBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: BrandColors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  headerSmsBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },

  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },

  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },

  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
    gap: 8,
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
    ...Shadows.sm,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myBubbleText: {
    color: BrandColors.white,
  },
  otherBubbleText: {},

  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  checkIcon: {
    marginLeft: 2,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
