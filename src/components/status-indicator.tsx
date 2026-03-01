'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/actions/auth'

type PresenceUser = {
  user_id: string
  role: 'aegg' | 'peppaa' | string
  online_at: string
}

export function StatusIndicator() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    const init = async () => {
      const user = await getUser()
      if (!user) return
      setCurrentUser(user)

      const supabase = createClient()
      supabaseRef.current = supabase

      const channel = supabase.channel('online-users', {
        config: { presence: { key: user.id } },
      })

      const checkPartner = () => {
        const state = channel.presenceState<PresenceUser>()
        const allUsers = Object.values(state).flat()
        const partner = allUsers.find((u) => u.user_id !== user.id)
        setPartnerOnline(!!partner)
      }

      channel
        .on('presence', { event: 'sync' }, checkPartner)
        .on('presence', { event: 'join' }, checkPartner)
        .on('presence', { event: 'leave' }, checkPartner)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user.id,
              role: user.role || 'unknown',
              online_at: new Date().toISOString(),
            })
          }
        })

      cleanup = () => {
        supabase.removeChannel(channel)
      }
    }

    init()

    return () => cleanup?.()
  }, [])

  if (!currentUser) return null

  const isAegg = currentUser.role === 'aegg'
  const partnerName = isAegg ? 'Peppaa' : 'Aegg'
  const partnerEmoji = isAegg ? '🌙' : '⭐'

  if (partnerOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full animate-in fade-in duration-300">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-[10px] font-medium text-green-700 dark:text-green-300">
          {partnerEmoji} {partnerName} Online
        </span>
      </div>
    )
  }

  // Partner offline state
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/60 border border-border rounded-full">
      <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-300 dark:bg-gray-600" />
      <span className="text-[10px] font-medium text-muted-foreground">
        {partnerEmoji} {partnerName} Offline
      </span>
    </div>
  )
}
