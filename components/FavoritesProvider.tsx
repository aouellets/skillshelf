'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type FavoritesContextValue = {
  /** null until the first load resolves. */
  signedIn: boolean | null
  ready: boolean
  isFavorited: (skillId: string) => boolean
  /** Returns the new favorited state, or null if the user isn't signed in. */
  toggle: (skillId: string) => Promise<boolean | null>
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  // Load the favorite set once we know the auth state. Re-runs on sign-in /
  // sign-out so hearts reflect the current user (or clear on sign-out).
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites')
      if (!res.ok) {
        setIds(new Set())
        return
      }
      const data = await res.json()
      setIds(new Set<string>(data.skill_ids ?? []))
    } catch {
      setIds(new Set())
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setSignedIn(false)
      setReady(true)
      return
    }
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user))
      if (data.user) load()
      else setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const isIn = Boolean(session?.user)
      setSignedIn(isIn)
      if (isIn) load()
      else setIds(new Set())
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase, load])

  const toggle = useCallback(
    async (skillId: string): Promise<boolean | null> => {
      if (signedIn === false) return null
      const next = !ids.has(skillId)

      // Optimistic update; revert on failure.
      setIds((prev) => {
        const copy = new Set(prev)
        if (next) copy.add(skillId)
        else copy.delete(skillId)
        return copy
      })

      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill_id: skillId, favorited: next }),
        })
        if (!res.ok) throw new Error('favorite failed')
        return next
      } catch {
        setIds((prev) => {
          const copy = new Set(prev)
          if (next) copy.delete(skillId)
          else copy.add(skillId)
          return copy
        })
        return !next
      }
    },
    [ids, signedIn]
  )

  const value = useMemo<FavoritesContextValue>(
    () => ({
      signedIn,
      ready,
      isFavorited: (skillId: string) => ids.has(skillId),
      toggle,
    }),
    [signedIn, ready, ids, toggle]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext)
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return ctx
}
