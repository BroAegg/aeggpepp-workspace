'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const displayName = formData.get('display_name') as string
  const role = formData.get('role') as 'aegg' | 'peppaa'

  const { data: authData, error } = await supabase.auth.signUp({
    ...data,
    options: {
      data: {
        display_name: displayName,
        role: role,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Create profile
  if (authData.user) {
    // @ts-ignore - Supabase types will be generated after schema setup
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      display_name: displayName,
      role: role,
      avatar_url: null,
    }])

    if (profileError) {
      return { error: profileError.message }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function inviteUser(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('display_name') as string
  const role = formData.get('role') as 'aegg' | 'peppaa' | 'member'

  // Create user with auto-confirm (no email verification needed)
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined, // Skip email confirmation
      data: {
        display_name: displayName,
        role: role,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Create profile
  if (authData.user) {
    // @ts-ignore - Supabase types will be generated after schema setup
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      display_name: displayName,
      role: role,
      avatar_url: null,
    }])

    if (profileError) {
      return { error: profileError.message }
    }
  }

  revalidatePath('/settings')
  return { success: true, message: `User ${displayName} created successfully!` }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const displayName = formData.get('display_name') as string
  const role = formData.get('role') as string

  if (!displayName?.trim()) {
    return { error: 'Display name is required' }
  }

  const updateData: Record<string, string> = {
    display_name: displayName.trim(),
  }

  if (role && ['aegg', 'peppaa'].includes(role)) {
    updateData.role = role
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const newPassword = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function getPartnerProfile() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get current user's profile to know their role
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!myProfile) return null

  // Find the partner (the other role)
  const partnerRole = myProfile.role === 'aegg' ? 'peppaa' : 'aegg'

  const { data: partner } = await supabase
    .from('profiles')
    .select('display_name, role, created_at, avatar_url')
    .eq('role', partnerRole)
    .single()

  return partner
}

export async function updateAvatar(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('avatar') as File
  
  console.log('Upload avatar - File:', file?.name, 'Size:', file?.size, 'Type:', file?.type)
  
  if (!file || file.size === 0) {
    return { error: 'No file provided' }
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Please upload an image (JPG, PNG, GIF, or WebP)' }
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024 // 2MB
  if (file.size > maxSize) {
    return { error: 'File size must be less than 2MB' }
  }

  try {
    // Delete old avatar if exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    console.log('Current profile:', profile)

    if (profile?.avatar_url) {
      const oldPath = profile.avatar_url.split('/').pop()
      if (oldPath) {
        console.log('Deleting old avatar:', oldPath)
        await supabase.storage.from('avatars').remove([oldPath])
      }
    }

    // Upload new avatar
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`

    console.log('Uploading file:', fileName)

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { error: uploadError.message }
    }

    console.log('Upload success:', uploadData)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    console.log('Public URL:', publicUrl)

    // Update profile with new avatar URL
    const { error: updateError, data: updateData } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return { error: updateError.message }
    }

    console.log('Profile updated:', updateData)

    revalidatePath('/', 'layout')
    return { success: true, avatarUrl: publicUrl }
  } catch (error: any) {
    console.error('Avatar upload error:', error)
    return { error: error.message || 'Failed to upload avatar' }
  }
}

export async function deleteAvatar() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    // Get current avatar URL
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (!profile?.avatar_url) {
      return { error: 'No avatar to delete' }
    }

    // Delete from storage
    const filePath = profile.avatar_url.split('/').pop()
    if (filePath) {
      await supabase.storage.from('avatars').remove([filePath])
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id)

    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete avatar' }
  }
}
