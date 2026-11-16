'use client'

import React, { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/auth-provider'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { toast } from '@/components/ui/toast'

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!profile) return

    const partnerName = profile.role === 'aegg' ? 'Peppaa' : 'Aegg'
    const supabase = getSupabaseClient()

    const channel = supabase
      .channel('aeggpepp-global-realtime')
      // 1. Transactions Listener
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload: any) => {
          const { handleRealtimeTransaction } = useWorkspaceStore.getState()
          const isFromPartner = payload.new?.user_id && payload.new.user_id !== profile.id
          const wasNew = handleRealtimeTransaction({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          })

          if (isFromPartner && payload.eventType === 'INSERT' && wasNew) {
            const formattedAmount = new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0,
            }).format(payload.new.amount || 0)

            toast.info(
              `${partnerName} mencatat transaksi! 💸`,
              `${payload.new.description || payload.new.category} • ${formattedAmount}`
            )
          }
        }
      )
      // 2. Todos Listener
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        (payload: any) => {
          const isFromPartner = payload.new?.user_id && payload.new.user_id !== profile.id

          // Privacy Guard: Never notify or add partner's private todos
          if (isFromPartner && payload.new?.is_private) {
            return
          }

          const { handleRealtimeTodo } = useWorkspaceStore.getState()
          const wasNew = handleRealtimeTodo({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          })

          if (isFromPartner && payload.eventType === 'INSERT' && wasNew) {
            toast.info(
              `${partnerName} menambahkan tugas baru 📝`,
              payload.new.title
            )
          } else if (isFromPartner && payload.eventType === 'UPDATE' && payload.new?.completed && !payload.old?.completed) {
            toast.success(
              `${partnerName} menyelesaikan tugas! ✨`,
              payload.new.title
            )
          }
        }
      )
      // 2.5. Wishlist Listener (with Surprise Gift Privacy Guard)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishlist' },
        (payload: any) => {
          const isFromPartner = payload.new?.user_id && payload.new.user_id !== profile.id

          // Privacy Guard: If partner created a surprise gift and it's unpurchased, do NOT notify or merge
          if (isFromPartner && payload.new?.is_surprise && !payload.new?.is_purchased) {
            return
          }

          const { handleRealtimeWishlist } = useWorkspaceStore.getState()
          const wasNew = handleRealtimeWishlist({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          })

          if (isFromPartner && payload.eventType === 'INSERT' && wasNew) {
            toast.info(
              `${partnerName} menambahkan wishlist baru 🎁`,
              payload.new.title
            )
          } else if (isFromPartner && payload.eventType === 'UPDATE' && payload.new?.is_purchased && !payload.old?.is_purchased) {
            toast.success(
              `Kado Impian Terbeli! 🎉`,
              `${payload.new.title} telah dibeli oleh ${partnerName}`
            )
          }
        }
      )
      // 3. Wedding Guests Listener
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wedding_guests' },
        (payload: any) => {
          const { handleRealtimeWeddingGuest } = useWorkspaceStore.getState()
          handleRealtimeWeddingGuest({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          })

          const isFromPartner = payload.new?.user_id && payload.new.user_id !== profile.id
          if (isFromPartner && payload.eventType === 'UPDATE' && payload.new?.rsvp_status !== payload.old?.rsvp_status) {
            const statusLabel =
              payload.new.rsvp_status === 'attending'
                ? 'Hadir (Attending) 🎉'
                : payload.new.rsvp_status === 'declined'
                ? 'Tidak Hadir'
                : 'Pending'

            toast.info(
              `Update RSVP Tamu Wedding 💍`,
              `${payload.new.name} (${statusLabel})`
            )
          }
        }
      )
      // 4. Savings Accounts Listener (Balances & Pockets)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'savings_accounts' },
        (payload: any) => {
          const { handleRealtimeSavingsAccount } = useWorkspaceStore.getState()
          handleRealtimeSavingsAccount({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          })
        }
      )
      // 5. Budgets Listener
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets' },
        (payload: any) => {
          const { handleRealtimeBudget } = useWorkspaceStore.getState()
          handleRealtimeBudget({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          })
        }
      )
      // 6. Wedding Budget Items Listener
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wedding_budget_items' },
        (payload: any) => {
          const { handleRealtimeWeddingBudgetItem } = useWorkspaceStore.getState()
          handleRealtimeWeddingBudgetItem({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          })
        }
      )
      // 7. Wedding Settings Listener
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wedding_settings' },
        (payload: any) => {
          const { handleRealtimeWeddingSettings } = useWorkspaceStore.getState()
          handleRealtimeWeddingSettings({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          })
        }
      )
      // 8. Subscriptions Listener
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          const { invalidateFinance } = useWorkspaceStore.getState()
          invalidateFinance()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to global workspace changes')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [profile?.id, profile?.role])

  return <>{children}</>
}
