'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TodoCategoryItem } from '@/types'

/**
 * Get all todo categories (shared between both users)
 */
export async function getTodoCategories(): Promise<TodoCategoryItem[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('todo_categories')
        .select('*')
        .order('position', { ascending: true })

    if (error) {
        console.error('Error fetching todo categories:', error)
        return []
    }

    return data || []
}

/**
 * Create a new todo category
 */
export async function createTodoCategory(name: string, icon?: string, color?: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (!name?.trim()) {
        return { error: 'Category name is required' }
    }

    // Get max position
    const { data: existing } = await supabase
        .from('todo_categories')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)

    const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

    const { data, error } = await supabase
        .from('todo_categories')
        .insert({
            name: name.trim(),
            icon: icon?.trim() || null,
            color: color || 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300',
            position: nextPosition,
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/todos')
    return { success: true, category: data }
}

/**
 * Update a todo category
 */
export async function updateTodoCategory(
    id: string,
    updates: { name?: string; icon?: string | null; color?: string }
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Get old category name for updating todos
    const { data: oldCat } = await supabase
        .from('todo_categories')
        .select('name')
        .eq('id', id)
        .single()

    const updateData: Record<string, any> = {}
    if (updates.name !== undefined) updateData.name = updates.name.trim()
    if (updates.icon !== undefined) updateData.icon = updates.icon?.trim() || null
    if (updates.color !== undefined) updateData.color = updates.color

    const { error } = await supabase
        .from('todo_categories')
        .update(updateData)
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    // If name changed, update all todos referencing the old name
    if (updates.name && oldCat && oldCat.name !== updates.name.trim()) {
        await supabase
            .from('todos')
            .update({ category: updates.name.trim() })
            .eq('category', oldCat.name)
    }

    revalidatePath('/todos')
    return { success: true }
}

/**
 * Delete a todo category — sets todos with this category to null
 */
export async function deleteTodoCategory(id: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Get the category name first
    const { data: cat } = await supabase
        .from('todo_categories')
        .select('name')
        .eq('id', id)
        .single()

    if (cat) {
        // Clear category from todos that use this category
        await supabase
            .from('todos')
            .update({ category: null })
            .eq('category', cat.name)
    }

    const { error } = await supabase
        .from('todo_categories')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/todos')
    return { success: true }
}
