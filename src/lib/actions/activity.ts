'use server'

import { createClient } from '@/lib/supabase/server'

export type ActivityAction =
    | 'page_view'
    | 'create_todo'
    | 'complete_todo'
    | 'update_todo'
    | 'create_goal'
    | 'update_goal'
    | 'add_transaction'
    | 'create_event'
    | 'upload_photo'
    | 'add_wishlist'
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

        // Throttle page_view logs - max 1 per page per 5 minutes
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

            if (recent && recent.length > 0) return // Skip duplicate
        }

        await supabase.from('activity_logs').insert({
            user_id: user.id,
            action,
            page: page || null,
            metadata: metadata || {},
        })
    } catch (err) {
        // Silently fail - activity logging should never break the app
        console.error('Activity log error:', err)
    }
}

/**
 * Get recent activity feed (both users)
 */
export async function getActivityFeed(limit = 20): Promise<ActivityLog[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles:user_id(display_name, role)')
        .neq('action', 'page_view') // Exclude page views from feed
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching activity feed:', error)
        return []
    }

    return data || []
}

/**
 * Get activity stats for both users
 */
export async function getActivityStats() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    // Get this week's activity counts per user
    const { data: weeklyData } = await supabase
        .from('activity_logs')
        .select('user_id, action, created_at, profiles:user_id(display_name, role)')
        .gte('created_at', weekAgo)

    if (!weeklyData) return null

    // Get today's activity per user
    const { data: todayData } = await supabase
        .from('activity_logs')
        .select('user_id, action, created_at, profiles:user_id(display_name, role)')
        .gte('created_at', todayStart)

    // Calculate streaks - consecutive days with activity
    const { data: allDates } = await supabase
        .from('activity_logs')
        .select('user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

    const userStats: Record<string, {
        name: string
        role: 'aegg' | 'peppaa'
        weeklyActions: number
        todayActions: number
        streak: number
        lastSeen: string | null
    }> = {}

    // Process weekly data
    weeklyData?.forEach((log: any) => {
        const uid = log.user_id
        if (!userStats[uid]) {
            userStats[uid] = {
                name: log.profiles?.display_name || 'Unknown',
                role: log.profiles?.role || 'aegg',
                weeklyActions: 0,
                todayActions: 0,
                streak: 0,
                lastSeen: null,
            }
        }
        userStats[uid].weeklyActions++
    })

    // Process today data
    todayData?.forEach((log: any) => {
        const uid = log.user_id
        if (userStats[uid]) {
            userStats[uid].todayActions++
        }
    })

    // Calculate streaks & last seen
    allDates?.forEach((log: any) => {
        const uid = log.user_id
        if (userStats[uid] && !userStats[uid].lastSeen) {
            userStats[uid].lastSeen = log.created_at
        }
    })

    // Calculate streaks per user
    const userDates: Record<string, Set<string>> = {}
    allDates?.forEach((log: any) => {
        if (!userDates[log.user_id]) userDates[log.user_id] = new Set()
        const d = new Date(log.created_at)
        userDates[log.user_id].add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    })

    Object.entries(userDates).forEach(([uid, dates]) => {
        if (!userStats[uid]) return
        let streak = 0
        const today = new Date()
        for (let i = 0; i < 365; i++) {
            const d = new Date(today.getTime() - i * 86400000)
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
            if (dates.has(key)) {
                streak++
            } else if (i > 0) { // Allow today to not have activity yet
                break
            }
        }
        userStats[uid].streak = streak
    })

    return userStats
}
