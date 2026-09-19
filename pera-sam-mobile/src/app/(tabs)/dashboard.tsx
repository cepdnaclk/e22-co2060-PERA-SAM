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
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

interface AnalysisRecord {
  id: string;
  created_at: string;
  category: string;
  status: AnalysisStatus;
  confidence: number;
  machine_id?: string;
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
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Notification state
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // ── Fetch Dashboard Data & Notifications ──────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch recent analyses
      const { data, count } = await supabase
        .from('analysis_results')
        .select('*', { count: 'exact' })
        .eq('user_id', user?.id ?? '')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setRecentAnalyses(data as AnalysisRecord[]);
      if (count !== null) setTotalCount(count);

      // 2. Build dynamic notifications list
      const notifList: AppNotification[] = [];

      // Add anomaly alerts from recent analyses
      if (data) {
        data.forEach((item: any) => {
          if (item.status === 'abnormal' || item.status === 'warning') {
            const isAnomaly = item.status === 'abnormal';
            notifList.push({
              id: `analysis-${item.id}`,
              type: 'anomaly',
              title: isAnomaly ? '⚠️ Anomaly Detected' : '⚡ Warning Alert',
              message: `${item.category?.toUpperCase() || 'Equipment'} (Machine: ${item.machine_id || 'N/A'}) showed ${isAnomaly ? 'anomalous' : 'warning'} acoustic pattern. Health score: ${item.confidence?.toFixed(1)}%.`,
              time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isRead: false,
              route: '/(tabs)/history',
            });
          }
        });
      }

      // Add unread repair requests or messages
      if (user) {
        try {
          const { data: reqData } = await (supabase as any)
            .from('repair_requests')
            .select('*')
            .eq(user.user_metadata?.role === 'company' ? 'company_id' : 'user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3);

          if (reqData) {
            reqData.forEach((req: any) => {
              notifList.push({
                id: `req-${req.id}`,
                type: 'repair',
                title: `Repair Request ${req.status.toUpperCase()}`,
                message: `Status updated for ${req.machine_type || 'Equipment repair'}. Tap to view details.`,
                time: new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isRead: false,
                route: '/(tabs)/requests',
              });
            });
          }
        } catch {
          // Table may not exist yet
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
          isRead: false,
          route: '/(tabs)/analysis',
        });
      }

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, user]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const lastStatus: AnalysisStatus | null =
    recentAnalyses.length > 0 ? recentAnalyses[0].status : null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotifPress = (notif: AppNotification) => {
    // Mark item as read
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
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500).delay(50)} style={styles.header}>
        {/* Gradient accent bar */}
        <View style={styles.headerGradient}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.5 }]} />
        </View>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Ionicons name="mic" size={18} color={BrandColors.white} />
          </View>
          <Text style={styles.headerTitle}>PERA-SAM</Text>
        </View>

        {/* Notification Button */}
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => setShowNotifModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
            size={22}
            color={unreadCount > 0 ? BrandColors.indigo : BrandColors.foreground}
          />
          {unreadCount > 0 && <View style={styles.notifDot} />}
        </TouchableOpacity>
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
          <View style={[styles.statCard, { borderLeftColor: BrandColors.indigo }]}>
            <Text style={[styles.statNumber, { color: BrandColors.indigo }]}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total Analyses</Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
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
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/analysis' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: BrandColors.accentLight }]}>
              <Ionicons name="mic" size={24} color={BrandColors.accent} />
            </View>
            <Text style={styles.actionTitle}>New Analysis</Text>
            <Text style={styles.actionDesc}>Upload audio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/history' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: BrandColors.purpleLight }]}>
              <Ionicons name="time" size={24} color={BrandColors.purple} />
            </View>
            <Text style={styles.actionTitle}>History</Text>
            <Text style={styles.actionDesc}>Past results</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/map' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: BrandColors.blueLight }]}>
              <Ionicons name="map" size={24} color={BrandColors.blue} />
            </View>
            <Text style={styles.actionTitle}>Services</Text>
            <Text style={styles.actionDesc}>Find nearby</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentAnalyses.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/history' as any)}>
              <Text style={styles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
        {recentAnalyses.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.emptyCard}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="analytics-outline" size={40} color={BrandColors.indigo} />
            </View>
            <Text style={styles.emptyTitle}>No analyses yet</Text>
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
                <View style={styles.activityCard}>
                  <View style={[styles.activityDot, { backgroundColor: cfg.color }]} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityCategory}>
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
                </View>
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
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.notifHeader}>
              <View style={styles.notifHeaderTitleRow}>
                <Text style={styles.notifHeaderTitle}>Notifications</Text>
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

            {/* Notification List */}
            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Ionicons name="notifications-off-outline" size={40} color={BrandColors.border} />
                <Text style={styles.notifEmptyTitle}>No notifications</Text>
                <Text style={styles.notifEmptySub}>You are all caught up!</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
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
                      style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
                      onPress={() => handleNotifPress(item)}
                      activeOpacity={0.8}
                    >
                      {!item.isRead && <View style={styles.unreadIndicator} />}
                      <View style={[styles.notifIconBg, { backgroundColor: bgStyle }]}>
                        <Ionicons name={iconName} size={20} color={iconColor} />
                      </View>
                      <View style={styles.notifBody}>
                        <View style={styles.notifTopRow}>
                          <Text style={styles.notifTitle}>{item.title}</Text>
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
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionCard: {
    flex: 1,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.lg,
    padding: 18,
    alignItems: 'center',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  actionIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    ...Typography.label,
    color: BrandColors.foreground,
    marginBottom: 2,
  },
  actionDesc: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
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

  notifList: { paddingTop: 14, paddingBottom: 10 },
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
});
