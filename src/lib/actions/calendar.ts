'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CalendarEvent, CalendarItem, Goal } from '@/types'

// ============== FETCH EVENTS ==============

export async function getEvents(): Promise<CalendarEvent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, profiles:user_id(display_name, role)')
    .order('start_date', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return data || []
}

// ============== AGGREGATED CALENDAR ITEMS ==============

export async function getCalendarItems(): Promise<CalendarItem[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch events, goals, and todos in parallel
  const [eventsRes, goalsRes, todosRes] = await Promise.all([
    supabase
      .from('events')
      .select('*, profiles:user_id(display_name, role)')
      .order('start_date', { ascending: true }),
    supabase
      .from('goals')
      .select('*, profiles:user_id(display_name, role)')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true }),
    supabase
      .from('todos')
      .select('*, profiles:user_id(display_name, role)')
      .not('due_date', 'is', null)
      .eq('status', 'todo')
      .order('due_date', { ascending: true }),
  ])

  const items: CalendarItem[] = []

  // Map events
  if (eventsRes.data) {
    for (const e of eventsRes.data) {
      const startDate = new Date(e.start_date)
      const endDate = e.end_date ? new Date(e.end_date) : null
      items.push({
        id: e.id,
        type: 'event',
        title: e.title,
        description: e.description,
        date: startDate.toISOString().split('T')[0],
        time: e.all_day ? null : startDate.toTimeString().slice(0, 5),
        endTime: e.all_day ? null : (endDate ? endDate.toTimeString().slice(0, 5) : null),
        startIso: e.start_date, // Raw ISO string for client formatting
        endIso: e.end_date,
        allDay: e.all_day,
        color: e.color || '#2563EB',
        completed: false,
        priority: null,
        owner: e.profiles || { display_name: 'Unknown', role: null },
      })
    }
  }

  // Map goals with due_date
  if (goalsRes.data) {
    for (const g of goalsRes.data) {
      items.push({
        id: g.id,
        type: 'goal',
        title: g.title,
        description: g.description,
        date: g.due_date!,
        time: null,
        endTime: null,
        allDay: true,
        color: '#A855F7', // purple
        completed: g.status === 'completed',
        priority: g.priority,
        owner: g.profiles || { display_name: 'Unknown', role: null },
      })
    }
  }

  // Map todos with due_date (only 'todo' status - not completed)
  if (todosRes.data) {
    for (const t of todosRes.data) {
      items.push({
        id: t.id,
        type: 'todo',
        title: t.title,
        description: t.description,
        date: t.due_date!,
        time: null,
        endTime: null,
        allDay: true,
        color: '#64748B', // slate gray
        completed: t.completed || t.status === 'completed',
        priority: t.priority,
        owner: t.profiles || { display_name: 'Unknown', role: null },
      })
    }
  }

  return items
}

// ============== CRUD EVENTS ==============

export async function createEvent(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const allDay = formData.get('all_day') === 'true'
  const color = (formData.get('color') as string) || '#0F766E'

  if (!title || !startDate) {
    return { error: 'Title and start date are required' }
  }

  const { error } = await supabase.from('events').insert({
    user_id: user.id,
    title,
    description: description || null,
    start_date: startDate,
    end_date: endDate || null,
    all_day: allDay,
    color,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/calendar')
  return { success: true }
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const allDay = formData.get('all_day') === 'true'
  const color = (formData.get('color') as string) || '#0F766E'

  const { error } = await supabase
    .from('events')
    .update({
      title,
      description: description || null,
      start_date: startDate,
      end_date: endDate || null,
      all_day: allDay,
      color,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/calendar')
  return { success: true }
}

export async function deleteEvent(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/calendar')
  return { success: true }
}
