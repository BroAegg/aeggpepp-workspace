'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getUser,
  updateProfile,
  updatePassword,
  inviteUser,
  getPartnerProfile,
  logout,
  updateAvatar,
  deleteAvatar,
} from '@/lib/actions/auth'
import {
  getFullActivityLog,
  getActivityStats,
} from '@/lib/actions/activity'
import type { ActivityLog, UserActivityStats } from '@/lib/actions/activity'
import { getActionLabel, getActionIcon } from '@/lib/activity-helpers'
import {
  UserPlus,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
  LogOut,
  Heart,
  Eye,
  EyeOff,
  Check,
  Settings,
  Upload,
  Camera,
  X,
  Activity,
  ChevronDown,
  Clock,
  Flame,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  // Profile state
  const [profile, setProfile] = useState<any>(null)
  const [partner, setPartner] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Profile form
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Invite form
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  // Activity Log state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityStats, setActivityStats] = useState<Record<string, UserActivityStats> | null>(null)
  const [activityFilter, setActivityFilter] = useState('all')
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityOffset, setActivityOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const ACTIVITY_LIMIT = 20

  useEffect(() => {
    loadData()
    loadActivityLog()
    loadActivityStatsData()
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploadingAvatar(true)
    setProfileMsg(null)

    const formData = new FormData(e.currentTarget)
    const result = await updateAvatar(formData)

    if (result.error) {
      console.error('Avatar upload error:', result.error)
      setProfileMsg({ type: 'error', text: result.error })
      setUploadingAvatar(false)
    } else {
      console.log('Avatar uploaded successfully:', result.avatarUrl)
      setProfileMsg({ type: 'success', text: 'Avatar updated! Refreshing...' })
      
      // Wait a bit for success message to show, then refresh page
      setTimeout(() => {
        window.location.reload()
      }, 800)
    }
  }

  const handleAvatarUploadClick = async () => {
    setUploadingAvatar(true)
    setProfileMsg(null)

    const input = document.getElementById('avatar-upload') as HTMLInputElement
    const file = input?.files?.[0]
    
    if (!file) {
      setProfileMsg({ type: 'error', text: 'No file selected' })
      setUploadingAvatar(false)
      return
    }

    const formData = new FormData()
    formData.append('avatar', file)
    
    const result = await updateAvatar(formData)

    if (result.error) {
      console.error('Avatar upload error:', result.error)
      setProfileMsg({ type: 'error', text: result.error })
      setUploadingAvatar(false)
    } else {
      console.log('Avatar uploaded successfully:', result.avatarUrl)
      setProfileMsg({ type: 'success', text: 'Avatar updated! Refreshing...' })
      
      // Wait a bit for success message to show, then refresh page
      setTimeout(() => {
        window.location.reload()
      }, 800)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!confirm('Are you sure you want to delete your avatar?')) return

    setUploadingAvatar(true)
    setProfileMsg(null)

    const result = await deleteAvatar()

    if (result.error) {
      console.error('Avatar delete error:', result.error)
      setProfileMsg({ type: 'error', text: result.error })
      setUploadingAvatar(false)
    } else {
      console.log('Avatar deleted successfully')
      setProfileMsg({ type: 'success', text: 'Avatar deleted! Refreshing...' })
      
      // Wait a bit for success message to show, then refresh page
      setTimeout(() => {
        window.location.reload()
      }, 800)
    }
  }

  const loadData = async () => {
    try {
      const [userData, partnerData] = await Promise.all([
        getUser(),
        getPartnerProfile(),
      ])

      if (userData) {
        setProfile(userData)
        setDisplayName(userData.display_name || '')
        setRole(userData.role || '')
        setAvatarUrl(userData.avatar_url || null)
      }

      if (partnerData) {
        setPartner(partnerData)
      }
    } catch (error) {
      console.error('Error loading settings data:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const loadActivityLog = useCallback(async (filter?: string, offset?: number) => {
    const isLoadMore = (offset || 0) > 0
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setActivityLoading(true)
    }

    try {
      const filterAction = filter ?? activityFilter
      const result = await getFullActivityLog({
        filterAction,
        limit: ACTIVITY_LIMIT,
        offset: offset || 0,
      })

      if (isLoadMore) {
        setActivityLogs(prev => [...prev, ...result.logs])
      } else {
        setActivityLogs(result.logs)
      }
      setActivityTotal(result.total)
    } catch (error) {
      console.error('Error loading activity log:', error)
    } finally {
      setActivityLoading(false)
      setLoadingMore(false)
    }
  }, [activityFilter])

  const loadActivityStatsData = async () => {
    try {
      const stats = await getActivityStats()
      setActivityStats(stats)
    } catch (error) {
      console.error('Error loading activity stats:', error)
    }
  }

  const handleFilterChange = (filter: string) => {
    setActivityFilter(filter)
    setActivityOffset(0)
    loadActivityLog(filter, 0)
  }

  const handleLoadMore = () => {
    const newOffset = activityOffset + ACTIVITY_LIMIT
    setActivityOffset(newOffset)
    loadActivityLog(activityFilter, newOffset)
  }

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)

    const formData = new FormData()
    formData.set('display_name', displayName)
    formData.set('role', role)

    try {
      const result = await updateProfile(formData)
      if (result?.error) {
        setProfileMsg({ type: 'error', text: result.error })
      } else {
        setProfileMsg({ type: 'success', text: 'Profile updated!' })
        await loadData()
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setSavingProfile(false)
      setTimeout(() => setProfileMsg(null), 3000)
    }
  }

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPassword(true)
    setPasswordMsg(null)

    const formData = new FormData()
    formData.set('new_password', newPassword)
    formData.set('confirm_password', confirmPassword)

    try {
      const result = await updatePassword(formData)
      if (result?.error) {
        setPasswordMsg({ type: 'error', text: result.error })
      } else {
        setPasswordMsg({ type: 'success', text: 'Password changed successfully!' })
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setSavingPassword(false)
      setTimeout(() => setPasswordMsg(null), 3000)
    }
  }

  // Invite user
  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    setInviteLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.append('role', 'member')

    try {
      const result = await inviteUser(formData)
      if (result?.error) {
        setInviteError(result.error)
      } else if (result?.success) {
        setInviteSuccess(result.message || 'User created successfully!')
        ;(e.target as HTMLFormElement).reset()
        await loadData()
      }
    } catch {
      setInviteError('An unexpected error occurred')
    } finally {
      setInviteLoading(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    await logout()
  }

  if (loadingProfile) {
    return (
      <>
        <Header title="Settings" icon={Settings} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Settings" icon={Settings} />
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              My Profile
            </CardTitle>
            <CardDescription>
              Update your display name and role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileMsg && (
                <StatusMessage type={profileMsg.type} text={profileMsg.text} />
              )}

              {/* Avatar Upload */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Profile Picture</label>
                <div className="flex items-center gap-4">
                  {/* Avatar Display */}
                  <div className="relative">
                    {avatarPreview || avatarUrl ? (
                      <img
                        src={avatarPreview || avatarUrl || ''}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center text-2xl font bold",
                        role === 'aegg' 
                          ? 'bg-primary-100 dark:bg-primary-900/30' 
                          : 'bg-pink-100 dark:bg-pink-900/30'
                      )}>
                        {role === 'aegg' ? '⭐' : '🌙'}
                      </div>
                    )}
                    {(avatarUrl || avatarPreview) && (
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={uploadingAvatar}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <div className="flex-1">
                    <div className="space-y-2">
                      <input
                        type="file"
                        name="avatar"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-sm rounded-md cursor-pointer transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Choose Photo
                      </label>
                      {avatarPreview && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={uploadingAvatar}
                            onClick={handleAvatarUploadClick}
                            className="flex-1"
                          >
                            {uploadingAvatar ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3 mr-1" />
                                Upload
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAvatarPreview(null)
                              const input = document.getElementById('avatar-upload') as HTMLInputElement
                              if (input) input.value = ''
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, GIF or WebP. Max 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('aegg')}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all',
                      role === 'aegg'
                        ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                    )}
                  >
                    <span className="text-2xl">⭐</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Aegg</p>
                      <p className="text-xs text-muted-foreground">Fullstack Engineer</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('peppaa')}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all',
                      role === 'peppaa'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                        : 'border-border hover:border-pink-300 hover:bg-secondary/50'
                    )}
                  >
                    <span className="text-2xl">🌙</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Peppaa</p>
                      <p className="text-xs text-muted-foreground">PM Game Developer</p>
                    </div>
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={savingProfile} className="w-full">
                {savingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Save Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Partner Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Partner
            </CardTitle>
            <CardDescription>
              Your workspace partner
            </CardDescription>
          </CardHeader>
          <CardContent>
            {partner ? (
              <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
                  partner.role === 'aegg'
                    ? 'bg-primary-100 dark:bg-primary-900/30'
                    : 'bg-pink-100 dark:bg-pink-900/30'
                )}>
                  {partner.role === 'aegg' ? '⭐' : '🌙'}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{partner.display_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{partner.role}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Joined {new Date(partner.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Heart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No partner found yet.</p>
                <p className="text-xs mt-1">Use the form below to invite them!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordMsg && (
                <StatusMessage type={passwordMsg.type} text={passwordMsg.text} />
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full"
              >
                {savingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Invite User Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New User
            </CardTitle>
            <CardDescription>
              Create account for your partner to access the workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              {inviteError && <StatusMessage type="error" text={inviteError} />}
              {inviteSuccess && <StatusMessage type="success" text={inviteSuccess} />}

              <div className="space-y-2">
                <label htmlFor="invite_display_name" className="text-sm font-medium text-foreground">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="invite_display_name"
                    name="display_name"
                    type="text"
                    placeholder="e.g. Peppaa"
                    className="pl-10"
                    required
                    disabled={inviteLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="invite_email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="invite_email"
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    className="pl-10"
                    required
                    disabled={inviteLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="invite_password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="invite_password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    required
                    disabled={inviteLoading}
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <Button type="submit" className="w-full" disabled={inviteLoading}>
                {inviteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Log
            </CardTitle>
            <CardDescription>
              Semua aktivitas kamu dan pasanganmu di workspace ini
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Cards */}
            {activityStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(activityStats).map(([uid, stats]) => {
                  const isAegg = stats.role === 'aegg'
                  return (
                    <div
                      key={uid}
                      className={cn(
                        'rounded-xl border p-4 space-y-2',
                        isAegg
                          ? 'border-primary/30 bg-primary-50/50 dark:bg-primary-900/10'
                          : 'border-pink-300/30 bg-pink-50/50 dark:bg-pink-900/10'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{isAegg ? '⭐' : '🌙'}</span>
                        <span className="font-semibold text-sm text-foreground">{stats.name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="flex items-center justify-center gap-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span className="text-sm font-bold text-foreground">{stats.streak}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Streak</p>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-foreground">{stats.weeklyActions}</span>
                          <p className="text-[10px] text-muted-foreground">Minggu ini</p>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-foreground">{stats.todayActions}</span>
                          <p className="text-[10px] text-muted-foreground">Hari ini</p>
                        </div>
                      </div>
                      {stats.lastLogin && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Login terakhir: {new Date(stats.lastLogin).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {stats.daysSinceLogin > 3 && (
                            <span className="text-orange-500 font-medium ml-1">
                              ⚠ {stats.daysSinceLogin} hari lalu
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: 'Semua' },
                { key: 'daily_login', label: '🔑 Login' },
                { key: 'create_todo', label: '✅ Todo' },
                { key: 'create_goal', label: '🎯 Goal' },
                { key: 'add_transaction', label: '💸 Finance' },
                { key: 'add_wishlist', label: '🎁 Wishlist' },
                { key: 'create_event', label: '📅 Event' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleFilterChange(tab.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    activityFilter === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Activity Table */}
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada aktivitas</p>
                <p className="text-xs mt-1">Mulai gunakan fitur-fitur workspace!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Header (desktop) */}
                <div className="hidden md:grid md:grid-cols-[40px_1fr_130px_160px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                  <div></div>
                  <div>Aktivitas</div>
                  <div>Oleh</div>
                  <div>Waktu</div>
                </div>

                {/* Rows */}
                {activityLogs.map((log) => {
                  const logProfile = log.profiles as any
                  const isAegg = logProfile?.role === 'aegg'
                  const actionLabel = getActionLabel(log.action as any)
                  const actionIcon = getActionIcon(log.action as any)
                  const createdAt = new Date(log.created_at)
                  const timeStr = createdAt.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }) + ', ' + createdAt.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  // Build detail text
                  let detail = ''
                  if (log.metadata?.title) detail = log.metadata.title
                  else if (log.page && log.action !== 'daily_login') detail = log.page

                  return (
                    <div
                      key={log.id}
                      className="grid grid-cols-[32px_1fr] md:grid-cols-[40px_1fr_130px_160px] gap-2 md:gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors items-center"
                    >
                      {/* Icon */}
                      <span className="text-lg md:text-xl flex-shrink-0">{actionIcon}</span>

                      {/* Activity */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {actionLabel}
                          {detail && (
                            <span className="text-muted-foreground font-normal"> — {detail}</span>
                          )}
                        </p>
                        {/* Mobile: show user & time inline */}
                        <div className="flex items-center gap-2 md:hidden mt-0.5">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                            isAegg
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                              : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                          )}>
                            {isAegg ? '⭐' : '🌙'} {logProfile?.display_name || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                        </div>
                      </div>

                      {/* User (desktop) */}
                      <div className="hidden md:flex items-center gap-1.5">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                          isAegg
                            ? 'bg-primary-100 dark:bg-primary-900/30'
                            : 'bg-pink-100 dark:bg-pink-900/30'
                        )}>
                          {isAegg ? '⭐' : '🌙'}
                        </div>
                        <span className="text-xs text-foreground truncate">
                          {logProfile?.display_name || 'Unknown'}
                        </span>
                      </div>

                      {/* Time (desktop) */}
                      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{timeStr}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Load More */}
                {activityLogs.length < activityTotal && (
                  <div className="pt-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full sm:w-auto"
                    >
                      {loadingMore ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 mr-2" />
                      )}
                      Muat lagi ({activityTotal - activityLogs.length} sisa)
                    </Button>
                  </div>
                )}

                {/* Total count */}
                <p className="text-center text-xs text-muted-foreground pt-2">
                  Menampilkan {activityLogs.length} dari {activityTotal} aktivitas
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-red-200 dark:border-red-900/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Sign Out</h3>
                <p className="text-sm text-muted-foreground">Log out of your account</p>
              </div>
              <Button
                variant="outline"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

// Status message component
function StatusMessage({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-3 rounded-lg border',
      type === 'error'
        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
    )}>
      {type === 'error' ? (
        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
      ) : (
        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
      )}
      <p className={cn(
        'text-sm',
        type === 'error' ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
      )}>
        {text}
      </p>
    </div>
  )
}
