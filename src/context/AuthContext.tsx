import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, backendMode } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthContextValue {
  user: Profile | null
  loading: boolean
  backendMode: 'demo' | 'supabase'
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const session = await api.getSession()
    setUser(session)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const session = await api.getSession()
        if (alive) setUser(session)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async () => {
        const session = await api.getSession()
        if (alive) setUser(session)
      })
      return () => {
        alive = false
        data.subscription.unsubscribe()
      }
    }

    return () => {
      alive = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      backendMode,
      signIn: async (email, password) => {
        const profile = await api.signIn(email, password)
        setUser(profile)
      },
      signUp: async (email, password, displayName) => {
        const profile = await api.signUp(email, password, displayName)
        setUser(profile)
      },
      signOut: async () => {
        await api.signOut()
        setUser(null)
      },
      refresh,
    }),
    [user, loading, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
