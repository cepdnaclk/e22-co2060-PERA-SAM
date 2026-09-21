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
  Image,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/AuthContext';
import { useThemeContext } from '../lib/ThemeContext';
import { supabase } from '../lib/supabase';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { useScalePress } from '../components/AnimatedUI';
import {
  AppointmentProposal,
  encodeAppointmentProposal,
  parseChatMessage,
  saveApprovedAppointment,
} from '../lib/appointmentUtils';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  attachment_urls?: string[] | null;
  is_read: boolean;
  created_at: string;
}

// Preset time slots
const TIME_SLOT_PRESETS = [
  '09:00 AM - 12:00 PM',
  '01:00 PM - 04:00 PM',
  '04:00 PM - 07:00 PM',
  'Flexible all day',
];

// Helper to get formatted date string (YYYY-MM-DD)
function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useThemeContext();
  const params = useLocalSearchParams<{
    requestId: string;
    isCompany: string;
    otherPartyName: string;
  }>();

  const requestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const isCompany = params.isCompany === '1' || user?.user_metadata?.role === 'company';
  const otherPartyName = (Array.isArray(params.otherPartyName) ? params.otherPartyName[0] : params.otherPartyName) || (isCompany ? 'User' : 'Company');

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Proposal Modal State
  const [proposalModalVisible, setProposalModalVisible] = useState(false);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [propStartDate, setPropStartDate] = useState(formatDateStr(tomorrow));
  const [propEndDate, setPropEndDate] = useState('');
  const [propTimeRange, setPropTimeRange] = useState(TIME_SLOT_PRESETS[0]);
  const [propNote, setPropNote] = useState('');

  // Confirmation Modal State (Company side)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmingProposal, setConfirmingProposal] = useState<{ proposal: AppointmentProposal; messageId: string } | null>(null);
  const [confirmedDateInput, setConfirmedDateInput] = useState('');
  const [confirmedTimeInput, setConfirmedTimeInput] = useState('');
  const [confirmingSaving, setConfirmingSaving] = useState(false);

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

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // ── Pick Images from library ──────────────────────────────────────────
  const handlePickImages = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow access to your photos to attach pictures.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 5,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uris = res.assets.map((a) => a.uri);
        setSelectedImages((prev) => [...prev, ...uris]);
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not open image picker: ' + e.message);
    }
  };

  // ── Upload an image to storage or fallback ────────────────────────────
  const uploadImageUri = async (uri: string): Promise<string> => {
    try {
      const ext = uri.split('.').pop() || 'jpg';
      const filename = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('repair-photos')
        .upload(`chats/${requestId}/${filename}`, blob, {
          contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
          upsert: false,
        });

      if (!error && data) {
        const { data: pubData } = supabase.storage
          .from('repair-photos')
          .getPublicUrl(data.path);
        return pubData.publicUrl;
      }
    } catch (e) {
      console.warn('Storage upload error, retaining original URI:', e);
    }
    return uri;
  };

  // ── Core Post Message Function ────────────────────────────────────────
  const postMessageWithContent = async (rawContent: string, attachedUrls: string[] = []) => {
    if (!user || !requestId) return;

    let finalContent = rawContent;
    // Encode any attachments inside the text marker for cross-compatibility
    if (attachedUrls.length > 0) {
      const tagStr = attachedUrls.map((url) => `[[ATTACHMENT:${url}]]`).join('\n');
      finalContent = finalContent ? `${finalContent}\n\n${tagStr}` : tagStr;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      request_id: requestId,
      sender_id: user.id,
      content: finalContent,
      attachment_urls: attachedUrls.length > 0 ? attachedUrls : null,
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
          content: finalContent,
          attachment_urls: attachedUrls.length > 0 ? attachedUrls : null,
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
      throw err;
    }
  };

  // ── Send standard text and any selected images ────────────────────────
  const handleSend = async () => {
    if ((!newMessage.trim() && selectedImages.length === 0) || !user || !requestId) return;

    const content = newMessage.trim();
    const imagesToUpload = [...selectedImages];
    setNewMessage('');
    setSelectedImages([]);
    setSending(true);

    try {
      // Upload images first
      const uploadedUrls: string[] = [];
      for (const imgUri of imagesToUpload) {
        const url = await uploadImageUri(imgUri);
        uploadedUrls.push(url);
      }

      await postMessageWithContent(content, uploadedUrls);
    } catch (err: any) {
      Alert.alert('Send Error', err.message || 'Failed to send message.');
      setNewMessage(content);
      setSelectedImages(imagesToUpload);
    } finally {
      setSending(false);
    }
  };

  // ── Send Appointment Proposal ─────────────────────────────────────────
  const handleSendProposal = async () => {
    if (!propStartDate.trim()) {
      Alert.alert('Missing Date', 'Please enter a valid start date (YYYY-MM-DD).');
      return;
    }

    const proposal: AppointmentProposal = {
      type: 'appointment_proposal',
      proposalId: `prop_${Date.now()}`,
      startDate: propStartDate.trim(),
      endDate: propEndDate.trim() || undefined,
      timeRange: propTimeRange.trim() || TIME_SLOT_PRESETS[0],
      note: propNote.trim() || undefined,
      status: 'proposed',
    };

    const encodedMsg = encodeAppointmentProposal(proposal, newMessage.trim());
    setProposalModalVisible(false);
    setNewMessage('');

    setSending(true);
    try {
      await postMessageWithContent(encodedMsg);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send proposal.');
    } finally {
      setSending(false);
    }
  };

  // ── Open Approval modal for Company ───────────────────────────────────
  const openApproveModal = (proposal: AppointmentProposal, msgId: string) => {
    setConfirmingProposal({ proposal, messageId: msgId });
    setConfirmedDateInput(proposal.startDate);
    setConfirmedTimeInput(proposal.timeRange || TIME_SLOT_PRESETS[0]);
    setConfirmModalVisible(true);
  };

  // ── Confirm & Schedule Appointment (Company Action) ───────────────────
  const handleConfirmAppointment = async () => {
    if (!confirmingProposal || !confirmedDateInput.trim()) {
      Alert.alert('Missing Information', 'Please provide a confirmed date (YYYY-MM-DD).');
      return;
    }

    setConfirmingSaving(true);
    try {
      const finalSlot = confirmedTimeInput.trim() || '09:00 AM - 12:00 PM';
      // 1. Save to repair_requests table and sync calendar
      const saveRes = await saveApprovedAppointment(
        requestId,
        confirmedDateInput.trim(),
        finalSlot
      );

      if (!saveRes.success) {
        throw new Error(saveRes.error);
      }

      // 2. Broadcast confirmed proposal message into chat
      const updatedProposal: AppointmentProposal = {
        ...confirmingProposal.proposal,
        status: 'accepted',
        confirmedDate: confirmedDateInput.trim(),
        confirmedTime: finalSlot,
        confirmedBy: user?.id,
      };

      const confirmationText = `✅ Appointment Confirmed! Service scheduled for ${confirmedDateInput.trim()} during ${finalSlot}. It has been added to the appointments schedule.`;
      const encodedMsg = encodeAppointmentProposal(updatedProposal, confirmationText);

      await postMessageWithContent(encodedMsg);
      setConfirmModalVisible(false);
      setConfirmingProposal(null);
      Alert.alert('Appointment Confirmed', `The service appointment is scheduled for ${confirmedDateInput.trim()} and automatically synced to the calendar!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to confirm appointment.');
    } finally {
      setConfirmingSaving(false);
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

    const parsed = parseChatMessage(item.content, item.attachment_urls);

    return (
      <View key={item.id}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
            <View style={[styles.datePill, { backgroundColor: isDark ? '#1e293b' : BrandColors.muted }]}>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                {time.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: time.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                })}
              </Text>
            </View>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
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

          <View style={[styles.bubble, isMe ? styles.bubbleMe : [styles.bubbleOther, { backgroundColor: colors.card, borderColor: colors.border }]]}>
            {/* Gradient background for own messages */}
            {isMe && (
              <>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: 18, borderBottomRightRadius: 4 }]} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: 18, borderBottomRightRadius: 4 }]} />
              </>
            )}

            {/* Clean Message Text */}
            {parsed.cleanText ? (
              <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : [styles.bubbleTextOther, { color: colors.foreground }]]}>
                {parsed.cleanText}
              </Text>
            ) : null}

            {/* Photo Attachments */}
            {parsed.attachments.length > 0 && (
              <View style={styles.attachmentsGrid}>
                {parsed.attachments.map((imgUrl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setFullScreenImage(imgUrl)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: imgUrl }}
                      style={styles.attachmentImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Interactive Appointment Proposal Card */}
            {parsed.proposal && (
              <View style={[
                styles.proposalCard,
                {
                  backgroundColor: isMe
                    ? 'rgba(255,255,255,0.12)'
                    : isDark ? '#1e293b' : '#f8fafc',
                  borderColor: parsed.proposal.status === 'accepted'
                    ? BrandColors.emerald
                    : BrandColors.amber,
                }
              ]}>
                <View style={styles.proposalHeader}>
                  <View style={styles.proposalHeaderTitle}>
                    <Ionicons
                      name="calendar"
                      size={16}
                      color={parsed.proposal.status === 'accepted' ? BrandColors.emerald : BrandColors.amber}
                    />
                    <Text style={[styles.proposalTitle, { color: isMe ? BrandColors.white : colors.foreground }]}>
                      Appointment {parsed.proposal.status === 'accepted' ? 'Confirmed' : 'Proposal'}
                    </Text>
                  </View>
                  <View style={[
                    styles.proposalBadge,
                    {
                      backgroundColor: parsed.proposal.status === 'accepted'
                        ? BrandColors.emeraldLight
                        : BrandColors.amberLight,
                    }
                  ]}>
                    <Text style={[
                      styles.proposalBadgeText,
                      {
                        color: parsed.proposal.status === 'accepted'
                          ? BrandColors.emerald
                          : BrandColors.amberDark,
                      }
                    ]}>
                      {parsed.proposal.status === 'accepted' ? 'Scheduled' : 'Proposed'}
                    </Text>
                  </View>
                </View>

                {/* Proposal Info Rows */}
                <View style={styles.proposalDetails}>
                  <View style={styles.proposalRow}>
                    <Ionicons name="calendar-outline" size={13} color={isMe ? 'rgba(255,255,255,0.8)' : colors.mutedForeground} />
                    <Text style={[styles.proposalDetailText, { color: isMe ? BrandColors.white : colors.foreground }]}>
                      Dates: {parsed.proposal.startDate} {parsed.proposal.endDate && parsed.proposal.endDate !== parsed.proposal.startDate ? `to ${parsed.proposal.endDate}` : ''}
                    </Text>
                  </View>
                  <View style={styles.proposalRow}>
                    <Ionicons name="time-outline" size={13} color={isMe ? 'rgba(255,255,255,0.8)' : colors.mutedForeground} />
                    <Text style={[styles.proposalDetailText, { color: isMe ? BrandColors.white : colors.foreground }]}>
                      Time: {parsed.proposal.timeRange}
                    </Text>
                  </View>
                  {parsed.proposal.note ? (
                    <View style={styles.proposalRow}>
                      <Ionicons name="document-text-outline" size={13} color={isMe ? 'rgba(255,255,255,0.8)' : colors.mutedForeground} />
                      <Text style={[styles.proposalDetailText, { color: isMe ? BrandColors.white : colors.foreground }]}>
                        Note: {parsed.proposal.note}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* If Confirmed, highlight the confirmed slot */}
                {parsed.proposal.status === 'accepted' && (
                  <View style={styles.confirmedBanner}>
                    <Ionicons name="checkmark-circle" size={16} color={BrandColors.emerald} />
                    <Text style={styles.confirmedBannerText}>
                      Confirmed for {parsed.proposal.confirmedDate} ({parsed.proposal.confirmedTime})
                    </Text>
                  </View>
                )}

                {/* Company Action: Approve & Confirm Date */}
                {isCompany && parsed.proposal.status === 'proposed' && (
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => openApproveModal(parsed.proposal!, item.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-done-circle" size={16} color={BrandColors.white} />
                    <Text style={styles.approveBtnText}>Approve & Confirm Date</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Bubble Time & Status */}
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                {timeStr}
              </Text>
              {isMe && (
                <Ionicons
                  name={item.is_read ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={item.is_read ? '#a5f3fc' : 'rgba(255,255,255,0.6)'}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerGradient}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.5 }]} />
        </View>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? '#1e293b' : BrandColors.muted }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {otherPartyName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>{otherPartyName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              {isCompany ? 'Customer Service Request' : 'Verified Technician / Company'}
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
            <Text style={[styles.emptyChatTitle, { color: colors.foreground }]}>Start a conversation</Text>
            <Text style={[styles.emptyChatDesc, { color: colors.mutedForeground }]}>
              Send a message to {otherPartyName}, attach photos of the machine, or propose an appointment date.
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

        {/* Selected Images Preview Strip */}
        {selectedImages.length > 0 && (
          <View style={[styles.previewBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewScroll}>
              {selectedImages.map((uri, i) => (
                <View key={i} style={styles.previewThumbWrap}>
                  <Image source={{ uri }} style={styles.previewThumb} />
                  <TouchableOpacity
                    style={styles.previewRemoveBtn}
                    onPress={() => setSelectedImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close" size={14} color={BrandColors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {/* Attach Picture Button */}
          <TouchableOpacity
            style={[styles.inputActionBtn, { backgroundColor: isDark ? '#1e293b' : BrandColors.muted }]}
            onPress={handlePickImages}
            disabled={sending}
          >
            <Ionicons name="image-outline" size={20} color={BrandColors.indigo} />
          </TouchableOpacity>

          {/* Propose Appointment Date/Time Button */}
          <TouchableOpacity
            style={[styles.inputActionBtn, { backgroundColor: isDark ? '#1e293b' : BrandColors.muted }]}
            onPress={() => setProposalModalVisible(true)}
            disabled={sending}
          >
            <Ionicons name="calendar-outline" size={20} color={BrandColors.emerald} />
          </TouchableOpacity>

          {/* Text Input */}
          <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder="Type a message or issue..."
              placeholderTextColor={colors.mutedForeground}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
          </View>

          {/* Send Button */}
          <Animated.View style={sendBtnAnim}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!newMessage.trim() && selectedImages.length === 0 || sending) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={(!newMessage.trim() && selectedImages.length === 0) || sending}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: 24 }]} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: 24 }]} />
              {sending ? (
                <ActivityIndicator size="small" color={BrandColors.white} />
              ) : (
                <Ionicons name="send" size={18} color={BrandColors.white} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {/* ─── Propose Appointment Modal ────────────────────────────────────── */}
      <Modal
        visible={proposalModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProposalModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setProposalModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={20} color={BrandColors.emerald} />
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Propose Appointment</Text>
              </View>
              <TouchableOpacity onPress={() => setProposalModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                placeholder="2026-09-25"
                placeholderTextColor={colors.mutedForeground}
                value={propStartDate}
                onChangeText={setPropStartDate}
              />

              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>End Date / Range (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                placeholder="2026-09-28 (Leave empty if single day)"
                placeholderTextColor={colors.mutedForeground}
                value={propEndDate}
                onChangeText={setPropEndDate}
              />

              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Preferred Time Slot</Text>
              <View style={styles.slotPresets}>
                {TIME_SLOT_PRESETS.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotChip,
                      { backgroundColor: propTimeRange === slot ? BrandColors.indigo : (isDark ? '#1e293b' : BrandColors.muted) },
                    ]}
                    onPress={() => setPropTimeRange(slot)}
                  >
                    <Text style={[styles.slotChipText, { color: propTimeRange === slot ? BrandColors.white : colors.foreground }]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Note or Instructions (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, height: 64 }]}
                placeholder="e.g. Afternoon is best, access from back door"
                placeholderTextColor={colors.mutedForeground}
                value={propNote}
                onChangeText={setPropNote}
                multiline
              />

              <TouchableOpacity
                style={styles.submitProposalBtn}
                onPress={handleSendProposal}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color={BrandColors.white} />
                <Text style={styles.submitProposalBtnText}>Send Proposal in Chat</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Company Confirmation Modal ───────────────────────────────────── */}
      <Modal
        visible={confirmModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={22} color={BrandColors.emerald} />
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Approve & Confirm Date</Text>
              </View>
              <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                Select the confirmed repair date and time slot. This will automatically schedule the appointment and add it to the calendar.
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Confirmed Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={confirmedDateInput}
                onChangeText={setConfirmedDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Confirmed Time Slot</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={confirmedTimeInput}
                onChangeText={setConfirmedTimeInput}
                placeholder="09:00 AM - 12:00 PM"
                placeholderTextColor={colors.mutedForeground}
              />

              <TouchableOpacity
                style={[styles.submitConfirmBtn, confirmingSaving && { opacity: 0.6 }]}
                onPress={handleConfirmAppointment}
                disabled={confirmingSaving}
                activeOpacity={0.8}
              >
                {confirmingSaving ? (
                  <ActivityIndicator size="small" color={BrandColors.white} />
                ) : (
                  <>
                    <Ionicons name="calendar" size={18} color={BrandColors.white} />
                    <Text style={styles.submitProposalBtnText}>Confirm & Add to Calendar</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Fullscreen Image Lightbox Modal ──────────────────────────────── */}
      <Modal
        visible={!!fullScreenImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setFullScreenImage(null)}>
            <Ionicons name="close" size={28} color={BrandColors.white} />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.lightboxImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BrandColors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  messageList: { padding: 16, paddingBottom: 16 },

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
  bubbleRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },

  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    marginTop: 6,
    alignSelf: 'flex-end',
    position: 'relative',
    zIndex: 1,
  },
  bubbleTime: { fontSize: 10, fontWeight: '600' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeOther: { color: BrandColors.mutedForeground },

  // Attachments in bubble
  attachmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  attachmentImg: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },

  // Proposal Card in bubble
  proposalCard: {
    marginTop: 8,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proposalHeaderTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proposalTitle: { fontSize: 13, fontWeight: '800' },
  proposalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  proposalBadgeText: { fontSize: 10, fontWeight: '800' },
  proposalDetails: { gap: 4, marginBottom: 8 },
  proposalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proposalDetailText: { fontSize: 12, fontWeight: '600' },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    marginTop: 4,
  },
  confirmedBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.emerald,
    flex: 1,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: BrandColors.emerald,
    marginTop: 8,
  },
  approveBtnText: {
    color: BrandColors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Preview bar
  previewBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  previewScroll: { flexDirection: 'row', gap: 10 },
  previewThumbWrap: { position: 'relative' },
  previewThumb: { width: 56, height: 56, borderRadius: 10 },
  previewRemoveBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: BrandColors.rose,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: BrandColors.white,
    borderTopWidth: 1,
    borderTopColor: BrandColors.border,
    gap: 8,
  },
  inputActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 90,
  },
  textInput: {
    fontSize: 14,
    maxHeight: 70,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sendBtnDisabled: { opacity: 0.35 },

  // Loading / Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: BrandColors.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyChatTitle: { ...Typography.h3, marginBottom: 6 },
  emptyChatDesc: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { ...Typography.h3, fontSize: 17 },
  modalSub: { ...Typography.bodySmall, marginBottom: 12, lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  slotPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  slotChipText: { fontSize: 12, fontWeight: '600' },
  submitProposalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.indigo,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    marginTop: 18,
    ...Shadows.glow(BrandColors.indigo),
  },
  submitProposalBtnText: { color: BrandColors.white, fontWeight: '700', fontSize: 14 },
  submitConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.emerald,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    marginTop: 18,
    ...Shadows.glow(BrandColors.emerald),
  },

  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImg: {
    width: '94%',
    height: '80%',
  },
});
