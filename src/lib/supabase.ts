import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  isSupabaseConfigured,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from './config'

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
