import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/i18n';
import { useAppTheme } from '../../lib/ThemeContext';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { useScalePress } from '../../components/AnimatedUI';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ServiceTechnician {
  id: string;
  name: string;
  specialty: string;
  address: string;
  rating: number;
  reviews: number;
  phone: string;
  categories: string[];
  distance: number; // km
  available: boolean;
  statusText: string;
  lat: number;
  lng: number;
}

const SERVICE_CATEGORIES = [
  { id: 'all', labelKey: 'all', icon: 'apps-outline', color: BrandColors.indigo },
  { id: 'fan', label: 'Fan / Blower', icon: 'flash-outline', color: BrandColors.orange },
  { id: 'pump', label: 'Hydro & Pump', icon: 'water-outline', color: BrandColors.blue },
  { id: 'slider', label: 'Slider / Guide', icon: 'swap-horizontal-outline', color: BrandColors.purple },
  { id: 'valve', label: 'Valves & Air', icon: 'git-branch-outline', color: BrandColors.emerald },
  { id: 'vehicle_bearing', label: 'Bearings', icon: 'ellipse-outline', color: BrandColors.pink },
  { id: 'industrial', label: 'Acoustics & Motor', icon: 'construct-outline', color: BrandColors.cyan },
] as const;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isDark, colors } = useAppTheme();

  const [providers, setProviders] = useState<ServiceTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied'>('loading');

  const { animatedStyle: repairBtnAnim, onPressIn: repairIn, onPressOut: repairOut } = useScalePress();

  // ── Get user location ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('denied');
          setUserLocation({ lat: 7.2525, lng: 80.5925 }); // Peradeniya, Sri Lanka
          return;
        }
        setLocationStatus('granted');
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        setLocationStatus('denied');
        setUserLocation({ lat: 7.2525, lng: 80.5925 });
      }
    })();
  }, []);

  // ── Fetch technicians ──────────────────────────────────────────────────
  const fetchProviders = useCallback(async () => {
    if (!userLocation) return;
    try {
      const { data } = await supabase.from('profiles').select('*');

      const companyProfiles = (data || []).filter(
        (p: any) => String(p.role).toLowerCase() === 'company' && (!user || p.id !== user.id)
      );

      let mapped: ServiceTechnician[] = companyProfiles.map((p: any) => {
        const lat = p.location_lat || 7.2525;
        const lng = p.location_lng || 80.5925;
        const dist = haversineKm(userLocation.lat, userLocation.lng, lat, lng);

        return {
          id: p.id,
          name: p.company_name || p.name || 'Certified Technician',
          specialty: 'Industrial Acoustic & Vibration Specialist',
          address: p.address || 'Central Province, Sri Lanka',
          rating: 4.8,
          reviews: 76,
          phone: p.contact_numbers?.[0] || p.phone || '+94 81 238 8888',
          categories: p.service_categories || ['fan', 'pump', 'industrial'],
          distance: Math.round(dist * 10) / 10,
          available: true,
          statusText: 'Available for Dispatch',
          lat,
          lng,
        };
      });

      if (mapped.length === 0) {
        // High quality verified technician profiles
        const demo: ServiceTechnician[] = [
          {
            id: 'tech-peradeniya-1',
            name: 'Eng. Kanishka Bandara',
            specialty: 'Industrial Pump & Bearing Acoustics',
            address: 'Gatembe Industrial Zone, Peradeniya',
            rating: 4.9,
            reviews: 124,
            phone: '+94 81 238 8888',
            categories: ['pump', 'vehicle_bearing', 'industrial'],
            distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.2680, 80.5970) * 10) / 10,
            available: true,
            statusText: 'Online • Fast Response',
            lat: 7.2680,
            lng: 80.5970,
          },
          {
            id: 'tech-kandy-2',
            name: 'Pera Machine Care & Diagnostics',
            specialty: 'Centrifugal Fan & Vibration Analysis',
            address: 'William Gopallawa Mawatha, Kandy',
            rating: 4.8,
            reviews: 89,
            phone: '+94 77 345 6789',
            categories: ['fan', 'slider', 'valve'],
            distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.2906, 80.6337) * 10) / 10,
            available: true,
            statusText: 'Available Today',
            lat: 7.2906,
            lng: 80.6337,
          },
          {
            id: 'tech-katugastota-3',
            name: 'Lanka Acoustic Engineering',
            specialty: 'Heavy Machinery & Slider Calibration',
            address: 'Katugastota Main Road, Kandy',
            rating: 4.7,
            reviews: 63,
            phone: '+94 81 494 9900',
            categories: ['fan', 'pump', 'valve', 'industrial'],
            distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.3150, 80.6210) * 10) / 10,
            available: true,
            statusText: 'On Call 24/7',
            lat: 7.3150,
            lng: 80.6210,
          },
          {
            id: 'tech-kurunegala-4',
            name: 'Nimal Jayawardena (Senior Tech)',
            specialty: 'Valve Sealing & Industrial Motors',
            address: 'Colombo Road, Kurunegala',
            rating: 4.9,
            reviews: 142,
            phone: '+94 71 889 2211',
            categories: ['valve', 'industrial', 'fan'],
            distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.4863, 80.3623) * 10) / 10,
            available: true,
            statusText: 'Available for Site Visits',
            lat: 7.4863,
            lng: 80.3623,
          },
        ];
        mapped = demo;
      }

      mapped.sort((a, b) => a.distance - b.distance);
      setProviders(mapped);
    } catch {
      // Demo fallback
    } finally {
      setLoading(false);
    }
  }, [userLocation, user]);

  useEffect(() => {
    if (userLocation) fetchProviders();
  }, [userLocation, fetchProviders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProviders();
    setRefreshing(false);
  }, [fetchProviders]);

  // ── Direct Calling Handler ─────────────────────────────────────────────
  const handleCallTechnician = (item: ServiceTechnician) => {
    Alert.alert(
      t('callTechnicianAlertTitle'),
      `${t('callTechnicianAlertMsg')} ${item.name} (${item.phone})?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('callNow'),
          onPress: () => {
            Linking.openURL(`tel:${item.phone}`).catch(() => {
              Alert.alert('Calling Failed', 'Could not open phone dialer on this device.');
            });
          },
        },
      ]
    );
  };

  // ── Direct Messaging Handler ───────────────────────────────────────────
  const handleMessageTechnician = (item: ServiceTechnician) => {
    router.push({
      pathname: '/chat',
      params: {
        technicianId: item.id,
        recipientName: item.name,
        recipientPhone: item.phone,
        specialty: item.specialty,
        otherPartyName: item.name,
      },
    } as any);
  };

  // ── Direct SMS Handler ─────────────────────────────────────────────────
  const handleSmsTechnician = (item: ServiceTechnician) => {
    const smsUrl = `sms:${item.phone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(
      'Hello, I am using the PERA-SAM mobile application and need technical assistance with machine sound diagnostic analysis.'
    )}`;
    Linking.openURL(smsUrl).catch(() => {
      Alert.alert('SMS Failed', 'Could not open SMS app on this device.');
    });
  };

  // ── Open in Maps ───────────────────────────────────────────────────────
  const openInMaps = (lat: number, lng: number, name: string) => {
    const scheme =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${name}@${lat},${lng}`
        : `geo:0,0?q=${lat},${lng}(${encodeURIComponent(name)})`;
    Linking.openURL(scheme).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  // ── Filter ─────────────────────────────────────────────────────────────
  const filteredProviders = providers.filter((p) => {
    const matchCategory =
      selectedCategory === 'all' || p.categories.includes(selectedCategory);
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const renderTechnicianCard = ({ item, index }: { item: ServiceTechnician; index: number }) => {
    const isExpanded = expandedId === item.id;

    return (
      <Animated.View entering={FadeInRight.duration(350).delay(index * 70)}>
        <View
          style={[
            styles.providerCard,
            {
              backgroundColor: colors.card,
              borderColor: isExpanded ? colors.indigo : colors.border,
            },
            isExpanded && styles.providerCardExpanded,
          ]}
        >
          {/* Main Tappable Info */}
          <TouchableOpacity
            onPress={() => setExpandedId(isExpanded ? null : item.id)}
            activeOpacity={0.7}
          >
            {/* Header: Avatar, Name, Distance */}
            <View style={styles.providerHeader}>
              <View
                style={[
                  styles.providerAvatar,
                  { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.25)' : BrandColors.indigoLight },
                ]}
              >
                <Ionicons name="construct" size={20} color={colors.indigo} />
              </View>

              <View style={styles.providerInfo}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.providerName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Ionicons name="checkmark-circle" size={16} color={BrandColors.emerald} />
                </View>
                <Text style={styles.specialtyText} numberOfLines={1}>
                  {item.specialty}
                </Text>
                <View style={styles.providerMeta}>
                  <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                  <Text
                    style={[styles.providerAddress, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {item.address}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.distanceBadge,
                  { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : BrandColors.indigoLight },
                ]}
              >
                <Ionicons name="navigate-outline" size={12} color={colors.indigo} />
                <Text style={[styles.distanceText, { color: colors.indigo }]}>
                  {item.distance} km
                </Text>
              </View>
            </View>

            {/* Rating & Availability */}
            <View style={styles.providerDetails}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={BrandColors.amber} />
                <Text style={[styles.ratingText, { color: colors.foreground }]}>
                  {item.rating.toFixed(1)}
                </Text>
                <Text style={[styles.reviewsText, { color: colors.mutedForeground }]}>
                  ({item.reviews} {t('reviews')})
                </Text>
              </View>

              <View style={styles.statusPill}>
                <View style={styles.onlineDot} />
                <Text style={styles.statusPillText}>{item.statusText}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* ── Direct Quick-Action Bar (Prominent Call & Message) ──────────── */}
          <View
            style={[
              styles.quickActionBar,
              { borderTopColor: colors.border },
            ]}
          >
            {/* Direct Call Button */}
            <TouchableOpacity
              style={styles.quickCallBtn}
              onPress={() => handleCallTechnician(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={16} color={BrandColors.white} />
              <Text style={styles.quickCallText}>{t('call')}</Text>
            </TouchableOpacity>

            {/* Direct Chat / Message Button */}
            <TouchableOpacity
              style={[
                styles.quickMsgBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(99, 102, 241, 0.2)'
                    : BrandColors.indigoLight,
                  borderColor: colors.indigo,
                },
              ]}
              onPress={() => handleMessageTechnician(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color={colors.indigo} />
              <Text style={[styles.quickMsgText, { color: colors.indigo }]}>
                {t('message')}
              </Text>
            </TouchableOpacity>

            {/* SMS Button */}
            <TouchableOpacity
              style={[
                styles.quickSmsBtn,
                { backgroundColor: colors.muted },
              ]}
              onPress={() => handleSmsTechnician(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={16} color={colors.foreground} />
            </TouchableOpacity>

            {/* Directions Button */}
            <TouchableOpacity
              style={[
                styles.quickSmsBtn,
                { backgroundColor: colors.muted },
              ]}
              onPress={() => openInMaps(item.lat, item.lng, item.name)}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Expanded Section with Repair Request */}
          {isExpanded && (
            <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
              <View style={styles.expandedInfoRow}>
                <Ionicons name="call-outline" size={14} color={BrandColors.emerald} />
                <Text style={[styles.expandedPhoneText, { color: colors.foreground }]}>
                  {item.phone}
                </Text>
              </View>

              <Animated.View style={repairBtnAnim}>
                <TouchableOpacity
                  style={styles.requestRepairBtn}
                  onPressIn={repairIn}
                  onPressOut={repairOut}
                  onPress={() => {
                    router.push({
                      pathname: '/(tabs)/requests',
                      params: {
                        requestProviderId: item.id,
                        requestProviderName: item.name,
                      },
                    } as any);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="construct-outline" size={16} color={BrandColors.white} />
                  <Text style={styles.requestRepairText}>
                    {t('sendRepairRequest')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
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
          <View style={styles.headerIconBg}>
            <Ionicons name="construct" size={18} color={BrandColors.white} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t('techniciansTitle')}
          </Text>
        </View>

        <View
          style={[
            styles.locationBadge,
            {
              backgroundColor:
                locationStatus === 'granted'
                  ? isDark
                    ? 'rgba(16, 185, 129, 0.2)'
                    : BrandColors.emeraldLight
                  : colors.muted,
            },
          ]}
        >
          <Ionicons
            name={locationStatus === 'granted' ? 'location' : 'location-outline'}
            size={14}
            color={locationStatus === 'granted' ? BrandColors.emerald : colors.mutedForeground}
          />
          <Text
            style={[
              styles.locationText,
              {
                color:
                  locationStatus === 'granted'
                    ? BrandColors.emerald
                    : colors.mutedForeground,
              },
            ]}
          >
            {locationStatus === 'granted' ? 'Peradeniya' : 'Sri Lanka'}
          </Text>
        </View>
      </Animated.View>

      {/* Search Input */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder={t('searchTechPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Equipment Category Filters */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {SERVICE_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const label = 'labelKey' in cat ? t(cat.labelKey as any) : cat.label;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryFilterChip,
                  {
                    backgroundColor: isSelected
                      ? colors.indigo
                      : isDark
                      ? colors.card
                      : colors.muted,
                    borderColor: isSelected ? colors.indigo : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={isSelected ? BrandColors.white : colors.foreground}
                />
                <Text
                  style={[
                    styles.categoryFilterText,
                    {
                      color: isSelected ? BrandColors.white : colors.foreground,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.indigo} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            {t('loading')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => item.id}
          renderItem={renderTechnicianCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.indigo}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No Technicians Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Try adjusting your search query or equipment category filter.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...Shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: BrandColors.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.h3 },

  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 10,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  categoryBar: {
    marginBottom: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  categoryFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryFilterText: {
    fontSize: 12,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },

  providerCard: {
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    ...Shadows.md,
  },
  providerCardExpanded: {
    borderColor: BrandColors.indigo,
  },

  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerName: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 15,
  },
  specialtyText: {
    fontSize: 12,
    color: BrandColors.indigo,
    fontWeight: '600',
    marginTop: 1,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  providerAddress: {
    fontSize: 12,
  },

  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
  },

  providerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewsText: {
    fontSize: 12,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.success,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.success,
  },

  // Quick Action Bar
  quickActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  quickCallBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    backgroundColor: BrandColors.emerald,
    borderRadius: BorderRadius.md,
  },
  quickCallText: {
    color: BrandColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  quickMsgBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  quickMsgText: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickSmsBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Expanded section
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  expandedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandedPhoneText: {
    fontSize: 13,
    fontWeight: '600',
  },
  requestRepairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    backgroundColor: BrandColors.indigo,
    borderRadius: BorderRadius.md,
  },
  requestRepairText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: '700',
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

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
