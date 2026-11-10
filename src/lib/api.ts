import { isSupabaseConfigured } from './config'
import { demoApi } from './demoStore'
import { supabaseApi } from './supabaseApi'

export const api = isSupabaseConfigured ? supabaseApi : demoApi

export const backendMode = isSupabaseConfigured ? 'supabase' : 'demo'
