import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://acxbdhdpmdasrdxwllgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gyQKxL1C-D6l-phEOD7d3g_A2Ac1sG4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
