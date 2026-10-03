import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Transaction, Budget, SavingsAccount, Todo, TodoCategoryItem,
  Goal, CalendarEvent, GalleryItem, WishlistItem, PortfolioLink
} from '@/types'

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

  // Todos Cache
  todos: Todo[]
  todoCategories: TodoCategoryItem[]
  todosLoaded: boolean
  setTodosData: (todos: Todo[], categories?: TodoCategoryItem[]) => void
  toggleTodoOptimistic: (id: string, completed: boolean) => void
  invalidateTodos: () => void

  // Goals Cache
  goals: Goal[]
  goalsLoaded: boolean
  setGoalsData: (goals: Goal[]) => void
  toggleGoalTaskOptimistic: (goalId: string, taskId: string, completed: boolean) => void
  invalidateGoals: () => void

  // Calendar Cache
  events: CalendarEvent[]
  eventsLoaded: boolean
  setEventsData: (events: CalendarEvent[]) => void
  invalidateEvents: () => void

  // Gallery Cache
  gallery: GalleryItem[]
  galleryLoaded: boolean
  setGalleryData: (gallery: GalleryItem[]) => void
  addGalleryOptimistic: (item: GalleryItem) => void
  removeGalleryOptimistic: (id: string) => void
  invalidateGallery: () => void

  // Wishlist Cache
  wishlist: WishlistItem[]
  wishlistLoaded: boolean
  setWishlistData: (wishlist: WishlistItem[]) => void
  toggleWishlistOptimistic: (id: string, isPurchased: boolean) => void
  removeWishlistOptimistic: (id: string) => void
  invalidateWishlist: () => void

  // Portfolio Cache
  portfolio: PortfolioLink[]
  portfolioLoaded: boolean
  setPortfolioData: (portfolio: PortfolioLink[]) => void
  removePortfolioOptimistic: (id: string) => void
  invalidatePortfolio: () => void

  // Dashboard Combined Cache
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

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
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

  // Todos
  todos: [],
  todoCategories: [],
  todosLoaded: false,

  setTodosData: (todos, categories) =>
    set((state) => ({
      todos,
      todoCategories: categories !== undefined ? categories : state.todoCategories,
      todosLoaded: true,
    })),

  toggleTodoOptimistic: (id, completed) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, completed } : t)),
    })),

  invalidateTodos: () =>
    set({
      todosLoaded: false,
    }),

  // Goals
  goals: [],
  goalsLoaded: false,

  setGoalsData: (goals) =>
    set({
      goals,
      goalsLoaded: true,
    }),

  toggleGoalTaskOptimistic: (goalId, taskId, completed) =>
    set((state) => ({
      goals: state.goals.map((g) => {
        if (g.id !== goalId) return g
        return {
          ...g,
          goal_tasks: (g.goal_tasks || []).map((t) =>
            t.id === taskId ? { ...t, completed } : t
          ),
        }
      }),
    })),

  invalidateGoals: () =>
    set({
      goalsLoaded: false,
    }),

  // Calendar
  events: [],
  eventsLoaded: false,

  setEventsData: (events) =>
    set({
      events,
      eventsLoaded: true,
    }),

  invalidateEvents: () =>
    set({
      eventsLoaded: false,
    }),

  // Gallery
  gallery: [],
  galleryLoaded: false,

  setGalleryData: (gallery) =>
    set({
      gallery,
      galleryLoaded: true,
    }),

  addGalleryOptimistic: (item) =>
    set((state) => ({
      gallery: [item, ...state.gallery],
    })),

  removeGalleryOptimistic: (id) =>
    set((state) => ({
      gallery: state.gallery.filter((p) => p.id !== id),
    })),

  invalidateGallery: () =>
    set({
      galleryLoaded: false,
    }),

  // Wishlist
  wishlist: [],
  wishlistLoaded: false,

  setWishlistData: (wishlist) =>
    set({
      wishlist,
      wishlistLoaded: true,
    }),

  toggleWishlistOptimistic: (id, isPurchased) =>
    set((state) => ({
      wishlist: state.wishlist.map((item) =>
        item.id === id ? { ...item, is_purchased: isPurchased } : item
      ),
    })),

  removeWishlistOptimistic: (id) =>
    set((state) => ({
      wishlist: state.wishlist.filter((item) => item.id !== id),
    })),

  invalidateWishlist: () =>
    set({
      wishlistLoaded: false,
    }),

  // Portfolio
  portfolio: [],
  portfolioLoaded: false,

  setPortfolioData: (portfolio) =>
    set({
      portfolio,
      portfolioLoaded: true,
    }),

  removePortfolioOptimistic: (id) =>
    set((state) => ({
      portfolio: state.portfolio.filter((p) => p.id !== id),
    })),

  invalidatePortfolio: () =>
    set({
      portfolioLoaded: false,
    }),

  // Dashboard
  dashboardLoaded: false,
  dashboardLastFetched: null,

  setDashboardData: (data) =>
    set((state) => ({
      todos: data.todos !== undefined ? data.todos : state.todos,
      goals: data.goals !== undefined ? data.goals : state.goals,
      events: data.events !== undefined ? data.events : state.events,
      todosLoaded: data.todos !== undefined ? true : state.todosLoaded,
      goalsLoaded: data.goals !== undefined ? true : state.goalsLoaded,
      eventsLoaded: data.events !== undefined ? true : state.eventsLoaded,
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
      todosLoaded: false,
      goalsLoaded: false,
      eventsLoaded: false,
      galleryLoaded: false,
      wishlistLoaded: false,
      portfolioLoaded: false,
      dashboardLoaded: false,
      dashboardLastFetched: null,
    })
  }),
  {
    name: 'aeggpepp-workspace-offline-cache',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
        transactions: state.transactions,
        budgets: state.budgets,
        savings: state.savings,
        financeLoaded: state.financeLoaded,
        financeLastFetched: state.financeLastFetched,
        todos: state.todos,
        todoCategories: state.todoCategories,
        todosLoaded: state.todosLoaded,
        goals: state.goals,
        goalsLoaded: state.goalsLoaded,
        events: state.events,
        eventsLoaded: state.eventsLoaded,
        gallery: state.gallery,
        galleryLoaded: state.galleryLoaded,
        wishlist: state.wishlist,
        wishlistLoaded: state.wishlistLoaded,
        portfolio: state.portfolio,
        portfolioLoaded: state.portfolioLoaded,
        dashboardLoaded: state.dashboardLoaded,
        dashboardLastFetched: state.dashboardLastFetched,
      }),
    }
  )
)
