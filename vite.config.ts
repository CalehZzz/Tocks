import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl =
    process.env.SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    ''

  // GitHub project pages live at /Tocks/; local/dev stays at /
  const base =
    process.env.VITE_BASE ||
    env.VITE_BASE ||
    (process.env.GITHUB_ACTIONS ? '/Tocks/' : '/')

  return {
    base,
    plugins: [react()],
    envPrefix: ['VITE_', 'SUPABASE_'],
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabaseKey),
    },
    server: {
      host: true,
      port: 5173,
    },
  }
})

