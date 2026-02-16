'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Todo, TodoCategory, TodoStatus, Priority } from '@/types'

// ============== TODOS ==============

export async function getTodos(): Promise<Todo[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('todos')
        .select('*, profiles:user_id(display_name, role), todo_tasks(*)')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching todos:', error)
        return []
    }

    // Sort todo_tasks by position
    return (data || []).map(todo => ({
        ...todo,
        status: todo.status || 'todo',
        todo_tasks: (todo.todo_tasks || []).sort((a: any, b: any) => a.position - b.position),
    }))
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
        status: 'todo',
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

export async function updateTodoStatus(id: string, status: TodoStatus) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const completed = status === 'completed'

    const { error } = await supabase
        .from('todos')
        .update({
            status,
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

export async function toggleTodo(id: string, completed: boolean) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('todos')
        .update({
            completed,
            status: completed ? 'completed' : 'todo',
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

// ============== TODO TASKS (Sub-tasks) ==============

export async function createTodoTask(todoId: string, title: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (!title?.trim()) {
        return { error: 'Title is required' }
    }

    // Get the max position for this todo
    const { data: existing } = await supabase
        .from('todo_tasks')
        .select('position')
        .eq('todo_id', todoId)
        .order('position', { ascending: false })
        .limit(1)

    const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

    const { error } = await supabase.from('todo_tasks').insert({
        todo_id: todoId,
        title: title.trim(),
        completed: false,
        position: nextPosition,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/todos')
    return { success: true }
}

export async function toggleTodoTask(taskId: string, completed: boolean) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('todo_tasks')
        .update({ completed })
        .eq('id', taskId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/todos')
    return { success: true }
}

export async function deleteTodoTask(taskId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('todo_tasks')
        .delete()
        .eq('id', taskId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/todos')
    return { success: true }
}
