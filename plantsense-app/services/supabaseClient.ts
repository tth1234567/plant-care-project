import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 在此填入你的 Supabase 项目 URL 和 anon key
// 可在 Supabase 控制台 → Project Settings → API 中找到
const SUPABASE_URL = 'https://icbjumixbmdjcrthfgas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljYmp1bWl4Ym1kamNydGhmZ2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTIyMTYsImV4cCI6MjA5MDA2ODIxNn0.CCBuRTrTpY4NssgOkIHsniFRdthc0fFUJhnvKe_JpVw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
