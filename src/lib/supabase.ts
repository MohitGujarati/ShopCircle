// The single Supabase client for the whole app. Import `supabase` from here
// anywhere you need auth or the database — never call createClient twice.

// RN's built-in URL object is incomplete; the SDK needs this polyfill loaded
// FIRST, before anything from @supabase/supabase-js runs.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Expo inlines any variable prefixed with EXPO_PUBLIC_ at build time.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail loudly with a clear message instead of a confusing crash later on.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env, then restart `expo start`.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session on the device so the user stays logged in.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // detectSessionInUrl is a web-OAuth-redirect feature; off for React Native.
    detectSessionInUrl: false,
  },
});

// Only refresh tokens while the app is in the foreground. Supabase's RN guide
// recommends this: it stops background refresh work when the app is inactive.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});