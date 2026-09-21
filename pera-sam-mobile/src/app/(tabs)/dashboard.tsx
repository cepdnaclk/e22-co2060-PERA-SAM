import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Modal,
  Pressable,
  FlatList,
  ImageBackground,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
  StatusConfig,
  AnalysisStatus,
} from '../../constants/theme';
import { FloatingOrb } from '../../components/AnimatedUI';
import { useThemeContext } from '../../lib/ThemeContext';
import { ThemeToggle } from '../../components/ThemeToggle';

const dashboardBg = require('../../../assets/images/Dashboardbg.png');

interface AnalysisRecord {
  id: string;
  created_at: string;
  category: string;
  status: AnalysisStatus;
  confidence: number;
  machine_id?: string;
  anomaly_score?: number;
  recommendation?: string;
  details?: { filename?: string };
}

export interface AppNotification {
  id: string;
  type: 'anomaly' | 'message' | 'repair' | 'system';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  route?: string;
  params?: any;
  rawTimestamp?: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useThemeContext();
  const [refreshing, setRefreshing] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Detail modal state for recent activity
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);

  // Notification state
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  // ── Fetch Dashboard Data & Notifications ──────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const storageKey = `@pera_read_notifs_${user?.id || 'guest'}`;
      let readIdSet = new Set<string>();
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          readIdSet = new Set(JSON.parse(saved));
        }
      } catch {}

      // 1. Fetch recent analyses
      const { data, count } = await supabase
        .from('analysis_results')
        .select('*', { count: 'exact' })
        .eq('user_id', user?.id ?? '')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setRecentAnalyses(data as AnalysisRecord[]);
      if (count !== null) setTotalCount(count);

      // 2. Build dynamic notifications list
      const notifList: AppNotification[] = [];

      // Add anomaly alerts from recent analyses
      if (data) {
        data.forEach((item: any) => {
          if (item.status === 'abnormal' || item.status === 'warning') {
            const isAnomaly = item.status === 'abnormal';
            const notifId = `analysis-${item.id}`;
            notifList.push({
              id: notifId,
              type: 'anomaly',
              title: isAnomaly ? '⚠️ Anomaly Detected' : '⚡ Warning Alert',
              message: `${item.category?.toUpperCase() || 'Equipment'} (Machine: ${item.machine_id || 'N/A'}) showed ${isAnomaly ? 'anomalous' : 'warning'} acoustic pattern. Health score: ${item.confidence?.toFixed(1)}%.`,
              time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isRead: readIdSet.has(notifId),
              route: '/(tabs)/history',
              rawTimestamp: new Date(item.created_at).getTime(),
            });
          }
        });
      }

      // Add repair request notifications
      if (user) {
        try {
          const { data: reqData } = await (supabase as any)
            .from('repair_requests')
            .select('*')
            .or(`user_id.eq.${user.id},company_id.eq.${user.id},assigned_to.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(10);

          if (reqData) {
            reqData.forEach((req: any) => {
              const notifId = `req-${req.id}`;
              notifList.push({
                id: notifId,
                type: 'repair',
                title: `Repair Request ${req.status?.toUpperCase() || 'UPDATE'}`,
                message: `Status updated for ${req.machine_type || 'Equipment repair'}. Tap to view details.`,
                time: new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isRead: readIdSet.has(notifId),
                route: '/(tabs)/requests',
                rawTimestamp: new Date(req.created_at).getTime(),
              });
            });
          }
        } catch {
          // Table may not exist yet
        }

        // Add real-time chat messages from technician or client
        try {
          const { data: messages } = await (supabase as any)
            .from('request_messages')
            .select('id, request_id, sender_id, content, is_read, created_at')
            .neq('sender_id', user.id)
            .order('created_at', { ascending: false })
            .limit(25);

          if (messages) {
            messages.forEach((m: any) => {
              const notifId = `msg-${m.id}`;
              const isProposal = m.content?.includes('[[APPOINTMENT_PROPOSAL:');
              const isAttachment = m.content?.includes('[[ATTACHMENT:');
              const clean = (m.content || '')
                .replace(/\[\[APPOINTMENT_PROPOSAL:[\s\S]*?:APPOINTMENT_PROPOSAL\]\]/g, '')
                .replace(/\[\[ATTACHMENT:[^\]]+\]\]/g, '')
                .trim();

              let preview = clean;
              if (!preview && isAttachment) preview = '📷 Sent a photo attachment';
              if (isProposal && !clean) preview = '📅 Proposed an appointment date & time';

              notifList.push({
                id: notifId,
                type: 'message',
                title: isProposal ? '📅 Appointment Proposal' : '💬 New Chat Message',
                message: preview || 'New message received',
                time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isRead: readIdSet.has(notifId) || m.is_read,
                route: '/chat',
                params: {
                  requestId: m.request_id,
                  isCompany: user.user_metadata?.role === 'company' ? '1' : '0',
                },
                rawTimestamp: new Date(m.created_at).getTime(),
              });
            });
          }
        } catch (e) {
          console.warn('Could not query messages for notifications:', e);
        }
      }

      // Default system welcome notification if list is empty
      if (notifList.length === 0) {
        notifList.push({
          id: 'system-welcome',
          type: 'system',
          title: '✨ Welcome to PERA-SAM',
          message: 'Equipment acoustic monitoring models are ready. Upload an audio recording to run analysis.',
          time: 'Just now',
          isRead: readIdSet.has('system-welcome'),
          route: '/(tabs)/analysis',
          rawTimestamp: Date.now(),
        });
      }

      // Sort notifications by timestamp descending (newest first)
      notifList.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));

      setNotifications(notifList);
    } catch {
      // Supabase table may not exist yet — show empty state
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Initialize data on first render & subscribe to changes
  useEffect(() => {
    fetchData();

    if (!user) return;

    // Real-time subscription for notification triggers
    const channel = supabase
      .channel('dashboard-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analysis_results' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'request_messages' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repair_requests' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, user]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const lastStatus: AnalysisStatus | null =
    recentAnalyses.length > 0 ? recentAnalyses[0].status : null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = async () => {
    const storageKey = `@pera_read_notifs_${user?.id || 'guest'}`;
    const allIds = notifications.map((n) => n.id);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(allIds));
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotifPress = async (notif: AppNotification) => {
    const storageKey = `@pera_read_notifs_${user?.id || 'guest'}`;
    try {
      const saved = await AsyncStorage.getItem(storageKey);
      const set = new Set<string>(saved ? JSON.parse(saved) : []);
      set.add(notif.id);
      await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(set)));
    } catch {}

    // Mark item as read in state so it stays permanently in the list!
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    setShowNotifModal(false);

    // Route to destination
    if (notif.route) {
      if (notif.params) {
        router.push({ pathname: notif.route as any, params: notif.params });
      } else {
        router.push(notif.route as any);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Background Image Effect (matching website dashboard) */}
      <ImageBackground
        source={dashboardBg}
        style={StyleSheet.absoluteFill}
        imageStyle={{
          opacity: isDark ? 0.08 : 0.04,
          resizeMode: 'cover',
        }}
      />
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500).delay(50)} style={[styles.header, { backgroundColor: colors.card }]}>
        {/* Gradient accent bar */}
        <View style={styles.headerGradient}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.5 }]} />
        </View>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Ionicons name="mic" size={18} color={BrandColors.white} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>PERA-SAM</Text>
        </View>

        {/* Right header actions: Theme Toggle & Notification Button */}
        <View style={styles.headerRight}>
          <ThemeToggle />
          <TouchableOpacity
            style={[
              styles.notifBtn,
              {
                backgroundColor: isDark ? '#1e293b' : BrandColors.muted,
                borderWidth: 1,
                borderColor: isDark ? '#334155' : BrandColors.border,
              },
            ]}
            onPress={() => setShowNotifModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={22}
              color={unreadCount > 0 ? BrandColors.indigo : colors.foreground}
            />
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.indigo}
            colors={[BrandColors.indigo, BrandColors.purple]}
          />
        }
      >
        {/* Welcome Banner */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <View style={styles.welcomeBanner}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.xl }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.5, borderRadius: BorderRadius.xl }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.cyan, opacity: 0.15, borderRadius: BorderRadius.xl, top: '40%' }]} />
            <FloatingOrb color="#fff" size={60} top={-10} right={10} delay={0} />
            <FloatingOrb color={BrandColors.pink} size={35} top={40} right={60} delay={600} />
            <View style={styles.welcomeContent}>
              <Text style={styles.greeting}>
                Hello, {userName}! 👋
              </Text>
              <Text style={styles.greetingSub}>
                Monitor your equipment health at a glance
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: BrandColors.indigo }]}>
            <Text style={[styles.statNumber, { color: BrandColors.indigo }]}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total Analyses</Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderLeftColor: lastStatus
                  ? StatusConfig[lastStatus].color
                  : BrandColors.mutedForeground,
              },
            ]}
          >
            <View style={styles.statusDot}>
              {lastStatus ? (
                <Ionicons
                  name={StatusConfig[lastStatus].icon as any}
                  size={26}
                  color={StatusConfig[lastStatus].color}
                />
              ) : (
                <Ionicons name="help-circle-outline" size={26} color={BrandColors.mutedForeground} />
              )}
            </View>
            <Text style={styles.statLabel}>
              {lastStatus ? StatusConfig[lastStatus].label : 'No data'}
            </Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/analysis' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: BrandColors.accentLight }]}>
              <Ionicons name="mic" size={26} color={BrandColors.accent} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>New Analysis</Text>
            <Text style={styles.actionDesc}>Upload audio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/history' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: BrandColors.purpleLight }]}>
              <Ionicons name="time" size={26} color={BrandColors.purple} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>History</Text>
            <Text style={styles.actionDesc}>Past results</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/map' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: BrandColors.blueLight }]}>
              <Ionicons name="map" size={26} color={BrandColors.blue} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>Services</Text>
            <Text style={styles.actionDesc}>Find nearby</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/appointments' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: BrandColors.emeraldLight }]}>
              <Ionicons name="calendar" size={26} color={BrandColors.emerald} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>Appointments</Text>
            <Text style={styles.actionDesc}>Schedule & track</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
          {recentAnalyses.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/history' as any)}>
              <Text style={styles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
        {recentAnalyses.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(500).delay(600)} style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="analytics-outline" size={40} color={BrandColors.indigo} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No analyses yet</Text>
            <Text style={styles.emptyDesc}>
              Upload an audio file to get your first equipment health report.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/analysis' as any)}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.md }]} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: BorderRadius.md }]} />
              <Text style={styles.emptyBtnText}>Start Analysis</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          recentAnalyses.map((item, idx) => {
            const cfg = StatusConfig[item.status] || StatusConfig.normal;
            return (
              <Animated.View key={item.id} entering={FadeInRight.duration(400).delay(600 + idx * 100)}>
                <TouchableOpacity
                  style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelectedRecord(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.activityDot, { backgroundColor: cfg.color }]} />
                  <View style={styles.activityInfo}>
                    <Text style={[styles.activityCategory, { color: colors.foreground }]}>
                      {item.category?.charAt(0).toUpperCase() + item.category?.slice(1) || 'Unknown'}
                    </Text>
                    <Text style={styles.activityDate}>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* ─── Notifications Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showNotifModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotifModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowNotifModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.notifHeader}>
              <View style={styles.notifHeaderTitleRow}>
                <Text style={[styles.notifHeaderTitle, { color: colors.foreground }]}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.notifCountBadge}>
                    <Text style={styles.notifCountText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>
              <View style={styles.notifHeaderActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
                    <Text style={styles.markReadText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifModal(false)}>
                  <Ionicons name="close-circle" size={26} color={BrandColors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Tabs: All vs Unread */}
            <View style={[styles.notifTabBar, { backgroundColor: isDark ? '#1e293b' : BrandColors.muted }]}>
              <TouchableOpacity
                style={[
                  styles.notifTab,
                  notifFilter === 'all' && [styles.notifTabActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => setNotifFilter('all')}
              >
                <Text
                  style={[
                    styles.notifTabText,
                    { color: colors.mutedForeground },
                    notifFilter === 'all' && { color: colors.foreground, fontWeight: '700' },
                  ]}
                >
                  All ({notifications.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.notifTab,
                  notifFilter === 'unread' && [styles.notifTabActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => setNotifFilter('unread')}
              >
                <Text
                  style={[
                    styles.notifTabText,
                    { color: colors.mutedForeground },
                    notifFilter === 'unread' && { color: colors.foreground, fontWeight: '700' },
                  ]}
                >
                  Unread ({unreadCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Notification List */}
            {(() => {
              const displayedNotifs = notifications.filter((n) =>
                notifFilter === 'unread' ? !n.isRead : true
              );

              return displayedNotifs.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Ionicons name="notifications-off-outline" size={40} color={BrandColors.border} />
                  <Text style={[styles.notifEmptyTitle, { color: colors.foreground }]}>
                    {notifFilter === 'unread' ? 'No unread notifications' : 'No notifications'}
                  </Text>
                  <Text style={[styles.notifEmptySub, { color: colors.mutedForeground }]}>
                    {notifFilter === 'unread' ? 'All notifications have been read!' : 'You are all caught up!'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={displayedNotifs}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.notifList}
                  renderItem={({ item }) => {
                    const iconName =
                      item.type === 'anomaly'
                        ? 'warning'
                        : item.type === 'message'
                        ? 'chatbubble-ellipses'
                        : item.type === 'repair'
                        ? 'construct'
                        : 'sparkles';

                    const iconColor =
                      item.type === 'anomaly'
                        ? BrandColors.rose
                        : item.type === 'message'
                        ? BrandColors.indigo
                        : item.type === 'repair'
                        ? BrandColors.blue
                        : BrandColors.purple;

                    const bgStyle =
                      item.type === 'anomaly'
                        ? BrandColors.roseLight
                        : item.type === 'message'
                        ? BrandColors.indigoLight
                        : item.type === 'repair'
                        ? BrandColors.blueLight
                        : BrandColors.purpleLight;

                    return (
                      <TouchableOpacity
                        style={[
                          styles.notifCard,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          !item.isRead && styles.notifCardUnread,
                        ]}
                        onPress={() => handleNotifPress(item)}
                        activeOpacity={0.8}
                      >
                        {!item.isRead && <View style={styles.unreadIndicator} />}
                        <View style={[styles.notifIconBg, { backgroundColor: bgStyle }]}>
                          <Ionicons name={iconName} size={20} color={iconColor} />
                        </View>
                        <View style={styles.notifBody}>
                          <View style={styles.notifTopRow}>
                            <Text style={[styles.notifTitle, { color: colors.foreground }]}>{item.title}</Text>
                            <Text style={styles.notifTime}>{item.time}</Text>
                          </View>
                          <Text style={styles.notifMsg} numberOfLines={2}>
                            {item.message}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Analysis Detail Modal ────────────────────────────────────────── */}
      <Modal
        visible={!!selectedRecord}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRecord(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedRecord(null)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '85%' }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedRecord && (() => {
              const cfg = StatusConfig[selectedRecord.status] || StatusConfig.normal;
              return (
                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                  {/* Modal handle */}
                  <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

                  {/* Modal Header */}
                  <View style={styles.detailModalHeader}>
                    <Text style={[styles.detailModalTitle, { color: colors.foreground }]}>Analysis Details</Text>
                    <TouchableOpacity onPress={() => setSelectedRecord(null)}>
                      <Ionicons name="close-circle" size={28} color={BrandColors.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  {/* Status Hero */}
                  <View style={[styles.modalHero, { backgroundColor: cfg.bg }]}>
                    <View style={[styles.modalHeroIcon, { backgroundColor: cfg.color }]}>
                      <Ionicons name={cfg.icon as any} size={24} color={BrandColors.white} />
                    </View>
                    <Text style={[styles.modalStatus, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>

                  {/* Details Grid */}
                  <View style={[styles.detailGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <DetailRow label="Category" value={selectedRecord.category ? selectedRecord.category.charAt(0).toUpperCase() + selectedRecord.category.slice(1) : 'Unknown'} colors={colors} even />
                    <DetailRow label="Machine ID" value={selectedRecord.machine_id || 'N/A'} colors={colors} />
                    <DetailRow label="Health Score" value={`${selectedRecord.confidence?.toFixed(1) ?? '—'}%`} colors={colors} even />
                    <DetailRow label="Anomaly Score" value={selectedRecord.anomaly_score?.toFixed(4) ?? 'N/A'} colors={colors} />
                    <DetailRow label="File" value={selectedRecord.details?.filename || 'N/A'} colors={colors} even />
                    <DetailRow
                      label="Date"
                      value={new Date(selectedRecord.created_at).toLocaleString()}
                      colors={colors}
                    />
                  </View>

                  {/* Recommendation */}
                  {selectedRecord.recommendation && (
                    <View style={styles.modalReco}>
                      <View style={styles.modalRecoIconBg}>
                        <Ionicons name="bulb" size={16} color={BrandColors.amber} />
                      </View>
                      <Text style={styles.modalRecoText}>{selectedRecord.recommendation}</Text>
                    </View>
                  )}

                  {/* Action button to Find Service Provider if not normal */}
                  {selectedRecord.status !== 'normal' && (
                    <TouchableOpacity
                      style={styles.modalActionBtn}
                      onPress={() => {
                        setSelectedRecord(null);
                        router.push('/(tabs)/map' as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="construct-outline" size={18} color={BrandColors.white} />
                      <Text style={styles.modalActionBtnText}>Find Service Provider</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  even,
  colors,
}: {
  label: string;
  value: string;
  even?: boolean;
  colors: any;
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }, even && { backgroundColor: colors.background }]}>
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: BrandColors.white,
    borderBottomWidth: 0,
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: BrandColors.indigo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.foreground,
    letterSpacing: -0.3,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: BrandColors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: BrandColors.rose,
    borderWidth: 1.5,
    borderColor: BrandColors.white,
  },

  scroll: { padding: 20, paddingBottom: 100 },

  // Welcome Banner
  welcomeBanner: {
    borderRadius: BorderRadius.xl,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
    minHeight: 120,
  },
  welcomeContent: {
    zIndex: 10,
  },
  greeting: {
    ...Typography.h2,
    color: BrandColors.white,
    marginBottom: 6,
    fontSize: 24,
  },
  greetingSub: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.lg,
    padding: 18,
    borderLeftWidth: 4,
    ...Shadows.md,
  },
  statNumber: {
    ...Typography.bigNumber,
    fontSize: 32,
  },
  statLabel: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    marginTop: 4,
    fontWeight: '500',
  },
  statusDot: { marginBottom: 4 },

  // Section title
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    ...Typography.h3,
    color: BrandColors.foreground,
    marginBottom: 14,
  },
  viewAllLink: {
    ...Typography.bodySmall,
    color: BrandColors.indigo,
    fontWeight: '700',
  },

  // Actions (borderless buttons without outer card box)
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  actionBtn: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  actionIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...Shadows.sm,
  },
  actionTitle: {
    ...Typography.label,
    color: BrandColors.foreground,
    marginBottom: 2,
    textAlign: 'center',
  },
  actionDesc: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    textAlign: 'center',
  },

  // Empty
  emptyCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BrandColors.border,
    borderStyle: 'dashed',
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: BrandColors.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    ...Typography.h3,
    color: BrandColors.foreground,
    marginBottom: 6,
  },
  emptyDesc: {
    ...Typography.bodySmall,
    color: BrandColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  emptyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.glow(BrandColors.indigo),
  },
  emptyBtnText: {
    ...Typography.button,
    color: BrandColors.white,
    fontWeight: '700',
  },

  // Activity list
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 10,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 14,
  },
  activityInfo: { flex: 1 },
  activityCategory: {
    ...Typography.label,
    color: BrandColors.foreground,
  },
  activityDate: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Notifications Modal Styles ──────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: BrandColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: BrandColors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
  },
  notifHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifHeaderTitle: { ...Typography.h2, color: BrandColors.foreground },
  notifCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: BrandColors.roseLight,
    borderRadius: BorderRadius.full,
  },
  notifCountText: { fontSize: 11, fontWeight: '800', color: BrandColors.rose },

  notifHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markReadBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  markReadText: { fontSize: 13, fontWeight: '700', color: BrandColors.indigo },

  notifTabBar: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 3,
    marginTop: 12,
    marginBottom: 4,
  },
  notifTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  notifTabActive: {
    ...Shadows.sm,
  },
  notifTabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  notifList: { paddingTop: 10, paddingBottom: 10 },
  notifCard: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BrandColors.border,
    position: 'relative',
    alignItems: 'center',
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: BrandColors.indigoLight + '20',
    borderColor: BrandColors.indigo + '30',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 14,
    left: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BrandColors.indigo,
  },
  notifIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBody: { flex: 1 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: BrandColors.foreground },
  notifTime: { fontSize: 11, color: BrandColors.mutedForeground },
  notifMsg: { fontSize: 13, color: BrandColors.mutedForeground, lineHeight: 18 },

  notifEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  notifEmptyTitle: { ...Typography.h3, color: BrandColors.foreground },
  notifEmptySub: { ...Typography.bodySmall, color: BrandColors.mutedForeground },

  // ─── Analysis Detail Modal Styles ────────────────────────────────
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  detailModalTitle: {
    ...Typography.h2,
    color: BrandColors.foreground,
  },
  modalHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderRadius: BorderRadius.xl,
    marginBottom: 20,
  },
  modalHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStatus: {
    fontSize: 22,
    fontWeight: '800',
  },
  detailGrid: {
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
  },
  detailLabel: {
    ...Typography.bodySmall,
    color: BrandColors.mutedForeground,
  },
  detailValue: {
    ...Typography.label,
    color: BrandColors.foreground,
    maxWidth: '55%',
    textAlign: 'right',
  },
  modalReco: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: BrandColors.amberLight,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
    marginBottom: 16,
  },
  modalRecoIconBg: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRecoText: {
    flex: 1,
    ...Typography.bodySmall,
    color: BrandColors.amberDark,
    lineHeight: 20,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.indigo,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    marginTop: 4,
    marginBottom: 16,
    ...Shadows.glow(BrandColors.indigo),
  },
  modalActionBtnText: {
    color: BrandColors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
