'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ExternalLink, Edit2, Trash2, Link as LinkIcon, Github, Linkedin, Twitter, Globe, Briefcase, Code, Gamepad2, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPortfolioLinks, createPortfolioLink, updatePortfolioLink, deletePortfolioLink } from '@/lib/actions/portfolio'
import type { PortfolioLink, PortfolioCategory } from '@/types'

type Category = 'all' | 'project' | 'social' | 'other'

const iconMap: Record<string, any> = {
  github: Github,
  linkedin: Linkedin,
  twitter: Twitter,
  globe: Globe,
  briefcase: Briefcase,
  code: Code,
  gamepad: Gamepad2,
}

type LinkWithUser = PortfolioLink & { profiles?: { display_name: string; role: string } }

export default function PortfolioPage() {
  const [links, setLinks] = useState<LinkWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingLink, setEditingLink] = useState<LinkWithUser | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<Category>('all')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    fetchLinks()
  }, [])

  const fetchLinks = async () => {
    setLoading(true)
    const data = await getPortfolioLinks()
    setLinks(data as LinkWithUser[])
    setLoading(false)
  }

  const filteredLinks = links.filter(link => {
    if (categoryFilter !== 'all' && link.category !== categoryFilter) return false
    return true
  })

  const handleDelete = async (id: string) => {
    const result = await deletePortfolioLink(id)
    if (result.success) {
      setLinks(links.filter(l => l.id !== id))
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setSaving(true)

    if (editingLink) {
      const result = await updatePortfolioLink(editingLink.id, formData)
      if (result.success) {
        await fetchLinks()
        closeModal()
      }
    } else {
      const result = await createPortfolioLink(formData)
      if (result.success) {
        await fetchLinks()
        closeModal()
      }
    }

    setSaving(false)
  }

  const openEditModal = (link: LinkWithUser) => {
    setEditingLink(link)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingLink(null)
    formRef.current?.reset()
  }

  return (
    <>
      <Header title="Portfolio Links" emoji="💼" />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(['all', 'project', 'social', 'other'] as Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                    categoryFilter === cat
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Link
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Links Grid */}
        {!loading && (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLinks.map((link, index) => {
              const IconComponent = iconMap[link.icon || 'globe'] || LinkIcon
              return (
                <motion.div
                  key={link.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all"
                >
                  {/* User Badge */}
                  <div className={cn(
                    "absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium",
                    link.profiles?.role === 'aegg' 
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                  )}>
                    {link.profiles?.role === 'aegg' ? '👨 Aegg' : '👩 Peppaa'}
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      link.category === 'social'
                        ? "bg-primary/10 text-primary"
                        : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300"
                    )}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      <h3 className="font-semibold text-foreground truncate">{link.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{link.description}</p>
                    </div>
                  </div>

                  {/* URL Preview */}
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <LinkIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{link.url.replace(/(^\w+:|^)\/\//, '')}</span>
                  </div>

                  {/* Category Badge */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-xs font-medium capitalize",
                      link.category === 'project' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                      link.category === 'social' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                      link.category === 'other' && "bg-secondary text-muted-foreground"
                    )}>
                      {link.category}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                      <button
                        onClick={() => openEditModal(link)}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && filteredLinks.length === 0 && (
          <div className="text-center py-16">
            <LinkIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No links found</h3>
            <p className="text-muted-foreground mb-6">
              {categoryFilter !== 'all'
                ? "Try adjusting your filters"
                : "Add your portfolio links to showcase your work!"
              }
            </p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Link
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
                  {editingLink ? 'Edit Link' : 'Add New Link'}
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
                  <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="My Project"
                    defaultValue={editingLink?.title}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">URL</label>
                  <input
                    type="url"
                    name="url"
                    required
                    placeholder="https://example.com"
                    defaultValue={editingLink?.url}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    name="description"
                    placeholder="Brief description..."
                    rows={3}
                    defaultValue={editingLink?.description || ''}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                    <select
                      name="category"
                      defaultValue={editingLink?.category || 'project'}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="project">Project</option>
                      <option value="social">Social</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Icon</label>
                    <select
                      name="icon"
                      defaultValue={editingLink?.icon || 'globe'}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="github">GitHub</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="twitter">Twitter</option>
                      <option value="globe">Website</option>
                      <option value="briefcase">Portfolio</option>
                      <option value="code">Code</option>
                      <option value="gamepad">Game</option>
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingLink ? 'Save Changes' : 'Add Link'}
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
