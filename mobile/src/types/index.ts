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

export interface ItemOwner {
  display_name: string
  role: string | null
}

export type Priority = 'low' | 'medium' | 'high'

// Wedding Types
export type WeddingCategory =
  | 'kua'
  | 'venue'
  | 'catering'
  | 'attire_mua'
  | 'documentation'
  | 'ring'
  | 'decor'
  | 'invitation_souvenir'
  | 'other'

export type WeddingItemStatus = 'planned' | 'booked_dp' | 'paid_off'

export interface WeddingBudgetItem {
  id: string
  user_id: string
  category: WeddingCategory
  title: string
  estimated_cost: number
  actual_cost: number
  paid_amount: number
  status: WeddingItemStatus
  due_date: string | null
  vendor_name: string | null
  vendor_contact: string | null
  notes: string | null
  created_at: string
  updated_at?: string
  profiles?: ItemOwner
}

export type WeddingGuestGroup =
  | 'family_aegg'
  | 'family_peppaa'
  | 'friends_aegg'
  | 'friends_peppaa'
  | 'vip'
  | 'other'

export type WeddingRsvpStatus = 'pending' | 'attending' | 'declined'

export interface WeddingGuest {
  id: string
  user_id: string
  name: string
  group_type: WeddingGuestGroup
  pax: number
  rsvp_status: WeddingRsvpStatus
  phone: string | null
  notes: string | null
  created_at: string
  profiles?: ItemOwner
}

export interface WeddingRundownItem {
  id: string
  user_id: string
  time_start: string
  time_end: string | null
  title: string
  pic: string | null
  notes: string | null
  position?: number
  created_at: string
  profiles?: ItemOwner
}

// Finance Types
export type TransactionType = 'income' | 'expense'

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

export interface Budget {
  id: string
  user_id: string
  category: string
  amount: number
  period: 'weekly' | 'monthly' | 'yearly'
  created_at: string
}

// Todo Types
export type TodoStatus = 'todo' | 'in_progress' | 'completed'

export interface Todo {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  status: TodoStatus
  priority: Priority
  category: string | null
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
