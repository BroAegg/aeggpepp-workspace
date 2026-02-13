#!/usr/bin/env node

/**
 * Script to manually confirm user emails (bypass email verification)
 * Run with: node scripts/confirm-users.mjs
 */

import { createClient } from '@supabase/supabase-js'

// Supabase credentials
const supabaseUrl = 'https://isgefvbsvzllqfmxelod.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZ2VmdmJzdnpsbHFmbXhlbG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjU2MDYsImV4cCI6MjA4NjQwMTYwNn0.CEv7hk3ZT5F_dllzmE_mPWBMjB5zoZ4hevWEjkPuaCo'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const emails = [
  'aegneru@gmail.com',
  'mevani2015@gmail.com'
]

async function checkUsers() {
  console.log('🔍 Checking user accounts...\n')
  
  for (const email of emails) {
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'aeggpeppa2024'
    })

    if (error) {
      console.log(`❌ ${email}: ${error.message}`)
    } else {
      console.log(`✅ ${email}: Login successful!`)
      await supabase.auth.signOut()
    }
  }

  console.log('\n📝 Note: If login fails with "Email not confirmed", you need to:')
  console.log('   1. Go to Supabase Dashboard → Authentication → Users')
  console.log('   2. Find each user and click "..." → Confirm email')
  console.log('   OR disable email confirmation:')
  console.log('   → Authentication → Settings → Email Auth → Disable "Confirm email"')
}

checkUsers().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
