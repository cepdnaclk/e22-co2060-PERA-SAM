import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
} from '../../constants/theme';

type AppointmentStatus = 'pending' | 'accepted' | 'completed' | 'declined';

interface Appointment {
  id: string;
  user_id: string;
  company_id: string;
  machine_type: string;
  brand: string;
  status: AppointmentStatus;
  description: string;
  analysis_id: string | null;
  created_at: string;
  profiles?: {
    name: string;
    phone: string;
    address?: string;
  };
}

const STATUS_CONFIG: Record<AppointmentStatus, { color: string; bg: string; icon: string; label: string }> = {
  pending: { color: BrandColors.amber, bg: BrandColors.amberLight, icon: 'time-outline', label: 'Pending' },
  accepted: { color: BrandColors.blue, bg: BrandColors.blueLight, icon: 'checkmark-circle-outline', label: 'Confirmed' },
  completed: { color: BrandColors.emerald, bg: BrandColors.emeraldLight, icon: 'checkmark-done-circle', label: 'Completed' },
  declined: { color: BrandColors.rose, bg: BrandColors.roseLight, icon: 'close-circle-outline', label: 'Cancelled' },
};

const FILTERS: { id: string; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: BrandColors.emerald },
  { id: 'pending', label: 'Pending', color: BrandColors.amber },
  { id: 'accepted', label: 'Confirmed', color: BrandColors.blue },
  { id: 'completed', label: 'Completed', color: BrandColors.emerald },
  { id: 'declined', label: 'Cancelled', color: BrandColors.rose },
];

