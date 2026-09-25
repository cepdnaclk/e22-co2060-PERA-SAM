import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Pressable,
  FlatList,
  Linking,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, ReduceMotion } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/i18n';
import { DynamicThemeColors, useAppTheme } from '../../lib/ThemeContext';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
  StatusConfig,
  AnalysisStatus,
} from '../../constants/theme';
import { AcousticSignature, MotionButton } from '../../components/AnimatedUI';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { t, language, setLanguage } = useLanguage();
  const { isDark, colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
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
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(360).delay(25).reduceMotion(ReduceMotion.System)}
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Ionicons name="mic" size={18} color={BrandColors.white} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>PERA-SAM</Text>
        </View>

        {/* Right Actions: Language Switcher + Notification Button */}
        <View style={styles.headerRightActions}>
          <MotionButton
            accessibilityLabel="Change language"
            style={[
              styles.langBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(99, 102, 241, 0.25)'
                  : BrandColors.indigoLight,
              },
            ]}
            onPress={() => {
              const next = language === 'en' ? 'si' : language === 'si' ? 'ta' : 'en';
              setLanguage(next);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.langBadgeText, { color: colors.indigo }]}>
              {language === 'en' ? 'EN' : language === 'si' ? 'සිං' : 'த'}
            </Text>
          </MotionButton>

          <MotionButton
            accessibilityLabel="Open notifications"
            style={[styles.notifBtn, { backgroundColor: colors.muted }]}
            onPress={() => setShowNotifModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={20}
              color={unreadCount > 0 ? colors.indigo : colors.foreground}
            />
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </MotionButton>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.indigo}
            colors={[BrandColors.indigo, BrandColors.purple]}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(350).reduceMotion(ReduceMotion.System)} style={styles.welcomeIntro}>
          <Text style={styles.welcomeLabel}>{t('welcomeBack')}</Text>
          <Text style={styles.userName}>{userName}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(60).reduceMotion(ReduceMotion.System)}>
          <View style={styles.welcomeBanner}>
            <View style={styles.heroEyebrow}>
              <Ionicons name="pulse" size={16} color="#5eead4" />
              <Text style={styles.heroEyebrowText}>{t('acousticIntelligence')}</Text>
            </View>
            <Text style={styles.greeting}>{t('heroTitle')}</Text>
            <Text style={styles.greetingSub}>{t('heroDescription')}</Text>
            <AcousticSignature />
            <MotionButton style={styles.heroButton} onPress={() => router.push('/(tabs)/analysis')}>
              <Ionicons name="mic-outline" size={20} color="#102c38" />
              <Text style={styles.heroButtonText}>{t('runAnalysis')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#102c38" />
            </MotionButton>
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.duration(360).delay(100).reduceMotion(ReduceMotion.System)} style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="analytics-outline" size={18} color={colors.indigo} />
            <Text style={[styles.statNumber, { color: colors.indigo }]}>{totalCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {t('totalAnalyses')}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.statEyebrow}>{t('lastAnalysis')}</Text>
            <View style={styles.statusDot}>
              {lastStatus ? (
                <Ionicons
                  name={StatusConfig[lastStatus].icon as any}
                  size={26}
                  color={StatusConfig[lastStatus].color}
                />
              ) : (
                <Ionicons name="help-circle-outline" size={26} color={colors.mutedForeground} />
              )}
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {lastStatus ? StatusConfig[lastStatus].label : 'No data'}
            </Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(360).delay(150).reduceMotion(ReduceMotion.System)}>
          <Text style={styles.sectionTitle}>
            {t('quickAccess')}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(360).delay(200).reduceMotion(ReduceMotion.System)} style={styles.actionsRow}>
          <MotionButton
            style={[
              styles.actionCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/(tabs)/history' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: BrandColors.purpleLight }]}>
              <Ionicons name="time" size={22} color={BrandColors.purple} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>
              {t('tabHistory')}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
              {t('recentActivity')}
            </Text>
          </MotionButton>

          <MotionButton
            style={[
              styles.actionCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/(tabs)/map' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: BrandColors.blueLight }]}>
              <Ionicons name="construct" size={22} color={BrandColors.blue} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>
              {t('tabTechnicians')}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
              {t('findNearbyTechs')}
            </Text>
          </MotionButton>
        </Animated.View>

        {/* ── Technicians & Rapid Support Banner ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(360).delay(225).reduceMotion(ReduceMotion.System)}>
          <View
            style={[
              styles.supportBanner,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.supportBannerLeft}>
              <View
                style={[
                  styles.supportIconBg,
                  {
                    backgroundColor: isDark
                      ? 'rgba(16, 185, 129, 0.2)'
                      : BrandColors.emeraldLight,
                  },
                ]}
              >
                <Ionicons name="headset" size={22} color={BrandColors.emerald} />
              </View>
              <View style={styles.supportTextContainer}>
                <Text style={[styles.supportTitle, { color: colors.foreground }]}>
                  {t('findNearbyTechs')}
                </Text>
                <Text
                  style={[styles.supportSubtitle, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {t('findTechDesc')}
                </Text>
              </View>
            </View>

            <View style={styles.supportActionRow}>
              {/* Quick Call Hotline / Certified Tech */}
              <MotionButton
                style={styles.supportCallBtn}
                onPress={() => {
                  Alert.alert(
                    t('callTechnicianAlertTitle'),
                    `${t('callTechnicianAlertMsg')} Peradeniya Industrial Hotline (+94 81 238 8888)?`,
                    [
                      { text: t('cancel'), style: 'cancel' },
                      {
                        text: t('callNow'),
                        onPress: () => {
                          Linking.openURL('tel:+94812388888').catch(() => {
                            Alert.alert('Calling Failed', 'Could not open phone dialer on this device.');
                          });
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={15} color={BrandColors.white} />
                <Text style={styles.supportCallBtnText}>{t('call')}</Text>
              </MotionButton>

              {/* Message / Browse Techs */}
              <MotionButton
                style={[
                  styles.supportBrowseBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(99, 102, 241, 0.2)'
                      : BrandColors.indigoLight,
                    borderColor: colors.indigo,
                  },
                ]}
                onPress={() => router.push('/(tabs)/map' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-ellipses" size={15} color={colors.indigo} />
                <Text style={[styles.supportBrowseBtnText, { color: colors.indigo }]}>
                  {t('message')}
                </Text>
              </MotionButton>
            </View>
          </View>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.duration(360).delay(240).reduceMotion(ReduceMotion.System)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('recentActivity')}
          </Text>
          {recentAnalyses.length > 0 && (
            <MotionButton onPress={() => router.push('/(tabs)/history' as any)}>
              <Text style={[styles.viewAllLink, { color: colors.indigo }]}>
                {t('viewAll')} →
              </Text>
            </MotionButton>
          )}
        </Animated.View>
        {recentAnalyses.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(360).delay(240).reduceMotion(ReduceMotion.System)} style={styles.emptyCard}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="analytics-outline" size={40} color={BrandColors.indigo} />
            </View>
            <Text style={styles.emptyTitle}>No analyses yet</Text>
            <Text style={styles.emptyDesc}>
              Upload an audio file to get your first equipment health report.
            </Text>
            <MotionButton
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/analysis' as any)}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.md }]} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: BorderRadius.md }]} />
              <Text style={styles.emptyBtnText}>Start Analysis</Text>
            </MotionButton>
          </Animated.View>
        ) : (
          recentAnalyses.map((item, idx) => {
            const cfg = StatusConfig[item.status] || StatusConfig.normal;
            return (
              <Animated.View key={item.id} entering={FadeInRight.duration(300).delay(Math.min(idx, 4) * 45).reduceMotion(ReduceMotion.System)}>
                <MotionButton style={styles.activityCard} onPress={() => router.push('/(tabs)/history')}>
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
                </MotionButton>
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
                  <MotionButton onPress={markAllAsRead} style={styles.markReadBtn}>
                    <Text style={styles.markReadText}>Mark all read</Text>
                  </MotionButton>
                )}
                <MotionButton accessibilityLabel="Close notifications" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowNotifModal(false)}>
                  <Ionicons name="close-circle" size={26} color={colors.mutedForeground} />
                </MotionButton>
              </View>
            </View>

            {/* Notification List */}
            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.border} />
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
                    <MotionButton
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
                    </MotionButton>
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

const createStyles = (colors: DynamicThemeColors) => StyleSheet.create({
  welcomeIntro: { marginBottom: 22 },
  welcomeLabel: { fontSize: 13, color: colors.mutedForeground, marginBottom: 5 },
  userName: { fontSize: 26, fontWeight: '700', letterSpacing: -0.7, color: colors.foreground },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  heroEyebrowText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#9bcec9', flexShrink: 1 },
  heroButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#99f6e4', borderRadius: 12, padding: 15, minHeight: 50 },
  heroButtonText: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#102c38' },
  statEyebrow: { fontSize: 11, fontWeight: '600', color: colors.mutedForeground, marginBottom: 10 },
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.card,
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
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBadge: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: BorderRadius.md,
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.rose,
    borderWidth: 1.5,
    borderColor: BrandColors.white,
  },

  supportBanner: {
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    ...Shadows.sm,
  },
  supportBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  supportIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportTextContainer: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  supportSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  supportActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  supportCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    backgroundColor: BrandColors.emerald,
    borderRadius: BorderRadius.md,
  },
  supportCallBtnText: {
    color: BrandColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  supportBrowseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  supportBrowseBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  scroll: { padding: 20, paddingBottom: 100 },

  // Welcome Banner
  welcomeBanner: {
    borderRadius: BorderRadius.xl,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
    backgroundColor: '#142c3a',
    borderWidth: 1,
    borderColor: '#244453',
  },
  welcomeContent: {
    zIndex: 10,
  },
  greeting: {
    ...Typography.h2,
    color: BrandColors.white,
    marginBottom: 6,
    fontSize: 29,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  greetingSub: {
    ...Typography.body,
    color: '#b3c8d3',
    fontSize: 14,
    lineHeight: 22,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: 18,
    borderWidth: 1,
    ...Shadows.sm,
  },
  statNumber: {
    ...Typography.bigNumber,
    fontSize: 32,
  },
  statLabel: {
    ...Typography.caption,
    color: colors.mutedForeground,
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
    color: colors.foreground,
    marginBottom: 14,
  },
  viewAllLink: {
    ...Typography.bodySmall,
    color: BrandColors.indigo,
    fontWeight: '700',
  },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: 18,
    alignItems: 'flex-start',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    ...Typography.label,
    color: colors.foreground,
    marginBottom: 2,
  },
  actionDesc: {
    ...Typography.caption,
    color: colors.mutedForeground,
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.xl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'solid',
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
    color: colors.foreground,
    marginBottom: 6,
  },
  emptyDesc: {
    ...Typography.bodySmall,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  emptyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',

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
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 10,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.foreground,
  },
  activityDate: {
    ...Typography.caption,
    color: colors.mutedForeground,
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
    backgroundColor: colors.card,
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
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  notifHeader: {
    flexWrap: 'wrap',
    gap: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notifHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifHeaderTitle: { ...Typography.h2, color: colors.foreground },
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
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    alignItems: 'center',
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: colors.badgeBg,
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
  notifTopRow: { flexWrap: 'wrap', gap: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  notifTitle: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: colors.foreground },
  notifTime: { fontSize: 11, color: colors.mutedForeground },
  notifMsg: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },

  notifEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  notifEmptyTitle: { ...Typography.h3, color: colors.foreground },
  notifEmptySub: { ...Typography.bodySmall, color: colors.mutedForeground },
});
