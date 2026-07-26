/*
  context/AuthContext.jsx

  Supabase session + profiles.role.
  Set your author account once in the SQL editor:

    update public.profiles set role = 'author' where id = '<your-user-uuid>';

  Pages keep calling useAuth() — only this module talks to supabase.auth / profiles.
*/

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function mapUser(sessionUser, profile) {
  if (!sessionUser) return null
  const email = sessionUser.email || ''
  return {
    id: sessionUser.id,
    email,
    displayName: profile?.display_name || email.split('@')[0] || 'Reader',
    avatarUrl: profile?.avatar_url || '',
    role: profile?.role || 'reader',
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadProfile(userId) {
      if (!userId) {
        if (!cancelled) setProfile(null)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.warn('Failed to load profile', error.message)
        if (!cancelled) setProfile(null)
        return
      }
      if (!cancelled) setProfile(data)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      loadProfile(data.session?.user?.id).finally(() => {
        if (!cancelled) setIsLoaded(true)
      })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      loadProfile(nextSession?.user?.id)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => {
    const user = mapUser(session?.user, profile)
    const isSignedIn = Boolean(session?.user)
    const isAuthor = Boolean(isSignedIn && user?.role === 'author')
    return {
      isLoaded,
      isSignedIn,
      isAuthor,
      user,
      session,
      signOut: () => supabase.auth.signOut(),
    }
  }, [isLoaded, session, profile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
