import type { ActivityAction } from '@/lib/actions/activity'

export const ACTION_LABELS: Record<ActivityAction, string> = {
    daily_login: 'Logged in',
    page_view: 'Visited',
    create_todo: 'Buat todo baru',
    complete_todo: 'Selesaikan todo',
    update_todo: 'Update todo',
    create_goal: 'Buat goal baru',
    complete_goal: 'Selesaikan goal',
    update_goal: 'Update goal',
    create_goal_page: 'Buat sub-page goal',
    update_goal_page: 'Edit sub-page goal',
    delete_goal_page: 'Hapus sub-page goal',
    add_transaction: 'Catat transaksi',
    add_savings: 'Tambah tabungan',
    add_budget: 'Buat budget',
    create_event: 'Tambah event',
    upload_photo: 'Upload foto',
    add_wishlist: 'Tambah wishlist',
    purchase_wishlist: 'Beli wishlist item',
    update_profile: 'Update profil',
}

export const ACTION_ICONS: Record<ActivityAction, string> = {
    daily_login: '🔑',
    page_view: '👁️',
    create_todo: '✅',
    complete_todo: '🎉',
    update_todo: '📝',
    create_goal: '🎯',
    complete_goal: '🏆',
    update_goal: '📊',
    create_goal_page: '📄',
    update_goal_page: '✏️',
    delete_goal_page: '🗑️',
    add_transaction: '💸',
    add_savings: '🐷',
    add_budget: '📋',
    create_event: '📅',
    upload_photo: '📸',
    add_wishlist: '🎁',
    purchase_wishlist: '🛍️',
    update_profile: '⚙️',
}

export function getActionLabel(action: ActivityAction): string {
    return ACTION_LABELS[action] || action
}

export function getActionIcon(action: ActivityAction): string {
    return ACTION_ICONS[action] || '📌'
}
