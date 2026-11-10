declare global {
  interface Window {
    __TOCKS_ENV__?: {
      SUPABASE_URL?: string
      SUPABASE_PUBLISHABLE_KEY?: string
    }
  }
}

function readEnv(name: 'SUPABASE_URL' | 'SUPABASE_PUBLISHABLE_KEY'): string {
  const fromWindow = window.__TOCKS_ENV__?.[name]?.trim()
  if (fromWindow) return fromWindow

  const fromImport = (import.meta.env[name] as string | undefined)?.trim()
  if (fromImport) return fromImport

  const fromVite = (
    import.meta.env[`VITE_${name}`] as string | undefined
  )?.trim()
  if (fromVite) return fromVite

  return ''
}

export const SUPABASE_URL = readEnv('SUPABASE_URL')
export const SUPABASE_PUBLISHABLE_KEY = readEnv('SUPABASE_PUBLISHABLE_KEY')

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
)
