'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Receipt,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Tag,
  DollarSign,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getReceiptItems, saveReceiptItems, uploadReceiptDirect, deleteReceiptItem } from '@/lib/actions/receipts'
import type { Transaction, ReceiptItem } from '@/types'

interface ReceiptDetailModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  onReceiptUpdated?: (transactionId: string, receiptUrl: string) => void
}

export function ReceiptDetailModal({
  isOpen,
  onClose,
  transaction,
  onReceiptUpdated,
}: ReceiptDetailModalProps) {
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  // Quick Add Item Form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('')
  const [savingItem, setSavingItem] = useState(false)

  // Fullscreen Preview
  const [fullscreenImage, setFullscreenImage] = useState(false)

  useEffect(() => {
    if (isOpen && transaction) {
      setReceiptUrl(transaction.receipt_url || null)
      setUploadError(null)
      setShowAddForm(false)
      loadItems(transaction.id)
    } else {
      setItems([])
    }
  }, [isOpen, transaction])

  const loadItems = async (txId: string) => {
    setLoadingItems(true)
    try {
      const data = await getReceiptItems(txId)
      setItems(data)
    } catch (err) {
      console.error('Failed to load receipt items:', err)
    } finally {
      setLoadingItems(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !transaction) return

    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('transaction_id', transaction.id)
      formData.append('receipt_file', file)

      const res = await uploadReceiptDirect(formData)
      if (res.success && res.receipt_url) {
        setReceiptUrl(res.receipt_url)
        if (onReceiptUpdated) {
          onReceiptUpdated(transaction.id, res.receipt_url)
        }
      } else {
        setUploadError(res.error || 'Gagal mengunggah foto struk')
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Terjadi kesalahan saat mengunggah foto')
    } finally {
      setUploading(false)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transaction || !newItemName.trim() || !newItemPrice || Number(newItemPrice) <= 0) return

    setSavingItem(true)
    try {
      const unitPrice = Math.round(Number(newItemPrice) / newItemQty)
      const res = await saveReceiptItems(transaction.id, [
        {
          item_name: newItemName.trim(),
          quantity: newItemQty,
          unit_price: unitPrice,
          total_price: Number(newItemPrice),
        },
      ])

      if (res.success) {
        setNewItemName('')
        setNewItemQty(1)
        setNewItemPrice('')
        setShowAddForm(false)
        await loadItems(transaction.id)
      } else {
        alert(res.error || 'Gagal menambahkan item')
      }
    } catch (err) {
      console.error('Error adding receipt item:', err)
    } finally {
      setSavingItem(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Hapus rincian barang ini dari struk?')) return
    try {
      const res = await deleteReceiptItem(itemId)
      if (res.success && transaction) {
        setItems((prev) => prev.filter((it) => it.id !== itemId))
      }
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  if (!isOpen || !transaction) return null

  const itemsTotal = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-secondary/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Detail Struk Belanja
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span>{new Date(transaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span>·</span>
                  <span className="capitalize">{transaction.category}</span>
                  {transaction.source === 'telegram' && (
                    <span className="rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium px-1.5 py-0.2 text-[10px]">
                      via Telegram Bot
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Transaction Overview Card */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border/60">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Transaksi Tercatat
                </span>
                <p className="text-xl font-extrabold text-foreground tabular-nums mt-0.5">
                  Rp {Number(transaction.amount).toLocaleString('id-ID')}
                </p>
                {transaction.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    "{transaction.description}"
                  </p>
                )}
              </div>
              <div className="text-right text-xs">
                <span className="text-muted-foreground block text-[11px]">Dibayar oleh:</span>
                <span className="font-semibold text-foreground capitalize">
                  {transaction.paid_by || transaction.profiles?.display_name || 'Aegg & Peppaa'}
                </span>
              </div>
            </div>

            {/* Receipt Photo Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>📸 Foto Struk Fisik</span>
                </label>
                {receiptUrl && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Buka Ukuran Penuh</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {receiptUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-border/80 bg-black/5 dark:bg-black/30 aspect-video max-h-48 flex items-center justify-center">
                  <img
                    src={receiptUrl}
                    alt="Foto Struk"
                    className="max-h-48 w-auto object-contain cursor-pointer transition-transform group-hover:scale-102"
                    onClick={() => setFullscreenImage(true)}
                  />
                  <div
                    onClick={() => setFullscreenImage(true)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white text-xs font-medium cursor-pointer transition-opacity"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Klik untuk memperbesar</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 p-5 text-center bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-medium text-foreground">
                    Belum ada foto struk yang terlampir
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Unggah foto struk belanja untuk arsip digital dan pencatatan akurat.
                  </p>

                  <label className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:opacity-90 active:scale-98 transition-all">
                    {uploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih Foto Struk</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>

                  {uploadError && (
                    <p className="text-xs text-rose-500 mt-2 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {uploadError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Line Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛒 Rincian Item Belanja ({items.length})</span>
                  </h4>
                  {items.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Subtotal item: Rp {itemsTotal.toLocaleString('id-ID')}
                      {Math.abs(itemsTotal - transaction.amount) > 100 && (
                        <span className="text-amber-500 ml-1">
                          (Selisih Rp {Math.abs(itemsTotal - transaction.amount).toLocaleString('id-ID')} dari total)
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="h-8 text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {showAddForm ? 'Batal' : 'Tambah Item'}
                </Button>
              </div>

              {/* Inline Add Item Form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddItem}
                    className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Nama Barang / Item
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="contoh: Minyak Goreng 2L"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Qty
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(Number(e.target.value) || 1)}
                          className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Total Harga (Rp)
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="contoh: 38000"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAddForm(false)}
                        className="h-7 text-xs"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingItem}
                        className="h-7 text-xs"
                      >
                        {savingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Item'}
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Items Table */}
              {loadingItems ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memuat rincian barang...</span>
                </div>
              ) : items.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-2 text-center w-12">Qty</th>
                        <th className="py-2 px-3 text-right">Harga Satuan</th>
                        <th className="py-2 px-3 text-right">Total</th>
                        <th className="py-2 px-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-2 px-3 font-medium text-foreground">
                            {item.item_name}
                          </td>
                          <td className="py-2 px-2 text-center text-muted-foreground">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                            {item.unit_price ? `Rp ${Number(item.unit_price).toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-foreground tabular-nums">
                            Rp {Number(item.total_price).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                              title="Hapus item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-6 rounded-xl border border-border/60 bg-secondary/10 text-center">
                  <p className="text-xs text-muted-foreground">
                    Belum ada item belanja terpisah pada transaksi ini.
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-1.5 text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Tambahkan rincian barang pertama
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border/80 bg-secondary/20 flex justify-end">
            <Button size="sm" onClick={onClose} className="text-xs font-semibold px-4">
              Tutup
            </Button>
          </div>
        </motion.div>

        {/* Fullscreen Photo Modal */}
        {fullscreenImage && receiptUrl && (
          <div
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setFullscreenImage(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl">
              <button
                onClick={() => setFullscreenImage(false)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={receiptUrl}
                alt="Fullscreen Receipt"
                className="max-h-[85vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  )
}