function parseDescription(desc: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!desc) return result;
  desc.split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key && val) result[key] = val;
    }
  });
  return result;
}

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isCompany = user?.user_metadata?.role === 'company';

  const dateStrip = useMemo(() => {
    const days: { dateStr: string; label: string; dayNum: number; dayName: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' });
      days.push({
        dateStr,
        label: dayName,
        dayNum: d.getDate(),
        dayName,
      });
    }
    return days;
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    try {
      const column = isCompany ? 'company_id' : 'user_id';
      const joinRelation = isCompany ? 'profiles!user_id' : 'profiles!company_id';

      const { data, error } = await (supabase as any)
        .from('repair_requests')
        .select(`*, ${joinRelation} (name, phone, address)`)
        .eq(column, user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppointments((data as Appointment[]) || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isCompany]);

  useEffect(() => {
    fetchAppointments();

    if (!user) return;

    const channel = supabase
      .channel('mobile-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repair_requests',
          filter: `${isCompany ? 'company_id' : 'user_id'}=eq.${user.id}`,
        },
        () => fetchAppointments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isCompany, fetchAppointments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, [fetchAppointments]);

  const updateStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      const { error } = await (supabase as any)
        .from('repair_requests')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      Alert.alert('Updated', `Appointment marked as ${newStatus}`);
      fetchAppointments();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    const matchFilter = selectedFilter === 'all' || a.status === selectedFilter;
    const matchDate = selectedDate === 'all' || a.created_at.startsWith(selectedDate);
    return matchFilter && matchDate;
  });

  const stats = {
    pending: appointments.filter((a) => a.status === 'pending').length,
    accepted: appointments.filter((a) => a.status === 'accepted').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    total: appointments.length,
  };

  const renderAppointment = ({ item, index }: { item: Appointment; index: number }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const isExpanded = expandedId === item.id;
    const parsed = parseDescription(item.description);
    const date = new Date(item.created_at);

    return (
      <Animated.View entering={FadeInRight.duration(400).delay(index * 80)}>
        <TouchableOpacity
          style={[styles.card, isExpanded && styles.cardExpanded]}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.statusBar, { backgroundColor: cfg.color }]} />

          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
                <Ionicons
                  name={isCompany ? 'person' : 'business'}
                  size={20}
                  color={cfg.color}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.clientName} numberOfLines={1}>
                  {item.profiles?.name || (isCompany ? 'Client' : 'Service Provider')}
                </Text>
                <Text style={styles.machineMeta}>
                  {item.machine_type} {item.brand ? `• ${item.brand}` : ''}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>

            <View style={styles.dateTimeRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={13} color={BrandColors.emerald} />
                <Text style={styles.metaText}>
                  {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={BrandColors.mutedForeground} />
                <Text style={styles.metaText}>
                  {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            <Text style={styles.issueText} numberOfLines={isExpanded ? undefined : 2}>
              {parsed['Issue'] || item.description || 'General maintenance check'}
            </Text>

            {isExpanded && (
              <View style={styles.expandedSection}>
                {item.profiles?.phone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={14} color={BrandColors.emerald} />
                    <Text style={styles.detailText}>{item.profiles.phone}</Text>
                  </View>
                )}

                {(parsed['Customer Address'] || item.profiles?.address) && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color={BrandColors.blue} />
                    <Text style={styles.detailText}>{parsed['Customer Address'] || item.profiles?.address}</Text>
                  </View>
                )}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.chatActionBtn}
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
                    <Ionicons name="chatbubble-outline" size={15} color={BrandColors.emerald} />
                    <Text style={styles.chatActionText}>Message</Text>
                  </TouchableOpacity>

                  {isCompany && item.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={styles.acceptActionBtn}
                        onPress={() => updateStatus(item.id, 'accepted')}
                      >
                        <Ionicons name="checkmark" size={15} color={BrandColors.white} />
                        <Text style={styles.acceptActionText}>Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineActionBtn}
                        onPress={() => updateStatus(item.id, 'declined')}
                      >
                        <Ionicons name="close" size={15} color={BrandColors.rose} />
                      </TouchableOpacity>
                    </>
                  )}

                  {isCompany && item.status === 'accepted' && (
                    <TouchableOpacity
                      style={styles.acceptActionBtn}
                      onPress={() => updateStatus(item.id, 'completed')}
                    >
                      <Ionicons name="checkmark-done" size={15} color={BrandColors.white} />
                      <Text style={styles.acceptActionText}>Complete</Text>
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.emerald} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerGradient}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.emerald }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.accent, opacity: 0.5 }]} />
        </View>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <Ionicons name="calendar" size={18} color={BrandColors.white} />
          </View>
          <Text style={styles.headerTitle}>
            {isCompany ? 'Service Appointments' : 'My Appointments'}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{appointments.length} total</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.dateStripWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
          <TouchableOpacity
            style={[styles.dateChip, selectedDate === 'all' && styles.dateChipActive]}
            onPress={() => setSelectedDate('all')}
          >
            <Text style={[styles.dateChipLabel, selectedDate === 'all' && styles.dateChipTextActive]}>All</Text>
            <Text style={[styles.dateChipNum, selectedDate === 'all' && styles.dateChipTextActive]}>📅</Text>
          </TouchableOpacity>
          {dateStrip.map((d) => (
            <TouchableOpacity
              key={d.dateStr}
              style={[styles.dateChip, selectedDate === d.dateStr && styles.dateChipActive]}
              onPress={() => setSelectedDate(d.dateStr)}
            >
              <Text style={[styles.dateChipLabel, selectedDate === d.dateStr && styles.dateChipTextActive]}>{d.label}</Text>
              <Text style={[styles.dateChipNum, selectedDate === d.dateStr && styles.dateChipTextActive]}>{d.dayNum}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(150)} style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: BrandColors.amber }]}>
          <Text style={[styles.statNumber, { color: BrandColors.amber }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: BrandColors.blue }]}>
          <Text style={[styles.statNumber, { color: BrandColors.blue }]}>{stats.accepted}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: BrandColors.emerald }]}>
          <Text style={[styles.statNumber, { color: BrandColors.emerald }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, selectedFilter === f.id && { backgroundColor: f.color }]}
            onPress={() => setSelectedFilter(f.id)}
          >
            <Text style={[styles.filterChipText, selectedFilter === f.id && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointment}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.emerald}
            colors={[BrandColors.emerald]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={44} color={BrandColors.emerald} />
            </View>
            <Text style={styles.emptyTitle}>No appointments found</Text>
            <Text style={styles.emptyDesc}>
              {selectedFilter !== 'all' || selectedDate !== 'all'
                ? 'Try adjusting your date or status filters.'
                : 'Book a service provider on the Map tab to schedule your first appointment.'}
            </Text>
            <TouchableOpacity
              style={styles.findBtn}
              onPress={() => router.push('/(tabs)/map' as any)}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.emerald, borderRadius: BorderRadius.md }]} />
              <Ionicons name="map-outline" size={16} color={BrandColors.white} />
              <Text style={styles.findBtnText}>Find Service Providers</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.background },
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
    backgroundColor: BrandColors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.h3, color: BrandColors.foreground },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: BrandColors.emeraldLight,
    borderRadius: BorderRadius.full,
  },
  headerBadgeText: { ...Typography.caption, color: BrandColors.emerald, fontWeight: '700' },

  dateStripWrap: {
    paddingVertical: 10,
    backgroundColor: BrandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
  },
  dateStrip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dateChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: BrandColors.muted,
    minWidth: 54,
  },
  dateChipActive: {
    backgroundColor: BrandColors.emerald,
    ...Shadows.glow(BrandColors.emerald),
  },
  dateChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.mutedForeground,
    textTransform: 'uppercase',
  },
  dateChipNum: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.foreground,
    marginTop: 2,
  },
  dateChipTextActive: {
    color: BrandColors.white,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderLeftWidth: 4,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statNumber: { fontSize: 22, fontWeight: '800' },
  statLabel: { ...Typography.caption, color: BrandColors.mutedForeground, marginTop: 2, fontWeight: '600' },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: BrandColors.mutedForeground },
  filterChipTextActive: { color: BrandColors.white },

  list: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    marginBottom: 10,
    overflow: 'hidden',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardExpanded: { ...Shadows.lg },
  statusBar: { width: 5, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 16 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  clientName: { ...Typography.label, color: BrandColors.foreground },
  machineMeta: { ...Typography.caption, color: BrandColors.mutedForeground, marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Typography.caption, color: BrandColors.mutedForeground, fontWeight: '500' },

  issueText: {
    ...Typography.bodySmall,
    color: BrandColors.foreground,
    marginTop: 8,
    lineHeight: 18,
  },

  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BrandColors.border,
    gap: 8,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { ...Typography.bodySmall, color: BrandColors.foreground, flex: 1 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chatActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: BrandColors.emerald,
  },
  chatActionText: { fontSize: 13, fontWeight: '700', color: BrandColors.emerald },
  acceptActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    backgroundColor: BrandColors.emerald,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  acceptActionText: { fontSize: 13, fontWeight: '700', color: BrandColors.white },
  declineActionBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: BrandColors.roseLight,
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...Typography.bodySmall, color: BrandColors.mutedForeground },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: BrandColors.emeraldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { ...Typography.h3, color: BrandColors.foreground, marginBottom: 8 },
  emptyDesc: { ...Typography.body, color: BrandColors.mutedForeground, textAlign: 'center', lineHeight: 22, marginBottom: 18 },
  findBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.glow(BrandColors.emerald),
  },
  findBtnText: { ...Typography.button, color: BrandColors.white, fontSize: 14, fontWeight: '700' },
});
