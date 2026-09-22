'use client'

import { cn } from '@/lib/utils'

interface OwnerBadgeProps {
    role?: string | null
    className?: string
    compact?: boolean
    showName?: boolean
}

export function OwnerBadge({ role, className, compact = false, showName = true }: OwnerBadgeProps) {
    if (!role) return null

    const isAegg = role === 'aegg'
    const initial = isAegg ? 'A' : 'P'
    const name = isAegg ? 'Aegg' : 'Peppaa'

    const colorClasses = isAegg
        ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25'
        : 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/25'

    const avatarCircle = (
        <span
            className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                isAegg
                    ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-zinc-950'
                    : 'bg-pink-500 text-white dark:bg-pink-400 dark:text-zinc-950'
            )}
        >
            {initial}
        </span>
    )

    if (compact || !showName) {
        return (
            <span
                className={cn(
                    'inline-flex items-center justify-center p-0.5 rounded-full border transition-colors',
                    colorClasses,
                    className
                )}
                title={name}
            >
                {avatarCircle}
            </span>
        )
    }

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border shadow-2xs transition-colors',
                colorClasses,
                className
            )}
        >
            {avatarCircle}
            <span className="font-semibold tracking-tight">{name}</span>
        </span>
    )
}
