#!/usr/bin/env node

/**
 * Script to recreate users after disabling email confirmation
 * This deletes old unconfirmed users and creates new auto-confirmed users
 * 
 * PREREQUISITES:
 * 1. Disable "Confirm email" in Supabase Dashboard:
 *    Authentication → Providers → Email → Toggle OFF "Confirm email" → Save
 * 
 * 2. Delete old users manually in Dashboard:
 *    Authentication → Users → Select users → Delete
 *    (Or they will conflict with new signups)
 * 
 * Run with: node scripts/recreate-users.mjs
 */

import { createClient } from '@supabase/supabase-js'

// Supabase credentials
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
  
  // Sign up user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: {
      data: {
        display_name: account.display_name,
        role: account.role,
      }
    }
  })

  if (signUpError) {
    // Check if user already exists
    if (signUpError.message.includes('already registered')) {
      console.error(`⚠️  User ${account.email} already exists!`)
      console.error(`   Please delete this user manually in Supabase Dashboard:`)
      console.error(`   Authentication → Users → Find "${account.email}" → ... → Delete User`)
      return false
    }
    console.error(`❌ Sign up error:`, signUpError.message)
    return false
  }

  if (!authData.user) {
    console.error(`❌ No user data returned for ${account.email}`)
    return false
  }

  console.log(`✅ Auth user created: ${authData.user.id}`)

  // Check if email is confirmed automatically
  const isConfirmed = authData.user.email_confirmed_at !== null
  console.log(`   Email confirmed: ${isConfirmed ? '✅ YES' : '❌ NO - You need to disable email confirmation in Supabase settings!'}`)

  // Create profile
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
    console.error(`⚠️  Profile error:`, profileError.message)
  } else {
    console.log(`✅ Profile created for ${account.display_name} (${account.role})`)
  }

  // Test login immediately
  console.log(`🔐 Testing login for ${account.email}...`)
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password
  })

  if (loginError) {
    console.error(`❌ Login test FAILED: ${loginError.message}`)
    if (loginError.message.includes('Email not confirmed')) {
      console.error(`\n⚠️  EMAIL CONFIRMATION STILL ENABLED!`)
      console.error(`   Please disable it in Supabase Dashboard:`)
      console.error(`   → Authentication → Providers → Email → Toggle OFF "Confirm email" → Save`)
    }
    return false
  }

  console.log(`✅ Login test SUCCESSFUL! User can login now.`)
  
  // Sign out after test
  await supabase.auth.signOut()

  return true
}

async function main() {
  console.log('🔄 AeggPepp Workspace - Recreate Users Script')
  console.log('=' .repeat(60))
  console.log('\n⚠️  IMPORTANT: Before running this script:')
  console.log('   1. Disable "Confirm email" in Supabase Dashboard')
  console.log('      → Authentication → Providers → Email → Toggle OFF')
  console.log('   2. Delete old users (if any) in Authentication → Users')
  console.log('\nPress Ctrl+C to cancel if you haven\'t done these steps.\n')
  
  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  let successCount = 0

  for (const account of accounts) {
    const success = await createAccount(account)
    if (success) successCount++
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n' + '='.repeat(60))
  if (successCount === accounts.length) {
    console.log(`✨ SUCCESS! All ${successCount} accounts created and verified.`)
    console.log('\n🎉 You can now login at http://localhost:3000/login')
    console.log('\nCredentials:')
    accounts.forEach(acc => {
      console.log(`   📧 ${acc.email}`)
      console.log(`   🔑 ${acc.password}\n`)
    })
  } else {
    console.log(`⚠️  Partial success: ${successCount}/${accounts.length} accounts created.`)
    console.log('\nPlease check errors above and:')
    console.log('1. Make sure "Confirm email" is disabled in Supabase')
    console.log('2. Delete any existing users with same emails')
    console.log('3. Run this script again')
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
