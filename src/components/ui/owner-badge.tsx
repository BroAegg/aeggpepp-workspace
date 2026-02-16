'use client'

import { cn } from '@/lib/utils'

interface OwnerBadgeProps {
    role?: string
    className?: string
    compact?: boolean
}

export function OwnerBadge({ role, className, compact = false }: OwnerBadgeProps) {
    if (!role) return null

    const isAegg = role === 'aegg'
    const emoji = isAegg ? '⭐' : '🌙'
    const name = isAegg ? 'Aegg' : 'Peppaa'

    if (compact) {
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-0.5 text-xs',
                    className
                )}
                title={name}
            >
                {emoji}
            </span>
        )
    }

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                isAegg
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                    : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
                className
            )}
        >
            {emoji} {name}
        </span>
    )
}
