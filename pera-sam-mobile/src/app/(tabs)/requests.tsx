import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { useThemeContext } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { ThemeToggle } from '../../components/ThemeToggle';

// ─── Types ───────────────────────────────────────────────────────────────────
type RequestStatus = 'pending' | 'accepted' | 'completed' | 'declined';

interface RepairRequest {
  id: string;
  user_id: string;
  company_id: string;
  machine_type: string;
  brand: string;
  status: RequestStatus;
  description: string;
  created_at: string;
  profiles?: {
    name: string;
    phone?: string;
  };
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: BrandColors.amber, bg: BrandColors.amberLight, icon: 'time' },
  accepted: { label: 'Accepted', color: BrandColors.blue, bg: BrandColors.blueLight, icon: 'checkmark-circle' },
  completed: { label: 'Completed', color: BrandColors.emerald, bg: BrandColors.emeraldLight, icon: 'checkmark-done-circle' },
  declined: { label: 'Declined', color: BrandColors.rose, bg: BrandColors.roseLight, icon: 'close-circle' },
};

const FILTERS = [
  { id: 'all', label: 'All', color: BrandColors.indigo },
  { id: 'pending', label: 'Pending', color: BrandColors.amber },
  { id: 'accepted', label: 'Accepted', color: BrandColors.blue },
  { id: 'completed', label: 'Done', color: BrandColors.emerald },
];

