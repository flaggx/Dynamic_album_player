import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, getSupabase } from '../lib/supabase'
import { setAuthTokenGetter } from '../services/api'
import { syncAuthUserToPublicProfile } from '../services/syncAuthProfile'

/** Shape close to what Auth0 provided so call sites stay simple */
export type AppUser = {
  sub: string
  email?: string
  name?: string
  picture?: string
  app_metadata?: Record<string, unknown>
}

function mapUser(u: User): AppUser {
  const meta = u.user_metadata || {}
  return {
    sub: u.id,
    email: u.email ?? undefined,
    name: (meta.full_name as string) || (meta.name as string) || undefined,
    picture: (meta.avatar_url as string) || (meta.picture as string) || undefined,
    app_metadata: u.app_metadata as Record<string, unknown> | undefined,
  }
}

export type EmailAuthResult = {
  error: string | null
  /** True when sign-up succeeded but Supabase requires email confirmation before a session exists */
  needsEmailConfirmation?: boolean
}

export type AuthContextValue = {
  session: Session | null
  user: AppUser | null
  isAuthenticated: boolean
  isLoading: boolean
  loginWithRedirect: () => Promise<void>
  signInWithEmailPassword: (email: string, password: string) => Promise<EmailAuthResult>
  signUpWithEmailPassword: (email: string, password: string) => Promise<EmailAuthResult>
  logout: () => Promise<void>
  getAccessTokenSilently: () => Promise<string | undefined>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const client = getSupabase()
    if (!client) {
      setIsLoading(false)
      setAuthTokenGetter(async () => undefined)
      return
    }

    client.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const client = getSupabase()
    if (!client) {
      setAuthTokenGetter(async () => undefined)
      return
    }
    setAuthTokenGetter(async () => {
      const { data } = await client.auth.getSession()
      return data.session?.access_token
    })
  }, [session])

  const loginWithRedirect = useCallback(async () => {
    const client = getSupabase()
    if (!client) return
    const redirectTo = `${window.location.origin}/callback`
    await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }, [])

  const signInWithEmailPassword = useCallback(async (email: string, password: string) => {
    const client = getSupabase()
    if (!client) return { error: 'Supabase is not configured' }
    const trimmed = email.trim()
    if (!trimmed || !password) return { error: 'Email and password are required' }

    const { data, error } = await client.auth.signInWithPassword({ email: trimmed, password })
    if (error) return { error: error.message }

    if (data.user) {
      try {
        await syncAuthUserToPublicProfile(data.user)
      } catch (e) {
        console.error('Error syncing user profile:', e)
      }
    }
    return { error: null }
  }, [])

  const signUpWithEmailPassword = useCallback(async (email: string, password: string) => {
    const client = getSupabase()
    if (!client) return { error: 'Supabase is not configured' }
    const trimmed = email.trim()
    if (!trimmed || !password) return { error: 'Email and password are required' }
    if (password.length < 6) return { error: 'Password must be at least 6 characters' }

    const emailRedirectTo = `${window.location.origin}/callback`
    const { data, error } = await client.auth.signUp({
      email: trimmed,
      password,
      options: { emailRedirectTo },
    })
    if (error) return { error: error.message }

    if (data.session?.user) {
      try {
        await syncAuthUserToPublicProfile(data.session.user)
      } catch (e) {
        console.error('Error syncing user profile:', e)
      }
      return { error: null }
    }

    return { error: null, needsEmailConfirmation: true }
  }, [])

  const logout = useCallback(async () => {
    const client = getSupabase()
    if (!client) return
    await client.auth.signOut()
  }, [])

  const getAccessTokenSilently = useCallback(async () => {
    const client = getSupabase()
    if (!client) return undefined
    const { data } = await client.auth.getSession()
    return data.session?.access_token
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ? mapUser(session.user) : null,
      isAuthenticated: !!session?.user,
      isLoading,
      loginWithRedirect,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      logout,
      getAccessTokenSilently,
    }),
    [
      session,
      isLoading,
      loginWithRedirect,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      logout,
      getAccessTokenSilently,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export { isSupabaseConfigured }
