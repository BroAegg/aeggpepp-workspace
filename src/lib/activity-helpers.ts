import type { ActivityAction } from '@/lib/actions/activity'

export const ACTION_LABELS: Record<ActivityAction, string> = {
    page_view: 'Visited',
    create_todo: 'Created todo',
    complete_todo: 'Completed todo',
    update_todo: 'Updated todo',
    create_goal: 'Created goal',
    update_goal: 'Updated goal',
    add_transaction: 'Added transaction',
    create_event: 'Created event',
    upload_photo: 'Uploaded photo',
    add_wishlist: 'Added wish',
    update_profile: 'Updated profile',
}

export const ACTION_ICONS: Record<ActivityAction, string> = {
    page_view: '👁️',
    create_todo: '✅',
    complete_todo: '🎉',
    update_todo: '📝',
    create_goal: '🎯',
    update_goal: '📊',
    add_transaction: '💰',
    create_event: '📅',
    upload_photo: '📸',
    add_wishlist: '🎁',
    update_profile: '⚙️',
}

export function getActionLabel(action: ActivityAction): string {
    return ACTION_LABELS[action] || action
}

export function getActionIcon(action: ActivityAction): string {
    return ACTION_ICONS[action] || '📌'
}
