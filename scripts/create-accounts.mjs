#!/usr/bin/env node

/**
 * One-time script to create initial user accounts
 * Run with: node scripts/create-accounts.mjs
 */

import { createClient } from '@supabase/supabase-js'

// Supabase credentials (hardcoded for one-time use)
const supabaseUrl = 'https://isgefvbsvzllqfmxelod.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZ2VmdmJzdnpsbHFmbXhlbG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjU2MDYsImV4cCI6MjA4NjQwMTYwNn0.CEv7hk3ZT5F_dllzmE_mPWBMjB5zoZ4hevWEjkPuaCo'

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const accounts = [
  {
    email: 'aegneru@gmail.com',
    password: 'aeggpeppa2024',
    display_name: 'Aegg',
    role: 'aegg'
  },
  {
    email: 'mevani2015@gmail.com',
    password: 'aeggpeppa2024',
    display_name: 'Peppaa',
    role: 'peppaa'
  }
]

async function createAccount(account) {
  console.log(`\n📝 Creating account for ${account.email}...`)
  
  // 1. Sign up user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: {
      data: {
        display_name: account.display_name,
        role: account.role,
      },
      emailRedirectTo: `${supabaseUrl}/auth/callback`
    }
  })

  if (signUpError) {
    console.error(`❌ Sign up error for ${account.email}:`, signUpError.message)
    return false
  }

  if (!authData.user) {
    console.error(`❌ No user data returned for ${account.email}`)
    return false
  }

  console.log(`✅ Auth user created: ${authData.user.id}`)

  // 2. Create profile (if not auto-created by trigger)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([
      {
        id: authData.user.id,
        display_name: account.display_name,
        role: account.role,
        avatar_url: null,
      }
    ])

  if (profileError) {
    console.error(`⚠️  Profile creation error (may already exist):`, profileError.message)
  } else {
    console.log(`✅ Profile created for ${account.display_name} (${account.role})`)
  }

  console.log(`✅ Account created successfully: ${account.email}`)
  return true
}

async function main() {
  console.log('🚀 AeggPepp Workspace - Account Creation Script')
  console.log('=' .repeat(50))
  
  let successCount = 0

  for (const account of accounts) {
    const success = await createAccount(account)
    if (success) successCount++
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s between requests
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✨ Done! ${successCount}/${accounts.length} accounts created successfully.`)
  console.log('\n📧 Note: Check email inboxes for confirmation links (if email confirmation is enabled)')
  console.log('🔑 You can now login at http://localhost:3000/login')
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
