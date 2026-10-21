'use client'

import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WeddingRundownItem } from '@/types'

interface RundownTabProps {
  rundown: WeddingRundownItem[]
  onAddRundown: () => void
  onEditRundown: (item: WeddingRundownItem) => void
  onDeleteRundown: (id: string) => void
}

export function RundownTab({
  rundown,
  onAddRundown,
  onEditRundown,
  onDeleteRundown,
}: RundownTabProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div>
          <h3 className="font-bold text-foreground">Susunan Acara (Rundown) Akad & Resepsi</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Jadwal terstruktur beserta PIC penanggung jawab per sesi agar acara Hari-H berjalan lancar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{rundown.length} Sesi</span>
          </div>
          <Button onClick={onAddRundown} size="sm" className="rounded-xl">
            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Sesi
          </Button>
        </div>
      </div>

      {/* Rundown Timeline */}
      <div className="relative border-l-2 border-primary/30 ml-4 sm:ml-6 space-y-6 pb-4">
        {rundown.length === 0 ? (
          <div className="ml-6 py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl text-xs">
            Belum ada sesi rundown. Klik tombol Tambah Sesi di atas.
          </div>
        ) : (
          rundown.map((item) => (
            <div key={item.id} className="relative ml-6 group">
              {/* Circle Node on Timeline */}
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>

              {/* Rundown Item Card */}
              <div className="p-4 rounded-2xl border border-border/50 bg-card hover:border-border transition-all space-y-2 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-xs font-semibold">
                      {item.time_start} {item.time_end ? `– ${item.time_end}` : ''}
                    </span>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">{item.title}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.pic && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-foreground/80 font-medium">
                        PIC: {item.pic}
                      </span>
                    )}
                    <button
                      onClick={() => onEditRundown(item)}
                      className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground"
                      title="Edit sesi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteRundown(item.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                      title="Hapus sesi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.notes && <p className="text-xs text-muted-foreground leading-relaxed">{item.notes}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
