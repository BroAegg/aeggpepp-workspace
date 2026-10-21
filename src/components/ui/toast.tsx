'use client'

import { create } from 'zustand'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3500)

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, duration }],
    }))

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, description }),
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const isSuccess = t.type === 'success'
          const isError = t.type === 'error'

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all',
                isSuccess
                  ? 'bg-card/95 border-emerald-500/30 text-card-foreground shadow-emerald-500/5'
                  : isError
                  ? 'bg-card/95 border-red-500/30 text-card-foreground shadow-red-500/5'
                  : 'bg-card/95 border-border/80 text-card-foreground shadow-black/5'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl shrink-0 mt-0.5',
                  isSuccess
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : isError
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-primary/10 text-primary'
                )}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isError ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-bold leading-snug text-foreground">{t.title}</p>
                {t.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {t.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors -mr-1 -mt-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
