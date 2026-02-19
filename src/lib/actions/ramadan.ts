'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { RamadanDayData } from '@/lib/ramadan'

export interface RamadanLog {
    id: string
    user_id: string
    date: string
    data: RamadanDayData
    created_at: string
    updated_at: string
    profiles?: {
        display_name: string
        role: string
        avatar_url: string | null
    }
}

export async function getRamadanLogs(userId?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('ramadan_logs')
        .select('*, profiles:user_id(display_name, role, avatar_url)')
        .order('date', { ascending: true })

    if (userId) {
        query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching ramadan logs:', error)
        return []
    }

    return (data || []) as RamadanLog[]
}

export async function logRamadanDay(date: string, data: RamadanDayData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Check if log exists
    const { data: existing } = await supabase
        .from('ramadan_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .single()

    if (existing) {
        const { error } = await supabase
            .from('ramadan_logs')
            .update({ data, updated_at: new Date().toISOString() })
            .eq('id', existing.id)

        if (error) return { error: error.message }
    } else {
        const { error } = await supabase
            .from('ramadan_logs')
            .insert({
                user_id: user.id,
                date,
                data
            })

        if (error) return { error: error.message }
    }

    revalidatePath('/ramadan')
    return { success: true }
}
