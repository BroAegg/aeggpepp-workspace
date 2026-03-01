'use server'

import { createClient } from '@/lib/supabase/server'

export type ActivityAction =
    | 'daily_login'
    | 'page_view'
    | 'create_todo'
    | 'complete_todo'
    | 'update_todo'
    | 'create_goal'
    | 'complete_goal'
    | 'update_goal'
    | 'add_transaction'
    | 'add_savings'
    | 'add_budget'
    | 'create_event'
    | 'upload_photo'
    | 'add_wishlist'
    | 'purchase_wishlist'
    | 'update_profile'

export interface ActivityLog {
    id: string
    user_id: string
    action: ActivityAction
    page: string | null
    metadata: Record<string, any>
    created_at: string
    profiles?: {
        display_name: string
        role: 'aegg' | 'peppaa'
    }
}

export interface UserActivityStats {
    name: string
    role: 'aegg' | 'peppaa'
    weeklyActions: number
    todayActions: number
    streak: number
    lastLogin: string | null
    daysSinceLogin: number
}

// Actions excluded from meaningful action counts
const NOISE_ACTIONS = ['page_view', 'daily_login']

/**
 * Log a user activity
 */
export async function logActivity(
    action: ActivityAction,
    page?: string,
    metadata?: Record<string, any>
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // daily_login: max once per 20 hours (handles midnight timezone edge)
        if (action === 'daily_login') {
            const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
            const { data: recent } = await supabase
                .from('activity_logs')
                .select('id')
                .eq('user_id', user.id)
                .eq('action', 'daily_login')
                .gte('created_at', twentyHoursAgo)
                .limit(1)
            if (recent && recent.length > 0) return
        }

        // page_view: max once per page per 5 minutes
        if (action === 'page_view' && page) {
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
            const { data: recent } = await supabase
                .from('activity_logs')
                .select('id')
                .eq('user_id', user.id)
                .eq('action', 'page_view')
                .eq('page', page)
                .gte('created_at', fiveMinAgo)
                .limit(1)
            if (recent && recent.length > 0) return
        }

        await supabase.from('activity_logs').insert({
            user_id: user.id,
            action,
            page: page || null,
            metadata: metadata || {},
        })
    } catch (err) {
        console.error('Activity log error:', err)
    }
}

/**
 * Get recent activity feed (both users) — excludes noise
 */
export async function getActivityFeed(limit = 20): Promise<ActivityLog[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles:user_id(display_name, role)')
        .not('action', 'in', `(${NOISE_ACTIONS.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching activity feed:', error)
        return []
    }

    return data || []
}

/**
 * Get per-user activity stats (streak, last login, today/week counts)
 * Streak = consecutive days with a daily_login event
 * Counts = meaningful actions only (no page_view, no daily_login)
 */
export async function getActivityStats(): Promise<Record<string, UserActivityStats> | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    // Fetch daily_login events for streak + last login calculation (last 30 days)
    const [loginRes, weekRes, todayRes] = await Promise.all([
        supabase
            .from('activity_logs')
            .select('user_id, created_at, profiles:user_id(display_name, role)')
            .eq('action', 'daily_login')
            .gte('created_at', thirtyDaysAgo)
            .order('created_at', { ascending: false }),
        // Meaningful actions this week
        supabase
            .from('activity_logs')
            .select('user_id, created_at, profiles:user_id(display_name, role)')
            .not('action', 'in', `(${NOISE_ACTIONS.join(',')})`)
            .gte('created_at', weekAgo),
        // Today's meaningful actions
        supabase
            .from('activity_logs')
            .select('user_id, created_at, profiles:user_id(display_name, role)')
            .not('action', 'in', `(${NOISE_ACTIONS.join(',')})`)
            .gte('created_at', todayStart),
    ])

    const userStats: Record<string, UserActivityStats> = {}

    const ensureUser = (uid: string, profile: any) => {
        if (!userStats[uid]) {
            userStats[uid] = {
                name: profile?.display_name || 'Unknown',
                role: profile?.role || 'aegg',
                weeklyActions: 0,
                todayActions: 0,
                streak: 0,
                lastLogin: null,
                daysSinceLogin: 999,
            }
        }
    }

    // Process logins → streak + lastLogin
    const loginDaysByUser: Record<string, Set<string>> = {}

    loginRes.data?.forEach((log: any) => {
        const uid = log.user_id
        ensureUser(uid, log.profiles)

        if (!loginDaysByUser[uid]) loginDaysByUser[uid] = new Set()
        const d = new Date(log.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        loginDaysByUser[uid].add(key)

        // First entry (sorted desc) = last login
        if (!userStats[uid].lastLogin) {
            userStats[uid].lastLogin = log.created_at
            const diffMs = now.getTime() - new Date(log.created_at).getTime()
            userStats[uid].daysSinceLogin = Math.floor(diffMs / 86400000)
        }
    })

    // Calculate streak per user (consecutive days going back from today)
    Object.entries(loginDaysByUser).forEach(([uid, days]) => {
        let streak = 0
        for (let i = 0; i < 31; i++) {
            const d = new Date(now.getTime() - i * 86400000)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            if (days.has(key)) {
                streak++
            } else if (i > 0) {
                break // Streak broken
            }
        }
        userStats[uid].streak = streak
    })

    // Process weekly actions
    weekRes.data?.forEach((log: any) => {
        const uid = log.user_id
        ensureUser(uid, log.profiles)
        userStats[uid].weeklyActions++
    })

    // Process today's actions
    todayRes.data?.forEach((log: any) => {
        const uid = log.user_id
        ensureUser(uid, log.profiles)
        userStats[uid].todayActions++
    })

    return Object.keys(userStats).length > 0 ? userStats : null
}
