import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';

export interface ProfileData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  role?: string;
  company_name?: string;
  technician_name?: string;
  service_categories?: string[];
  contact_numbers?: string[];
  location_lat?: number;
  location_lng?: number;
  avatar_url?: string;
}

// Fetch profile from Supabase profiles table
export async function fetchProfile(userId: string): Promise<ProfileData | null> {
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Upsert profile data
export async function updateProfile(userId: string, updates: Partial<ProfileData>): Promise<void> {
  const { error } = await (supabase as any)
    .from('profiles')
    .upsert({ id: userId, ...updates });
  if (error) throw error;
}

// Geocode address using OSM Nominatim
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, Sri Lanka`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=lk`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    /* silent */
  }
  return null;
}

// Pick image from gallery and upload to Supabase Storage avatars bucket
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const fileExt = asset.uri.split('.').pop() || 'jpg';
  const fileName = `${userId}/avatar.${fileExt}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, { cacheControl: '3600', upsert: true, contentType: `image/${fileExt}` });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(fileName);

  return `${publicUrl}?t=${Date.now()}`;
}
