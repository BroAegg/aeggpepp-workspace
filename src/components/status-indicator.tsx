'use client'

import { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'

type PresenceUser = {
  user_id: string
  role: 'aegg' | 'peppaa' | string
  online_at: string
}

export function StatusIndicator() {
  const { profile } = useAuth()
  const [partnerOnline, setPartnerOnline] = useState(false)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!profile) return

    const supabase = getSupabaseClient()
    const channel = supabase.channel('online-users', {
      config: { presence: { key: profile.id } },
    })
    channelRef.current = channel

    const checkPartner = () => {
      const state = channel.presenceState<PresenceUser>()
      const allUsers = Object.values(state).flat()
      const partner = allUsers.find((u) => u.user_id !== profile.id)
      setPartnerOnline(!!partner)
    }

    channel
      .on('presence', { event: 'sync' }, checkPartner)
      .on('presence', { event: 'join' }, checkPartner)
      .on('presence', { event: 'leave' }, checkPartner)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: profile.id,
            role: profile.role || 'unknown',
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  if (!profile) return null

  const isAegg = profile.role === 'aegg'
  const partnerName = isAegg ? 'Peppaa' : 'Aegg'

  if (partnerOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-in fade-in duration-200">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          {partnerName} Online
        </span>
      </div>
    )
  }

  // Partner offline state
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted/50 border border-border/60 rounded-full">
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-muted-foreground/40" />
      <span className="text-[10px] font-medium text-muted-foreground">
        {partnerName} Offline
      </span>
    </div>
  )
}
