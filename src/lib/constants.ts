// App Configuration
export const APP_NAME = 'AeggPepp Workspace'
export const APP_DESCRIPTION = 'Personal Couple Productivity Dashboard'

// Users
export const USERS = {
  AEGG: {
    name: 'Aegg',
    role: 'aegg',
    description: 'Fullstack Engineer',
  },
  PEPPAA: {
    name: 'Peppaa',
    role: 'peppaa',
    description: 'PM Game Developer',
  },
} as const

// Navigation Items
export const NAV_ITEMS = [
  {
    title: 'Home',
    href: '/',
    icon: 'Home',
    emoji: '🏠',
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: 'Calendar',
    emoji: '📅',
  },
  {
    title: 'Goals',
    href: '/goals',
    icon: 'Target',
    emoji: '🎯',
  },
  {
    title: 'Gallery',
    href: '/gallery',
    icon: 'Image',
    emoji: '📸',
  },
  {
    title: 'Portfolio',
    href: '/portfolio',
    icon: 'Briefcase',
    emoji: '💼',
  },
  {
    title: 'Wishlist',
    href: '/wishlist',
    icon: 'Gift',
    emoji: '🎁',
  },
  {
    title: 'Finance',
    href: '/finance',
    icon: 'Wallet',
    emoji: '💰',
  },
] as const

// Goal Statuses
export const GOAL_STATUSES = {
  backlog: {
    label: 'Backlog',
    color: 'bg-secondary text-secondary-foreground',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700',
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-700',
  },
  archived: {
    label: 'Archived',
    color: 'bg-gray-100 text-gray-500',
  },
} as const

// Priority Levels
export const PRIORITIES = {
  low: {
    label: 'Low',
    color: 'bg-secondary text-muted-foreground',
  },
  medium: {
    label: 'Medium',
    color: 'bg-amber-100 text-amber-700',
  },
  high: {
    label: 'High',
    color: 'bg-red-100 text-red-700',
  },
} as const

// Transaction Categories
export const TRANSACTION_CATEGORIES = {
  income: [
    { value: 'salary', label: 'Gaji', icon: '💵' },
    { value: 'freelance', label: 'Freelance', icon: '💻' },
    { value: 'asprak', label: 'Asprak', icon: '🎓' },
    { value: 'volunteer', label: 'Volunteer', icon: '🤝' },
    { value: 'investment', label: 'Investasi', icon: '📈' },
    { value: 'gift', label: 'Hadiah', icon: '🎁' },
    { value: 'other_income', label: 'Lainnya', icon: '💰' },
  ],
  expense: [
    { value: 'food', label: 'Jajan/Makanan', icon: '🍔' },
    { value: 'daily_needs', label: 'Kebutuhan Harian', icon: '🏪' },
    { value: 'shopping', label: 'Belanja Bulanan', icon: '🛒' },
    { value: 'transport', label: 'Transportasi', icon: '🚗' },
    { value: 'clothing', label: 'Beli Pakaian', icon: '👕' },
    { value: 'treatment', label: 'Treatment/Skincare', icon: '💆' },
    { value: 'sedekah', label: 'Sedekah', icon: '🤲' },
    { value: 'gift_giving', label: 'Ngasih', icon: '🎀' },
    { value: 'vacation', label: 'Liburan', icon: '✈️' },
    { value: 'entertainment', label: 'Hiburan', icon: '🎮' },
    { value: 'bills', label: 'Tagihan', icon: '📄' },
    { value: 'utilities', label: 'Listrik & Air', icon: '💡' },
    { value: 'internet', label: 'Kuota/Internet', icon: '📶' },
    { value: 'health', label: 'Kesehatan/Pengobatan', icon: '🏥' },
    { value: 'vehicle', label: 'Service Kendaraan', icon: '🔧' },
    { value: 'furniture', label: 'Perabotan', icon: '🪑' },
    { value: 'education', label: 'Pendidikan', icon: '📚' },
    { value: 'saving', label: 'Saving/Nabung', icon: '🐷' },
    { value: 'ewallet', label: 'E-Wallet/DANA', icon: '📱' },
    { value: 'date', label: 'Kencan', icon: '❤️' },
    { value: 'other_expense', label: 'Lain-lain', icon: '💸' },
  ],
} as const

// Calendar Event Colors
export const EVENT_COLORS = [
  { value: '#0F766E', label: 'Teal' },
  { value: '#2563EB', label: 'Blue' },
  { value: '#7C3AED', label: 'Purple' },
  { value: '#DB2777', label: 'Pink' },
  { value: '#DC2626', label: 'Red' },
  { value: '#EA580C', label: 'Orange' },
  { value: '#16A34A', label: 'Green' },
  { value: '#64748B', label: 'Gray' },
] as const

// Todo Categories
export const TODO_CATEGORIES = [
  { value: 'work', label: 'Work', icon: '💼', color: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' },
  { value: 'personal', label: 'Personal', icon: '🏠', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'shopping', label: 'Shopping', icon: '🛒', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'other', label: 'Other', icon: '📌', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300' },
] as const

