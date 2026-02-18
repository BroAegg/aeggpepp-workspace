// User & Auth Types
export interface User {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  role: 'aegg' | 'peppaa'
  created_at: string
  updated_at: string
}

// Calendar Types
export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  all_day: boolean
  color: string
  created_at: string
}

// Goals/Kanban Types
export type GoalStatus = 'backlog' | 'in_progress' | 'completed' | 'archived'
export type Priority = 'low' | 'medium' | 'high'

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  status: GoalStatus
  priority: Priority
  position: number
  due_date: string | null
  tag: string | null
  created_at: string
  goal_tasks?: GoalTask[]
}

export interface GoalTask {
  id: string
  goal_id: string
  title: string
  completed: boolean
  position: number
}

// Gallery Types
export interface GalleryItem {
  id: string
  user_id: string
  image_url: string
  caption: string | null
  taken_at: string | null
  created_at: string
}

// Portfolio Types
export type PortfolioCategory = 'project' | 'social' | 'other'

export interface PortfolioLink {
  id: string
  user_id: string
  title: string
  url: string
  description: string | null
  category: PortfolioCategory
  icon: string | null
  created_at: string
}

// Wishlist Types
export interface WishlistItem {
  id: string
  user_id: string
  title: string
  price: number | null
  currency: string
  url: string | null
  image_url: string | null
  priority: Priority
  is_purchased: boolean
  is_shared: boolean
  profiles?: ItemOwner
  created_at: string
}

// Finance Types
export type TransactionType = 'income' | 'expense'
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  category: string
  sub_title: string | null
  amount: number
  description: string | null
  date: string
  is_split: boolean
  split_with: string | null
  paid_by: string | null
  is_settled: boolean
  receipt_url?: string | null
  created_at: string
  profiles?: ItemOwner
}

// Savings Types
export type SavingsAccountType = 'cash' | 'digital'

export interface SavingsAccount {
  id: string
  user_id: string
  name: string
  type: SavingsAccountType
  bank_code: string | null
  balance: number
  icon: string | null
  created_at: string
  updated_at: string
  profiles?: ItemOwner
}

export interface SavingsTransaction {
  id: string
  account_id: string
  user_id: string
  amount: number
  type: 'deposit' | 'withdraw'
  description: string | null
  date: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  period: BudgetPeriod
  created_at: string
}

// Todo Types
export type TodoCategory = 'work' | 'personal' | 'shopping' | 'other'
export type TodoStatus = 'todo' | 'in_progress' | 'completed'

export interface Todo {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  status: TodoStatus
  priority: Priority
  category: TodoCategory | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  profiles?: ItemOwner
  todo_tasks?: TodoTask[]
}

export interface TodoTask {
  id: string
  todo_id: string
  title: string
  completed: boolean
  position: number
}

// Owner info (from profiles join)
export interface ItemOwner {
  display_name: string
  role: string | null
}

// Unified Calendar Item (aggregated from events + todos + goals)
export type CalendarItemType = 'event' | 'todo' | 'goal'

export interface CalendarItem {
  id: string
  type: CalendarItemType
  title: string
  description: string | null
  date: string
  time: string | null
  endTime: string | null
  startIso?: string // ISO string for client-side time formatting
  endIso?: string | null
  allDay: boolean
  color: string
  completed: boolean
  priority: Priority | null
  owner: ItemOwner
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

// Component Props Types
export interface NavItem {
  title: string
  href: string
  icon: string
  emoji: string
}

// Database Types (Supabase format)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: User
        Insert: Partial<User> & { id: string; email: string }
        Update: Partial<User>
        Relationships: []
      }
      events: {
        Row: CalendarEvent
        Insert: Omit<CalendarEvent, 'id' | 'created_at'>
        Update: Partial<Omit<CalendarEvent, 'id' | 'created_at'>>
        Relationships: []
      }
      goals: {
        Row: Goal
        Insert: Omit<Goal, 'id' | 'created_at' | 'tasks'>
        Update: Partial<Omit<Goal, 'id' | 'created_at' | 'tasks'>>
        Relationships: []
      }
      goal_tasks: {
        Row: GoalTask
        Insert: Omit<GoalTask, 'id'>
        Update: Partial<Omit<GoalTask, 'id'>>
        Relationships: []
      }
      gallery: {
        Row: GalleryItem
        Insert: Omit<GalleryItem, 'id' | 'created_at'>
        Update: Partial<Omit<GalleryItem, 'id' | 'created_at'>>
        Relationships: []
      }
      portfolio_links: {
        Row: PortfolioLink
        Insert: Omit<PortfolioLink, 'id' | 'created_at'>
        Update: Partial<Omit<PortfolioLink, 'id' | 'created_at'>>
        Relationships: []
      }
      wishlist: {
        Row: WishlistItem
        Insert: Omit<WishlistItem, 'id' | 'created_at'>
        Update: Partial<Omit<WishlistItem, 'id' | 'created_at'>>
        Relationships: []
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>
        Relationships: []
      }
      budgets: {
        Row: Budget
        Insert: Omit<Budget, 'id' | 'created_at'>
        Update: Partial<Omit<Budget, 'id' | 'created_at'>>
        Relationships: []
      }
      todos: {
        Row: Todo
        Insert: Omit<Todo, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Todo, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
