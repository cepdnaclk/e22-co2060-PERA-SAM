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
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { useScalePress } from '../../components/AnimatedUI';



// ─── Types ───────────────────────────────────────────────────────────────────
interface ServiceProvider {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviews: number;
  phone: string;
  categories: string[];
  distance: number; // km
  available: boolean;
  lat: number;
  lng: number;
}

const SERVICE_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps-outline', color: BrandColors.indigo },
  { id: 'fan', label: 'Fan', icon: 'flash-outline', color: BrandColors.orange },
  { id: 'pump', label: 'Pump', icon: 'water-outline', color: BrandColors.blue },
  { id: 'slider', label: 'Slider', icon: 'swap-horizontal-outline', color: BrandColors.purple },
  { id: 'valve', label: 'Valve', icon: 'git-branch-outline', color: BrandColors.emerald },
  { id: 'vehicle_bearing', label: 'Bearing', icon: 'ellipse-outline', color: BrandColors.pink },
  { id: 'industrial', label: 'General', icon: 'construct-outline', color: BrandColors.cyan },
] as const;

// ─── Haversine Distance ──────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MapScreen() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
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
          // Default to Peradeniya, Sri Lanka
          setUserLocation({ lat: 7.2525, lng: 80.5925 });
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

  // ── Fetch providers ────────────────────────────────────────────────────
  const fetchProviders = useCallback(async () => {
    if (!userLocation) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*');

      const companyProfiles = (data || []).filter(
        (p: any) => String(p.role).toLowerCase() === 'company' && (!user || p.id !== user.id)
      );

      let mapped: ServiceProvider[] = companyProfiles.map((p: any) => {
        const lat = p.location_lat || 7.2525;
        const lng = p.location_lng || 80.5925;
        const dist = haversineKm(userLocation.lat, userLocation.lng, lat, lng);

        return {
          id: p.id,
          name: p.company_name || p.name || 'Service Provider',
          address: p.address || 'Address not listed',
          rating: 4.5 + ((p.id.charCodeAt(0) % 10) / 20),
          reviews: (p.id.charCodeAt(1) % 100) + 10,
          phone: p.contact_numbers?.[0] || p.phone || 'N/A',
          categories: p.service_categories || ['fan', 'pump', 'industrial'],
          distance: Math.round(dist * 10) / 10,
          available: true,
          lat,
          lng,
        };
      });

      if (mapped.length === 0) {
        const demo: ServiceProvider[] = [
          {
            id: 'demo-prov-1',
            name: 'Peradeniya Industrial Services',
            address: 'Gatembe Road, Peradeniya',
            rating: 4.9,
            reviews: 84,
            phone: '+94 81 238 8888',
            categories: ['fan', 'pump', 'industrial'],
            distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.2680, 80.5970) * 10) / 10,
            available: true,
            lat: 7.2680,
            lng: 80.5970,
          },
          {
            id: 'demo-prov-2',
            name: 'Kandy Hydro & Bearing Tech',
            address: 'William Gopallawa Mawatha, Kandy',
            rating: 4.7,
            reviews: 52,
            phone: '+94 81 222 4545',
            categories: ['pump', 'vehicle_bearing', 'valve'],
            distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.2906, 80.6337) * 10) / 10,
            available: true,
            lat: 7.2906,
            lng: 80.6337,
          },
          {
            id: 'demo-prov-3',
            name: 'Lanka Acoustic & Machine Care',
            address: 'Katugastota Main Road, Kandy',
            rating: 4.8,
            reviews: 119,
            phone: '+94 81 494 9900',
            categories: ['fan', 'slider', 'valve', 'industrial'],
            distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.3150, 80.6210) * 10) / 10,
            available: true,
            lat: 7.3150,
            lng: 80.6210,
          },
        ];
        mapped = demo;
      }

      // Sort by distance
      mapped.sort((a, b) => a.distance - b.distance);
      setProviders(mapped);
    } catch {
      // Show demo providers on error
      const demo: ServiceProvider[] = [
        {
          id: 'demo-prov-1',
          name: 'Peradeniya Industrial Services',
          address: 'Gatembe Road, Peradeniya',
          rating: 4.9,
          reviews: 84,
          phone: '+94 81 238 8888',
          categories: ['fan', 'pump', 'industrial'],
          distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.2680, 80.5970) * 10) / 10,
          available: true,
          lat: 7.2680,
          lng: 80.5970,
        },
        {
          id: 'demo-prov-2',
          name: 'Kandy Hydro & Bearing Tech',
          address: 'William Gopallawa Mawatha, Kandy',
          rating: 4.7,
          reviews: 52,
          phone: '+94 81 222 4545',
          categories: ['pump', 'vehicle_bearing', 'valve'],
          distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.2906, 80.6337) * 10) / 10,
          available: true,
          lat: 7.2906,
          lng: 80.6337,
        },
        {
          id: 'demo-prov-3',
          name: 'Lanka Acoustic & Machine Care',
          address: 'Katugastota Main Road, Kandy',
          rating: 4.8,
          reviews: 119,
          phone: '+94 81 494 9900',
          categories: ['fan', 'slider', 'valve', 'industrial'],
          distance: Math.round(haversineKm(userLocation.lat, userLocation.lng, 7.3150, 80.6210) * 10) / 10,
          available: true,
          lat: 7.3150,
          lng: 80.6210,
        },
      ];
      setProviders(demo);
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

  // ── Filter ─────────────────────────────────────────────────────────────
  const filteredProviders = providers.filter((p) => {
    const matchCategory =
      selectedCategory === 'all' || p.categories.includes(selectedCategory);
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // ── Open in maps app ──────────────────────────────────────────────────
  const openInMaps = (lat: number, lng: number, name: string) => {
    const scheme = Platform.OS === 'ios'
      ? `maps:0,0?q=${name}@${lat},${lng}`
      : `geo:0,0?q=${lat},${lng}(${encodeURIComponent(name)})`;
    Linking.openURL(scheme).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  // ── Render provider card ──────────────────────────────────────────────
  const renderProvider = ({ item, index }: { item: ServiceProvider; index: number }) => {
    const isExpanded = expandedId === item.id;

    return (
      <Animated.View entering={FadeInRight.duration(400).delay(index * 100)}>
        <TouchableOpacity
          style={[styles.providerCard, isExpanded && styles.providerCardExpanded]}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          {/* Provider Header */}
          <View style={styles.providerHeader}>
            <View style={styles.providerAvatar}>
              <Text style={styles.providerAvatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.providerMeta}>
                <Ionicons name="location-outline" size={12} color={BrandColors.mutedForeground} />
                <Text style={styles.providerAddress} numberOfLines={1}>{item.address}</Text>
              </View>
            </View>
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate-outline" size={12} color={BrandColors.indigo} />
              <Text style={styles.distanceText}>{item.distance} km</Text>
            </View>
          </View>

          {/* Rating & Categories */}
          <View style={styles.providerDetails}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={BrandColors.amber} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({item.reviews})</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {item.categories.slice(0, 3).map((cat) => {
                const catConfig = SERVICE_CATEGORIES.find(c => c.id === cat);
                return (
                  <View key={cat} style={[styles.categoryPill, { backgroundColor: (catConfig?.color || BrandColors.muted) + '15' }]}>
                    <Text style={[styles.categoryPillText, { color: catConfig?.color || BrandColors.mutedForeground }]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                    </Text>
                  </View>
                );
              })}
              {item.categories.length > 3 && (
                <Text style={styles.moreCats}>+{item.categories.length - 3}</Text>
              )}
            </ScrollView>
          </View>

          {/* Expanded Actions */}
          {isExpanded && (
            <View style={styles.expandedSection}>
              {/* Contact info */}
              <View style={styles.contactRow}>
                <View style={styles.contactIconBg}>
                  <Ionicons name="call-outline" size={14} color={BrandColors.emerald} />
                </View>
                <Text style={styles.contactText}>{item.phone}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <Animated.View style={[{ flex: 1 }, repairBtnAnim]}>
                  <TouchableOpacity
                    style={styles.actionBtnPrimary}
                    onPressIn={repairIn}
                    onPressOut={repairOut}
                    onPress={() => {
                      router.push({
                        pathname: '/(tabs)/requests',
                        params: { requestProviderId: item.id, requestProviderName: item.name },
                      } as any);
                    }}
                  >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.md }]} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.4, borderRadius: BorderRadius.md }]} />
                    <Ionicons name="construct-outline" size={16} color={BrandColors.white} />
                    <Text style={styles.actionBtnPrimaryText}>Request Repair</Text>
                  </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity
                  style={styles.actionBtnSecondary}
                  onPress={() => openInMaps(item.lat, item.lng, item.name)}
                >
                  <Ionicons name="map-outline" size={16} color={BrandColors.blue} />
                  <Text style={styles.actionBtnSecondaryText}>Directions</Text>
                </TouchableOpacity>
              </View>

              {item.phone !== 'N/A' && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Ionicons name="call" size={14} color={BrandColors.emerald} />
                  <Text style={styles.callBtnText}>Call Now</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Expand indicator */}
          <View style={styles.expandIndicator}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={BrandColors.border}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        {/* Gradient accent bar */}
        <View style={styles.headerGradient}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.blue }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.cyan, opacity: 0.5 }]} />
        </View>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <Ionicons name="map" size={18} color={BrandColors.white} />
          </View>
          <Text style={styles.headerTitle}>Find Services</Text>
        </View>
        <View style={[styles.locationBadge, { backgroundColor: locationStatus === 'granted' ? BrandColors.emeraldLight : BrandColors.muted }]}>
          <Ionicons
            name={locationStatus === 'granted' ? 'location' : 'location-outline'}
            size={14}
            color={locationStatus === 'granted' ? BrandColors.emerald : BrandColors.mutedForeground}
          />
          <Text style={[
            styles.locationText,
            { color: locationStatus === 'granted' ? BrandColors.emerald : BrandColors.mutedForeground },
          ]}>
            {locationStatus === 'granted' ? 'GPS Active' : 'Default'}
          </Text>
        </View>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.searchSection}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={BrandColors.indigo} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or location..."
            placeholderTextColor={BrandColors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={BrandColors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Category Pills */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {SERVICE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                selectedCategory === cat.id && { backgroundColor: cat.color },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={selectedCategory === cat.id ? BrandColors.white : cat.color}
              />
              <Text
                style={[
                  styles.catChipText,
                  selectedCategory === cat.id && styles.catChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Provider List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.indigo} />
          <Text style={styles.loadingText}>Finding service providers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => item.id}
          renderItem={renderProvider}
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
                <Ionicons name="search-outline" size={44} color={BrandColors.indigo} />
              </View>
              <Text style={styles.emptyTitle}>No providers found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'Try a different search term or category.'
                  : 'No service providers registered yet.'}
              </Text>
            </View>
          }
        />
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
    backgroundColor: BrandColors.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.h3, color: BrandColors.foreground },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  locationText: { fontSize: 11, fontWeight: '700' },

  // Search
  searchSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: BrandColors.border,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: BrandColors.foreground,
  },

  // Category pills
  categoryRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.mutedForeground,
  },
  catChipTextActive: { color: BrandColors.white },

  // Results bar
  resultsBar: { paddingHorizontal: 20, paddingBottom: 8 },
  resultsText: { ...Typography.caption, color: BrandColors.mutedForeground, fontWeight: '600' },

  // Provider card
  list: { padding: 16, paddingBottom: 100 },
  providerCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...Shadows.md,
  },
  providerCardExpanded: {
    borderColor: BrandColors.indigo + '30',
    ...Shadows.lg,
  },

  providerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: BrandColors.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.indigo,
  },
  providerInfo: { flex: 1 },
  providerName: { ...Typography.label, color: BrandColors.foreground, fontSize: 15 },
  providerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  providerAddress: { ...Typography.caption, color: BrandColors.mutedForeground, flex: 1 },

  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: BrandColors.indigoLight,
    borderRadius: BorderRadius.full,
  },
  distanceText: { fontSize: 12, fontWeight: '800', color: BrandColors.indigo },

  // Details
  providerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '800', color: BrandColors.foreground },
  reviewsText: { fontSize: 11, color: BrandColors.mutedForeground },
  categoryScroll: { flex: 1 },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginRight: 6,
  },
  categoryPillText: { fontSize: 10, fontWeight: '700' },
  moreCats: { fontSize: 10, color: BrandColors.mutedForeground, alignSelf: 'center' },

  // Expanded
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BrandColors.border,
    gap: 12,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: BrandColors.emeraldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: { ...Typography.bodySmall, color: BrandColors.foreground, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
    ...Shadows.glow(BrandColors.indigo),
  },
  actionBtnPrimaryText: { ...Typography.button, color: BrandColors.white, fontSize: 14, fontWeight: '700' },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: BrandColors.blue,
  },
  actionBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: BrandColors.blue },

  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    backgroundColor: BrandColors.emeraldLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
  },
  callBtnText: { fontSize: 13, fontWeight: '700', color: BrandColors.emerald },

  expandIndicator: { alignItems: 'center', marginTop: 8 },

  // Loading / Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...Typography.bodySmall, color: BrandColors.mutedForeground },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
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
  emptyDesc: { ...Typography.body, color: BrandColors.mutedForeground, textAlign: 'center', lineHeight: 22 },
});
