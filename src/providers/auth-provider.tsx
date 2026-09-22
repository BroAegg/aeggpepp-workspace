'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getUser } from '@/lib/actions/auth'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface AuthContextType {
  profile: any | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storeProfile = useWorkspaceStore((s) => s.profile)
  const setStoreProfile = useWorkspaceStore((s) => s.setProfile)
  const [profile, setLocalProfile] = useState<any | null>(storeProfile)
  const [loading, setLoading] = useState(!storeProfile)

  const refreshProfile = async () => {
    try {
      const p = await getUser()
      setLocalProfile(p)
      setStoreProfile(p)
    } catch (e) {
      console.error('Failed to load user profile in AuthProvider:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!storeProfile) {
      refreshProfile()
    } else {
      setLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