function parseDescription(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!raw) return result;
  raw.split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key && val) result[key] = val;
    }
  });
  return result;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function RequestsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useThemeContext();
  const params = useLocalSearchParams<{ requestProviderId?: string; requestProviderName?: string }>();
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Determine if user is a company (based on Supabase user metadata)
  const isCompany = user?.user_metadata?.role === 'company';

  // ── Fetch requests ─────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      const column = isCompany ? 'company_id' : 'user_id';
      const joinRelation = isCompany ? 'profiles!user_id' : 'profiles!company_id';

      const { data, error } = await (supabase as any)
        .from('repair_requests')
        .select(`*, ${joinRelation} (name, phone)`)
        .eq(column, user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as RepairRequest[]) || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isCompany]);

  useEffect(() => {
    fetchRequests();

    if (!user) return;

    // Real-time subscription
    const channel = supabase
      .channel('mobile-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repair_requests',
          filter: `${isCompany ? 'company_id' : 'user_id'}=eq.${user.id}`,
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isCompany, fetchRequests]);

  // Handle incoming "Request Repair" from Map tab
  useEffect(() => {
    if (params.requestProviderId && params.requestProviderName && user && !submitting) {
      const clearRequestProvider = () => {
        router.setParams({ requestProviderId: '', requestProviderName: '' });
      };

      Alert.alert(
        'Request Repair',
        `Send a repair request to ${params.requestProviderName}?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: clearRequestProvider },
          {
            text: 'Send Request',
            onPress: async () => {
              clearRequestProvider();
              setSubmitting(true);
              try {
                const { error } = await (supabase as any)
                  .from('repair_requests')
                  .insert({
                    user_id: user.id,
                    company_id: params.requestProviderId,
                    machine_type: 'General Equipment',
                    brand: '',
                    status: 'pending',
                    description: `Issue: Equipment requires maintenance\nCustomer Phone: ${user.user_metadata?.phone || 'Not provided'}`,
                  });

                if (error) throw error;
                Alert.alert('Success', 'Repair request sent successfully!');
                fetchRequests();
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to send request.');
              } finally {
                setSubmitting(false);
              }
            },
          },
        ]
      );
    }
  }, [fetchRequests, params.requestProviderId, params.requestProviderName, submitting, user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  // ── Update status (company only) ──────────────────────────────────────
  const updateStatus = async (requestId: string, newStatus: RequestStatus) => {
    try {
      const { error } = await (supabase as any)
        .from('repair_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      Alert.alert('Updated', `Request marked as ${newStatus}`);
      fetchRequests();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────
  const filteredRequests = requests.filter((r) => {
    if (selectedFilter === 'all') return true;
    return r.status === selectedFilter;
  });

  // ── Stats ─────────────────────────────────────────────────────────────
  const stats = {
    pending: requests.filter((r) => r.status === 'pending').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    total: requests.length,
  };

  // ── Render request card ───────────────────────────────────────────────
  const renderRequest = ({ item, index }: { item: RepairRequest; index: number }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const isExpanded = expandedId === item.id;
    const parsed = parseDescription(item.description);
    const date = new Date(item.created_at);

    return (
      <Animated.View entering={FadeInRight.duration(400).delay(index * 80)}>
        <TouchableOpacity
          style={[
            styles.requestCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            isExpanded && styles.requestCardExpanded,
          ]}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          {/* Status indicator */}
          <View style={[styles.statusBar, { backgroundColor: cfg.color }]} />

          <View style={styles.requestBody}>
            {/* Header */}
            <View style={styles.requestHeader}>
              <View style={[styles.requestAvatar, { backgroundColor: cfg.bg }]}>
                <Ionicons
                  name={isCompany ? 'person' : 'business'}
                  size={20}
                  color={cfg.color}
                />
              </View>
              <View style={styles.requestInfo}>
                <Text style={[styles.requestName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.profiles?.name || (isCompany ? 'Unknown User' : 'Unknown Company')}
                </Text>
                <Text style={[styles.requestMeta, { color: colors.mutedForeground }]}>
                  {item.machine_type} {item.brand ? `• ${item.brand}` : ''}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>

            {/* Issue preview */}
            <Text style={[styles.issuePreview, { color: colors.foreground }]} numberOfLines={isExpanded ? undefined : 1}>
              {parsed['Issue'] || (item.description?.includes(':') ? 'Tap to view details' : item.description || 'No description')}
            </Text>

            {/* Date */}
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {/* Expanded details */}
            {isExpanded && (
              <View style={[styles.expandedDetails, { borderTopColor: colors.border }]}>
                {/* Contact */}
                {item.profiles?.phone && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconBg}>
                      <Ionicons name="call-outline" size={12} color={BrandColors.emerald} />
                    </View>
                    <Text style={[styles.detailText, { color: colors.foreground }]}>{item.profiles.phone}</Text>
                  </View>
                )}

                {parsed['Customer Address'] && (
                  <View style={styles.detailItem}>
                    <View style={[styles.detailIconBg, { backgroundColor: BrandColors.blueLight }]}>
                      <Ionicons name="location-outline" size={12} color={BrandColors.blue} />
                    </View>
                    <Text style={[styles.detailText, { color: colors.foreground }]}>{parsed['Customer Address']}</Text>
                  </View>
                )}

                {/* Equipment details */}
                {Object.entries(parsed)
                  .filter(([k]) => !['Issue', 'Customer Address', 'Customer Phone', 'Photos'].includes(k))
                  .map(([key, val]) => (
                    <View key={key} style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{key}:</Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>{val}</Text>
                    </View>
                  ))}

                {/* Action buttons */}
                <View style={styles.expandedActions}>
                  {/* Chat button (for both user and company) */}
                  <TouchableOpacity
                    style={[styles.chatBtn, { backgroundColor: colors.card }]}
                    onPress={() => {
                      router.push({
                        pathname: '/chat',
                        params: {
                          requestId: item.id,
                          isCompany: isCompany ? '1' : '0',
                          otherPartyName: item.profiles?.name || (isCompany ? 'User' : 'Company'),
                        },
                      } as any);
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color={BrandColors.indigo} />
                    <Text style={styles.chatBtnText}>Message</Text>
                  </TouchableOpacity>

                  {/* Company-only action buttons */}
                  {isCompany && item.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => updateStatus(item.id, 'accepted')}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={BrandColors.white} />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => updateStatus(item.id, 'declined')}
                      >
                        <Ionicons name="close-circle" size={16} color={BrandColors.rose} />
                      </TouchableOpacity>
                    </>
                  )}

                  {isCompany && item.status === 'accepted' && (
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => updateStatus(item.id, 'completed')}
                    >
                      <Ionicons name="checkmark-done" size={16} color={BrandColors.white} />
                      <Text style={styles.acceptBtnText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.indigo} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { backgroundColor: colors.card }]}>
        {/* Gradient accent bar */}
        <View style={styles.headerGradient}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.pink, opacity: 0.4 }]} />
        </View>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <Ionicons name="chatbubbles" size={18} color={BrandColors.white} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {isCompany ? 'Repair Requests' : 'My Requests'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <View style={[styles.headerCountBadge, isDark && { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
            <Text style={styles.headerCount}>{requests.length} total</Text>
          </View>
        </View>
      </Animated.View>

      {/* Stats Row */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: BrandColors.amber }]}>
          <Text style={[styles.statNumber, { color: BrandColors.amber }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: BrandColors.blue }]}>
          <Text style={[styles.statNumber, { color: BrandColors.blue }]}>{stats.accepted}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: BrandColors.emerald }]}>
          <Text style={[styles.statNumber, { color: BrandColors.emerald }]}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Done</Text>
        </View>
      </Animated.View>

      {/* Filter chips */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.filterChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedFilter === f.id && { backgroundColor: f.color, borderColor: f.color },
            ]}
            onPress={() => setSelectedFilter(f.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: colors.mutedForeground },
                selectedFilter === f.id && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Requests List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.indigo}
            colors={[BrandColors.indigo]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="chatbubbles-outline" size={44} color={BrandColors.indigo} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No requests</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {selectedFilter !== 'all'
                ? `No ${selectedFilter} requests found.`
                : isCompany
                ? 'Incoming repair requests will appear here.'
                : 'Use the Map tab to find service providers and request repairs.'}
            </Text>
            <TouchableOpacity
              style={styles.findProvidersBtn}
              onPress={() => router.push('/(tabs)/map' as any)}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.md }]} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: BorderRadius.md }]} />
              <Ionicons name="map-outline" size={16} color={BrandColors.white} />
              <Text style={styles.findProvidersBtnText}>Find Service Providers</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Overlay loading for submitting */}
      {submitting && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator size="large" color={BrandColors.white} />
          <Text style={styles.submittingText}>Sending request...</Text>
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: BrandColors.white,
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
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BrandColors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.h3, color: BrandColors.foreground },
  headerCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: BrandColors.purpleLight,
    borderRadius: BorderRadius.full,
  },
  headerCount: { ...Typography.caption, color: BrandColors.purple, fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderLeftWidth: 4,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: { ...Typography.caption, color: BrandColors.mutedForeground, marginTop: 2, fontWeight: '600' },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: BrandColors.mutedForeground },
  filterChipTextActive: { color: BrandColors.white },

  // Request card
  list: { padding: 16, paddingBottom: 100 },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    marginBottom: 10,
    overflow: 'hidden',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  requestCardExpanded: { ...Shadows.lg },
  statusBar: { width: 5, alignSelf: 'stretch' },
  requestBody: { flex: 1, padding: 16 },

  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestInfo: { flex: 1 },
  requestName: { ...Typography.label, color: BrandColors.foreground },
  requestMeta: { ...Typography.caption, color: BrandColors.mutedForeground, marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  issuePreview: {
    ...Typography.bodySmall,
    color: BrandColors.mutedForeground,
    marginTop: 10,
    lineHeight: 20,
  },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dateText: { ...Typography.caption, color: BrandColors.mutedForeground },

  // Expanded
  expandedDetails: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BrandColors.border,
    gap: 10,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: BrandColors.emeraldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: { ...Typography.caption, color: BrandColors.mutedForeground, fontWeight: '700' },
  detailText: { ...Typography.bodySmall, color: BrandColors.foreground, flex: 1 },
  detailValue: { ...Typography.bodySmall, color: BrandColors.foreground, flex: 1 },

  expandedActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 42,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: BrandColors.indigo,
  },
  chatBtnText: { fontSize: 13, fontWeight: '700', color: BrandColors.indigo },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 42,
    backgroundColor: BrandColors.indigo,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: BrandColors.white },
  declineBtn: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: BrandColors.roseLight,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.15)',
  },

  // Loading / Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...Typography.bodySmall, color: BrandColors.mutedForeground },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: BrandColors.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { ...Typography.h3, color: BrandColors.foreground, marginBottom: 8 },
  emptyDesc: { ...Typography.body, color: BrandColors.mutedForeground, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  findProvidersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.glow(BrandColors.indigo),
  },
  findProvidersBtnText: { ...Typography.button, color: BrandColors.white, fontSize: 14, fontWeight: '700' },

  // Submitting overlay
  submittingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  submittingText: { ...Typography.body, color: BrandColors.white, fontWeight: '600' },
});
