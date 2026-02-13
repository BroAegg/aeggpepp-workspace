'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ExternalLink, Edit2, Trash2, Check, ShoppingCart, Gift, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWishlistItems, createWishlistItem, updateWishlistItem, deleteWishlistItem, toggleWishlistPurchased } from '@/lib/actions/wishlist'
import type { WishlistItem } from '@/types'

type Priority = 'all' | 'high' | 'medium' | 'low'
type StatusFilter = 'all' | 'pending' | 'purchased'

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<Priority>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const data = await getWishlistItems()
      setItems(data)
    } catch (error) {
      console.error('Error fetching wishlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setSaving(true)
    try {
      if (editingItem) {
        await updateWishlistItem(editingItem.id, formData)
      } else {
        await createWishlistItem(formData)
      }
      await fetchItems()
      closeModal()
    } catch (error) {
      console.error('Error saving item:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePurchased = async (id: string, currentStatus: boolean) => {
    try {
      await toggleWishlistPurchased(id, !currentStatus)
      await fetchItems()
    } catch (error) {
      console.error('Error toggling purchased:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteWishlistItem(id)
      await fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const filteredItems = items.filter(item => {
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false
    if (statusFilter === 'pending' && item.is_purchased) return false
    if (statusFilter === 'purchased' && !item.is_purchased) return false
    return true
  })

  const totalPending = items.filter(i => !i.is_purchased).reduce((sum, i) => sum + (i.price ?? 0), 0)
  const totalPurchased = items.filter(i => i.is_purchased).reduce((sum, i) => sum + (i.price ?? 0), 0)

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  }

  return (
    <>
      <Header title="Wishlist" emoji="🎁" />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-xl font-semibold text-foreground">{items.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-semibold text-foreground">{formatCurrency(totalPending, 'IDR')}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Purchased</p>
                <p className="text-xl font-semibold text-foreground">{formatCurrency(totalPurchased, 'IDR')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(['all', 'pending', 'purchased'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                    statusFilter === status
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(['all', 'high', 'medium', 'low'] as Priority[]).map((priority) => (
                <button
                  key={priority}
                  onClick={() => setPriorityFilter(priority)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                    priorityFilter === priority
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {priority}
                </button>
              ))}
            </div>

            {/* User Filter - removed, now shows all items including shared */}
          </div>

          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Wishlist Grid */}
        {!loading && (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all",
                  item.is_purchased && "opacity-60"
                )}
              >
                {/* Image */}
                <div className="relative aspect-video bg-secondary overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className={cn(
                        "w-full h-full object-cover",
                        item.is_purchased && "grayscale"
                      )}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gift className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {item.is_purchased && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="bg-emerald-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        Purchased!
                      </div>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", priorityColors[item.priority as keyof typeof priorityColors])}>
                      {item.priority}
                    </span>
                  </div>

                </div>

                {/* Content */}
                <div className="p-4">
                  {/* User Badge */}
                  <div className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2",
                    (item.profiles?.role) === 'aegg'
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                  )}>
                    {(item.profiles?.role) === 'aegg' ? '🍌 Aegg' : '🍈 Peppaa'}
                  </div>

                  <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{item.title}</h3>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(item.price ?? 0, item.currency)}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <Button
                      variant={item.is_purchased ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleTogglePurchased(item.id, item.is_purchased)}
                    >
                      {item.is_purchased ? (
                        <>
                          <X className="w-4 h-4 mr-1" />
                          Undo
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Mark Bought
                        </>
                      )}
                    </Button>

                    <div className="flex items-center gap-1">
                      <a
                        href={item.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                      <button
                        onClick={() => { setEditingItem(item); setShowModal(true) }}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-16">
            <Gift className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground mb-6">
              {statusFilter !== 'all' || priorityFilter !== 'all'
                ? "Try adjusting your filters"
                : "Add items you're dreaming to buy!"
              }
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Item
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Form Fields */}
              <form ref={formRef} action={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Item Name</label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g. Sony WH-1000XM5"
                    defaultValue={editingItem?.title}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Price</label>
                    <input
                      type="number"
                      name="price"
                      required
                      placeholder="5000000"
                      defaultValue={editingItem?.price ?? undefined}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Currency</label>
                    <select
                      name="currency"
                      defaultValue={editingItem?.currency || 'IDR'}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="IDR">IDR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Link URL</label>
                  <input
                    type="url"
                    name="url"
                    placeholder="https://tokopedia.com/..."
                    defaultValue={editingItem?.url || ''}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Image URL</label>
                  <input
                    type="url"
                    name="image_url"
                    placeholder="https://..."
                    defaultValue={editingItem?.image_url || ''}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
                  <select
                    name="priority"
                    defaultValue={editingItem?.priority || 'medium'}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
                <input type="hidden" name="is_shared" value="true" />

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingItem ? 'Save Changes' : 'Add Item'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
