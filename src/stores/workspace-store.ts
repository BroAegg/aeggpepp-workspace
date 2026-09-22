import { create } from 'zustand'
import type { Transaction, Budget, SavingsAccount, Todo, Goal, CalendarEvent } from '@/types'

interface WorkspaceState {
  // Profile
  profile: any | null
  setProfile: (p: any) => void

  // Finance Cache
  transactions: Transaction[]
  budgets: Budget[]
  savings: SavingsAccount[]
  financeLoaded: boolean
  financeLastFetched: number | null
  setFinanceData: (data: {
    transactions?: Transaction[]
    budgets?: Budget[]
    savings?: SavingsAccount[]
  }) => void
  addTransactionOptimistic: (tx: Transaction) => void
  removeTransactionOptimistic: (id: string) => void
  invalidateFinance: () => void

  // Dashboard Cache
  todos: Todo[]
  goals: Goal[]
  events: CalendarEvent[]
  dashboardLoaded: boolean
  dashboardLastFetched: number | null
  setDashboardData: (data: {
    todos?: Todo[]
    goals?: Goal[]
    events?: CalendarEvent[]
  }) => void
  invalidateDashboard: () => void

  // Global Invalidation
  invalidateAll: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  // Profile
  profile: null,
  setProfile: (profile) => set({ profile }),

  // Finance
  transactions: [],
  budgets: [],
  savings: [],
  financeLoaded: false,
  financeLastFetched: null,

  setFinanceData: (data) =>
    set((state) => ({
      transactions: data.transactions !== undefined ? data.transactions : state.transactions,
      budgets: data.budgets !== undefined ? data.budgets : state.budgets,
      savings: data.savings !== undefined ? data.savings : state.savings,
      financeLoaded: true,
      financeLastFetched: Date.now(),
    })),

  addTransactionOptimistic: (tx) =>
    set((state) => ({
      transactions: [tx, ...state.transactions],
    })),

  removeTransactionOptimistic: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),

  invalidateFinance: () =>
    set({
      financeLoaded: false,
      financeLastFetched: null,
    }),

  // Dashboard
  todos: [],
  goals: [],
  events: [],
  dashboardLoaded: false,
  dashboardLastFetched: null,

  setDashboardData: (data) =>
    set((state) => ({
      todos: data.todos !== undefined ? data.todos : state.todos,
      goals: data.goals !== undefined ? data.goals : state.goals,
      events: data.events !== undefined ? data.events : state.events,
      dashboardLoaded: true,
      dashboardLastFetched: Date.now(),
    })),

  invalidateDashboard: () =>
    set({
      dashboardLoaded: false,
      dashboardLastFetched: null,
    }),

  // Invalidate All
  invalidateAll: () =>
    set({
      financeLoaded: false,
      financeLastFetched: null,
      dashboardLoaded: false,
      dashboardLastFetched: null,
    }),
}))
