import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { CheckSquare, Square, Plus, Trash2 } from 'lucide-react-native'
import { supabase } from '../api/supabase'
import { theme } from '../theme/colors'
import type { Todo } from '../types'

const colors = theme.dark

export function TodosScreen() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchTodos = async () => {
    try {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .order('completed', { ascending: true })
        .order('created_at', { ascending: false })
      if (data) setTodos(data as Todo[])
    } catch (err) {
      console.error('Error fetching todos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [])

  const handleToggleTodo = async (todo: Todo) => {
    // Satisfying Haptic Feedback tick
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const nextCompleted = !todo.completed
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: nextCompleted } : t))
    )

    try {
      await supabase.from('todos').update({ completed: nextCompleted }).eq('id', todo.id)
    } catch {
      fetchTodos()
    }
  }

  const handleAddTodo = async () => {
    if (!newTitle.trim()) return

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const title = newTitle.trim()
    setNewTitle('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('todos')
        .insert({
          user_id: user.id,
          title,
          completed: false,
          status: 'todo',
          priority: 'medium',
        })
        .select()
        .single()

      if (data) {
        setTodos((prev) => [data as Todo, ...prev])
      }
    } catch (err) {
      console.error('Error adding todo:', err)
      fetchTodos()
    }
  }

  const handleDeleteTodo = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setTodos((prev) => prev.filter((t) => t.id !== id))
    try {
      await supabase.from('todos').delete().eq('id', id)
    } catch {
      fetchTodos()
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks & Belanja</Text>
        <Text style={styles.headerSubtitle}>Checklist harian Aegg & Peppaa</Text>
      </View>

      {/* Input New Todo */}
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Tambah tugas / barang belanja baru..."
          placeholderTextColor={colors.textMuted}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAddTodo}
          style={styles.input}
        />
        <TouchableOpacity onPress={handleAddTodo} style={styles.addButton}>
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Todo List */}
      <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
        {todos.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => handleToggleTodo(t)}
            activeOpacity={0.7}
            style={[styles.todoCard, t.completed && styles.todoCardCompleted]}
          >
            {t.completed ? (
              <CheckSquare size={20} color={colors.success} />
            ) : (
              <Square size={20} color={colors.textMuted} />
            )}
            <Text
              style={[
                styles.todoTitle,
                t.completed && styles.todoTitleCompleted,
              ]}
            >
              {t.title}
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteTodo(t.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listScroll: {
    flex: 1,
  },
  todoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
    gap: 12,
  },
  todoCardCompleted: {
    opacity: 0.6,
  },
  todoTitle: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
})
