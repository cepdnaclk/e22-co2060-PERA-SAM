import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEFAULT_SUPABASE_URL = 'https://cwzgoenapgrmuejgrfzh.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3emdvZW5hcGdybXVlamdyZnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTc2ODUsImV4cCI6MjA4NzU3MzY4NX0.qXY-rq0dcsbHJsxC4-tmAh9EE6n9l7qoAZ_pUCr1pgM';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== 'your_anon_key_here';

export function getSupabaseConfigError() {
  if (isSupabaseConfigured) return null;
  return 'Supabase is not configured. Update EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in pera-sam-mobile/.env, then restart Expo.';
}

const memoryStorage = new Map<string, string>();

const webStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve(memoryStorage.get(key) ?? null);
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') {
      memoryStorage.set(key, value);
      return Promise.resolve();
    }
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') {
      memoryStorage.delete(key);
      return Promise.resolve();
    }
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

function initializeSupabaseClient() {
  const url = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : DEFAULT_SUPABASE_URL;
  const key = supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY;

  try {
    return createClient(url, key, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.warn('Warning: Failed to initialize standard Supabase client, using fallback:', error);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
      auth: {
        storage,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
}

export const supabase = initializeSupabaseClient();

