'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getUser } from '@/lib/actions/auth'

export function StatusIndicator() {
  const [activeUsers, setActiveUsers] = useState<Record<string, any>>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  useEffect(() => {
    const init = async () => {
      const user = await getUser()
      if (!user) return
      setCurrentUser(user)

      const supabase = createClient()
      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: user.id,
          },
        },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState()
          setActiveUsers(newState)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          // console.log('join', key, newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          // console.log('leave', key, leftPresences)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
              role: (user as any).role || 'unknown' // assuming role is in profile
            })
          }
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }

    init()
  }, [])

  // Find partner
  const partnerStatus = Object.values(activeUsers).flat().find((u: any) => u.user_id !== currentUser?.id)
  
  if (!partnerStatus || !currentUser) return null

  const isAegg = currentUser.display_name?.toLowerCase().includes('aegg') || currentUser.role === 'aegg'
  const partnerName = isAegg ? 'Peppaa' : 'Aegg'
  const partnerEmoji = isAegg ? '�' : '⭐' // Aegg sees Peppaa(Moon), Peppaa sees Aegg(Star)

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full animate-in fade-in duration-300">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      <span className="text-[10px] font-medium text-green-700 dark:text-green-300">
        {partnerEmoji} {partnerName} Active
      </span>
    </div>
  )
}
