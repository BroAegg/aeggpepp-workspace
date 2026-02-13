'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Todo, TodoCategory, Priority } from '@/types'

// ============== TODOS ==============

export async function getTodos(): Promise<Todo[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('todos')
        .select('*, profiles:user_id(display_name, role)')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching todos:', error)
        return []
    }

    return data || []
}

export async function createTodo(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const priority = (formData.get('priority') as Priority) || 'medium'
    const category = formData.get('category') as TodoCategory | null
    const dueDate = formData.get('due_date') as string

    if (!title?.trim()) {
        return { error: 'Title is required' }
    }

    const { error } = await supabase.from('todos').insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        completed: false,
        priority,
        category: category || null,
        due_date: dueDate || null,
        completed_at: null,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/todos')
    return { success: true }
}

export async function updateTodo(id: string, formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const priority = (formData.get('priority') as Priority) || 'medium'
    const category = formData.get('category') as TodoCategory | null
    const dueDate = formData.get('due_date') as string

    if (!title?.trim()) {
        return { error: 'Title is required' }
    }

    const { error } = await supabase
        .from('todos')
        .update({
            title: title.trim(),
            description: description?.trim() || null,
            priority,
            category: category || null,
            due_date: dueDate || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/todos')
    return { success: true }
}

export async function toggleTodo(id: string, completed: boolean) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('todos')
        .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/todos')
    return { success: true }
}

export async function deleteTodo(id: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/todos')
    return { success: true }
}
