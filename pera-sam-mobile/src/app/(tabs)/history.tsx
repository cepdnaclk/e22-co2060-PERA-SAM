import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DynamicThemeColors, useAppTheme } from '../../lib/ThemeContext';
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

const STATUS_FILTERS = [
  { id: 'all', label: 'All', color: BrandColors.indigo },
  { id: 'normal', label: 'Normal', color: BrandColors.success },
  { id: 'warning', label: 'Warning', color: BrandColors.warning },
  { id: 'abnormal', label: 'Anomaly', color: BrandColors.danger },
] as const;

interface AnalysisRecord {
  id: string;
  created_at: string;
  category: string;
  status: AnalysisStatus;
  confidence: number;
  anomaly_score: number;
  machine_id: string;
  recommendation: string;
  details?: { filename?: string };
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const requestId = useRef(0);
  const recordOwner = useRef(user?.id);
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      const matchFilter = selectedFilter === 'all' || r.status === selectedFilter;
      const matchSearch =
        !query ||
        r.category?.toLowerCase().includes(query) ||
        r.machine_id?.toLowerCase().includes(query) ||
        r.details?.filename?.toLowerCase().includes(query);
      return matchFilter && matchSearch;
    });
  }, [records, selectedFilter, searchQuery]);

  const fetchHistory = useCallback(async (refresh = false) => {
    const currentRequest = ++requestId.current;
    setRefreshing(refresh);
    setError(null);
    if (recordOwner.current !== user?.id) {
      recordOwner.current = user?.id;
      setRecords([]);
      setSelectedRecord(null);
      setLoaded(false);
    }
    if (!user) {
      setLoaded(true);
      setRefreshing(false);
      return;
    }
    try {
      const { data, error: fetchError } = await supabase
        .from('analysis_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      if (currentRequest === requestId.current) setRecords((data ?? []) as AnalysisRecord[]);
    } catch {
      if (currentRequest === requestId.current) {
        setError('Unable to load history. Check your connection and try again.');
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoaded(true);
        setRefreshing(false);
      }
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    void fetchHistory(true);
  }, [fetchHistory]);

  useFocusEffect(useCallback(() => {
    void fetchHistory();
    return () => { requestId.current += 1; };
  }, [fetchHistory]));

  const hasFilters = searchQuery.trim().length > 0 || selectedFilter !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
  };

  const renderItem = ({ item, index }: { item: AnalysisRecord; index: number }) => {
    const cfg = StatusConfig[item.status] || StatusConfig.normal;
    const date = new Date(item.created_at);

    return (
      <Animated.View entering={FadeInRight.duration(400).delay(Math.min(index, 5) * 60)}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`View ${item.category || 'equipment'} analysis for machine ${item.machine_id || 'unknown'}, ${cfg.label}`}
          style={styles.card}
          onPress={() => setSelectedRecord(item)}
          activeOpacity={0.7}
        >
          {/* Status indicator */}
          <View style={[styles.cardIndicator, { backgroundColor: cfg.color }]} />

          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardCategory}>
                  {item.category?.charAt(0).toUpperCase() + item.category?.slice(1) || 'Unknown'}
                </Text>
                <Text style={styles.cardMachine}>
                  Machine: {item.machine_id || 'N/A'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.cardMeta}>
                <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
                <Text style={styles.cardDate}>
                  {date.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.cardMeta}>
                <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                <Text style={styles.cardDate}>
                  {date.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.cardScore}>
                {item.confidence?.toFixed(1) ?? '—'}%
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        {/* Gradient accent bar */}
        <View style={styles.headerGradient}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, opacity: 0.6 }]} />
        </View>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <Ionicons name="time" size={18} color={BrandColors.white} />
          </View>
          <Text style={styles.headerTitle}>History</Text>
        </View>
        <View style={styles.headerCountBadge}>
          <Text style={styles.headerCount}>{loaded ? `${records.length} records` : 'Loading…'}</Text>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.searchSection}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={BrandColors.indigo} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search machines, categories, files"
            accessibilityLabel="Search analysis history"
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Status Filter Chips */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedFilter === f.id }}
              style={[
                styles.filterChip,
                selectedFilter === f.id && { backgroundColor: f.color },
              ]}
              onPress={() => setSelectedFilter(f.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === f.id && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 110 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={error ? (
          <View style={styles.errorBanner} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={24} color={colors.rose} />
            <Text style={styles.errorText}>{error}{records.length > 0 ? ' Showing previously loaded results.' : ''}</Text>
            <TouchableOpacity style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Retry loading history" disabled={refreshing} onPress={onRefresh}>
              <Ionicons name="refresh" size={22} color={colors.indigo} />
            </TouchableOpacity>
          </View>
        ) : hasFilters && loaded ? (
          <Text style={styles.resultCount}>{filteredRecords.length} of {records.length} results</Text>
        ) : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.indigo}
            colors={[BrandColors.indigo]}
          />
        }
        ListEmptyComponent={
          !loaded || (refreshing && records.length === 0) ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.indigo} />
              <Text style={styles.emptyDesc}>Loading your analyses…</Text>
            </View>
          ) : !error ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="folder-open-outline" size={44} color={BrandColors.indigo} />
              </View>
              <Text style={styles.emptyTitle}>
                {hasFilters
                  ? 'No matching results'
                  : 'No history yet'}
              </Text>
              <Text style={styles.emptyDesc}>
                {hasFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Your analysis results will appear here once you run your first analysis.'}
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                accessibilityRole="button"
                onPress={hasFilters ? clearFilters : () => router.push('/(tabs)/analysis')}
              >
                <Text style={styles.primaryButtonText}>{hasFilters ? 'Clear filters' : 'Start an analysis'}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selectedRecord}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRecord(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedRecord(null)}>
          <Pressable style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal onPress={(e) => e.stopPropagation()}>
            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            {selectedRecord && (() => {
              const cfg = StatusConfig[selectedRecord.status] || StatusConfig.normal;
              return (
                <>
                  {/* Modal header */}
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Analysis Details</Text>
                    <TouchableOpacity style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Close analysis details" onPress={() => setSelectedRecord(null)}>
                      <Ionicons name="close-circle" size={28} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  {/* Status hero */}
                  <View style={[styles.modalHero, { backgroundColor: cfg.bg }]}>
                    <View style={[styles.modalHeroIcon, { backgroundColor: cfg.color }]}>
                      <Ionicons name={cfg.icon as any} size={24} color={BrandColors.white} />
                    </View>
                    <Text style={[styles.modalStatus, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>

                  {/* Details grid */}
                  <View style={styles.detailGrid}>
                    <DetailRow label="Category" value={selectedRecord.category} even />
                    <DetailRow label="Machine ID" value={selectedRecord.machine_id || 'N/A'} />
                    <DetailRow label="Health Score" value={`${selectedRecord.confidence?.toFixed(1) ?? '—'}%`} even />
                    <DetailRow label="Anomaly Score" value={selectedRecord.anomaly_score?.toFixed(4) ?? 'N/A'} />
                    <DetailRow label="File" value={selectedRecord.details?.filename || 'N/A'} even />
                    <DetailRow
                      label="Date"
                      value={new Date(selectedRecord.created_at).toLocaleString()}
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
                </>
              );
            })()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, even }: { label: string; value: string; even?: boolean }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.detailRow, even && { backgroundColor: colors.background }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: DynamicThemeColors) => StyleSheet.create({
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { marginTop: 20, minHeight: 48, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.lg },
  primaryButtonText: { color: BrandColors.white, fontWeight: '700', textAlign: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 16, borderRadius: BorderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rose },
  errorText: { flex: 1, color: colors.foreground, lineHeight: 20 },
  resultCount: { ...Typography.caption, color: colors.mutedForeground, marginBottom: 12 },
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.card,
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
  headerTitle: { ...Typography.h3, color: colors.foreground },
  headerCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.badgeBg,
    borderRadius: BorderRadius.full,
  },
  headerCount: { ...Typography.caption, color: colors.purple, fontWeight: '700' },

  // Search
  searchSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },

  // Filter chips
  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
  filterChipTextActive: { color: BrandColors.white },

  list: { padding: 16, paddingBottom: 100 },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: 10,
    overflow: 'hidden',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIndicator: {
    width: 5,
    alignSelf: 'stretch',
  },
  cardBody: { flex: 1, padding: 16 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardInfo: { flex: 1 },
  cardCategory: { ...Typography.label, color: colors.foreground },
  cardMachine: { ...Typography.caption, color: colors.mutedForeground, marginTop: 2 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDate: { ...Typography.caption, color: colors.mutedForeground },
  cardScore: {
    ...Typography.label,
    color: colors.indigo,
    marginLeft: 'auto',
    fontWeight: '800',
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: colors.badgeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { ...Typography.h3, color: colors.foreground, marginBottom: 8 },
  emptyDesc: {
    ...Typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { flex: 1, ...Typography.h2, color: colors.foreground },

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
  modalStatus: { fontSize: 22, fontWeight: '800' },

  detailGrid: {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { ...Typography.bodySmall, color: colors.mutedForeground },
  detailValue: { ...Typography.label, color: colors.foreground, maxWidth: '55%', textAlign: 'right' },

  modalReco: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: BrandColors.amberLight,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
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
});
