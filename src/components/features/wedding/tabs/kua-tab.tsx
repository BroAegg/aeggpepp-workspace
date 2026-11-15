'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SquareCheck, Square, FileText, Sparkles, AlertCircle } from 'lucide-react'
import { getKuaChecklist, toggleKuaItem, updateKuaItemNotes } from '@/lib/actions/wedding-kua'
import { toast } from '@/components/ui/toast'
import type { WeddingKuaChecklistItem } from '@/types'

export function KuaTab() {
  const [items, setItems] = useState<WeddingKuaChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChecklist = async () => {
    try {
      setLoading(true)
      const data = await getKuaChecklist()
      setItems(data)
    } catch (err) {
      console.error('Error fetching KUA checklist:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChecklist()
  }, [])

  const handleToggle = async (
    item: WeddingKuaChecklistItem,
    partner: 'aegg' | 'peppaa'
  ) => {
    const currentVal = partner === 'aegg' ? item.is_completed_aegg : item.is_completed_peppaa
    const nextVal = !currentVal

    // ⚡ Optimistic Update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              [partner === 'aegg' ? 'is_completed_aegg' : 'is_completed_peppaa']: nextVal,
            }
          : i
      )
    )

    try {
      const res = await toggleKuaItem(item.id, partner, nextVal)
      if (res && 'error' in res && res.error) {
        throw new Error(res.error)
      }
      toast.success(
        nextVal ? `Berkas ${partner === 'aegg' ? 'Aegg' : 'Peppaa'} lengkap! ✨` : `Berkas ditandai belum lengkap`
      )
    } catch (err: any) {
      toast.error('Gagal memperbarui status berkas', err?.message)
      // Rollback
      fetchChecklist()
    }
  }

  const aeggCompleted = items.filter((i) => i.is_completed_aegg).length
  const peppaaCompleted = items.filter((i) => i.is_completed_peppaa).length
  const totalItems = items.length

  const aeggPercent = totalItems > 0 ? Math.round((aeggCompleted / totalItems) * 100) : 0
  const peppaaPercent = totalItems > 0 ? Math.round((peppaaCompleted / totalItems) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Aegg Card */}
        <div className="bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              🤵 Kelengkapan Berkas Aegg
            </span>
            <span className="text-xs font-semibold text-primary">{aeggPercent}%</span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${aeggPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {aeggCompleted} dari {totalItems} dokumen siap diserahkan ke KUA
          </p>
        </div>

        {/* Peppaa Card */}
        <div className="bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              👰 Kelengkapan Berkas Peppaa
            </span>
            <span className="text-xs font-semibold text-rose-500">{peppaaPercent}%</span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${peppaaPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {peppaaCompleted} dari {totalItems} dokumen siap diserahkan ke KUA
          </p>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="bg-card rounded-2xl border border-border/80 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Checklist Berkas Nikah KUA (Persyaratan Resmi Kemenag)
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-xs">Memuat dokumen KUA...</div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((doc, idx) => (
              <div
                key={doc.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{doc.document_name}</p>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Verification Toggles */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleToggle(doc, 'aegg')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      doc.is_completed_aegg
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {doc.is_completed_aegg ? (
                      <SquareCheck className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    Aegg
                  </button>

                  <button
                    onClick={() => handleToggle(doc, 'peppaa')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      doc.is_completed_peppaa
                        ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {doc.is_completed_peppaa ? (
                      <SquareCheck className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    Peppaa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
