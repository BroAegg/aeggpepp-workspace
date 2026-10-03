import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (err) {
      console.error('Failed to set secure item:', err)
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (err) {
      console.error('Failed to delete secure item:', err)
    }
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://isgefvbsvzllqfmxelod.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZ2VmdmJzdnpsbHFmbXhlbG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjU2MDYsImV4cCI6MjA4NjQwMTYwNn0.CEv7hk3ZT5F_dllzmE_mPWBMjB5zoZ4hevWEjkPuaCo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
