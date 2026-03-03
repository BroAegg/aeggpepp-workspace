'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, ArrowLeft, Loader2, X, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { updateGoalPage, deleteGoalPage, getChildPages, createGoalPage } from '@/lib/actions/goal-pages'
import type { Goal, GoalPage } from '@/types'

const EMOJI_QUICK = ['📄', '📝', '📋', '📊', '🎮', '🎨', '🐛', '🏃', '📐', '🔧', '💡', '📦', '⚡', '🎯', '🗂️', '📌']

interface SubPageEditorProps {
  goal: Goal
  page: GoalPage
  onBack: () => void
  onRefresh: () => void
}

export function SubPageEditor({ goal, page, onBack, onRefresh }: SubPageEditorProps) {
  const [title, setTitle] = useState(page.title)
  const [icon, setIcon] = useState(page.icon)
  const [content, setContent] = useState(page.content || [])
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [childPages, setChildPages] = useState<GoalPage[]>([])
  const [newPageTitle, setNewPageTitle] = useState('')

  // Simple text-block editor state
  const [blocks, setBlocks] = useState<{ id: string; type: 'paragraph' | 'heading' | 'bullet' | 'checklist'; text: string; checked?: boolean }[]>([])
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({})

  useEffect(() => {
    // Parse content into blocks
    if (page.content && Array.isArray(page.content) && page.content.length > 0) {
      setBlocks(page.content as any[])
    } else {
      setBlocks([{ id: `block-${Date.now()}`, type: 'paragraph', text: '' }])
    }
    setTitle(page.title)
    setIcon(page.icon)
    loadChildPages()
  }, [page.id])

  const loadChildPages = async () => {
    const children = await getChildPages(page.id)
    setChildPages(children)
  }

  // Auto-save debounced
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const debouncedSave = useCallback((newBlocks: typeof blocks, newTitle?: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const updates: Record<string, any> = { content: newBlocks }
        if (newTitle !== undefined) updates.title = newTitle
        await updateGoalPage(page.id, updates)
        setLastSaved(new Date())
      } catch (err) {
        console.error('Auto-save error:', err)
      } finally {
        setSaving(false)
      }
    }, 1500)
  }, [page.id])

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    debouncedSave(blocks, newTitle)
  }

  const handleBlockChange = (blockId: string, text: string) => {
    const newBlocks = blocks.map(b => b.id === blockId ? { ...b, text } : b)
    setBlocks(newBlocks)
    debouncedSave(newBlocks)
  }

  const handleBlockToggle = (blockId: string) => {
    const newBlocks = blocks.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b)
    setBlocks(newBlocks)
    debouncedSave(newBlocks)
  }

  const addBlock = (afterId: string, type: 'paragraph' | 'heading' | 'bullet' | 'checklist' = 'paragraph') => {
    const idx = blocks.findIndex(b => b.id === afterId)
    const newId = `block-${Date.now()}`
    const newBlock = { id: newId, type, text: '', checked: type === 'checklist' ? false : undefined }
    const newBlocks = [...blocks]
    newBlocks.splice(idx + 1, 0, newBlock)
    setBlocks(newBlocks)
    // Focus new block
    setTimeout(() => inputRefs.current[newId]?.focus(), 50)
  }

  const removeBlock = (blockId: string) => {
    if (blocks.length <= 1) return
    const newBlocks = blocks.filter(b => b.id !== blockId)
    setBlocks(newBlocks)
    debouncedSave(newBlocks)
  }

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const currentBlock = blocks.find(b => b.id === blockId)
      addBlock(blockId, currentBlock?.type === 'bullet' || currentBlock?.type === 'checklist' ? currentBlock.type : 'paragraph')
    }
    if (e.key === 'Backspace') {
      const block = blocks.find(b => b.id === blockId)
      if (block && block.text === '' && blocks.length > 1) {
        e.preventDefault()
        const idx = blocks.findIndex(b => b.id === blockId)
        removeBlock(blockId)
        // Focus previous block
        if (idx > 0) {
          const prevId = blocks[idx - 1].id
          setTimeout(() => inputRefs.current[prevId]?.focus(), 50)
        }
      }
    }
  }

  // Slash command (simple)
  const handleSlashCommand = (blockId: string, text: string) => {
    if (text === '/h' || text === '/heading') {
      setBlocks(blocks.map(b => b.id === blockId ? { ...b, type: 'heading', text: '' } : b))
    } else if (text === '/b' || text === '/bullet') {
      setBlocks(blocks.map(b => b.id === blockId ? { ...b, type: 'bullet', text: '' } : b))
    } else if (text === '/c' || text === '/check') {
      setBlocks(blocks.map(b => b.id === blockId ? { ...b, type: 'checklist', text: '', checked: false } : b))
    } else if (text === '/p' || text === '/text') {
      setBlocks(blocks.map(b => b.id === blockId ? { ...b, type: 'paragraph', text: '' } : b))
    } else {
      handleBlockChange(blockId, text)
      return
    }
    // clear input
    setTimeout(() => {
      const el = inputRefs.current[blockId]
      if (el) el.value = ''
    }, 10)
  }

  const handleSetIcon = async (emoji: string | null) => {
    setIcon(emoji)
    setShowEmojiPicker(false)
    await updateGoalPage(page.id, { icon: emoji })
    onRefresh()
  }

  const handleAddChildPage = async () => {
    const t = newPageTitle.trim() || 'Untitled'
    await createGoalPage(goal.id, t, undefined, page.id)
    setNewPageTitle('')
    loadChildPages()
    onRefresh()
  }

  const handleDeleteChildPage = async (pageId: string) => {
    await deleteGoalPage(pageId)
    loadChildPages()
    onRefresh()
  }

  const handleManualSave = async () => {
    setSaving(true)
    try {
      await updateGoalPage(page.id, { title, content: blocks, icon })
      setLastSaved(new Date())
      onRefresh()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 flex flex-col h-[calc(100vh-64px)]"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 md:px-8 py-3 border-b border-border text-sm">
        <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Goals</span>
        </button>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]">
          {goal.icon && <span className="mr-1">{goal.icon}</span>}
          {goal.title}
        </button>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <span className="text-foreground font-medium truncate max-w-[150px]">
          {icon && <span className="mr-1">{icon}</span>}
          {title}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-[10px] text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleManualSave} disabled={saving} className="h-7 text-xs">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
          {/* Icon & Title */}
          <div className="flex items-start gap-3 mb-8">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-12 h-12 rounded-lg border border-border hover:border-primary/50 flex items-center justify-center transition-colors text-2xl bg-secondary/30"
              >
                {icon || '📄'}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-14 left-0 bg-card border border-border rounded-lg shadow-xl p-2 z-10 grid grid-cols-8 gap-1 w-[260px]">
                  {EMOJI_QUICK.map(e => (
                    <button
                      key={e}
                      onClick={() => handleSetIcon(e)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-secondary rounded transition-colors text-base"
                    >
                      {e}
                    </button>
                  ))}
                  {icon && (
                    <button
                      onClick={() => handleSetIcon(null)}
                      className="col-span-8 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded py-1 mt-1"
                    >
                      Remove icon
                    </button>
                  )}
                </div>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="flex-1 text-3xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              placeholder="Untitled"
            />
          </div>

          {/* Slash command hint */}
          <p className="text-xs text-muted-foreground mb-4">
            Type <kbd className="px-1 py-0.5 bg-secondary rounded text-[10px] font-mono">/h</kbd> heading · 
            <kbd className="ml-1 px-1 py-0.5 bg-secondary rounded text-[10px] font-mono">/b</kbd> bullet · 
            <kbd className="ml-1 px-1 py-0.5 bg-secondary rounded text-[10px] font-mono">/c</kbd> checklist · 
            <kbd className="ml-1 px-1 py-0.5 bg-secondary rounded text-[10px] font-mono">/p</kbd> text
          </p>

          {/* Blocks */}
          <div className="space-y-1">
            {blocks.map((block) => (
              <div key={block.id} className="flex items-start gap-1 group">
                {/* Block type indicator */}
                {block.type === 'bullet' && (
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />
                )}
                {block.type === 'checklist' && (
                  <button
                    onClick={() => handleBlockToggle(block.id)}
                    className={cn(
                      "mt-1.5 w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      block.checked ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"
                    )}
                  >
                    {block.checked && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Input */}
                <input
                  ref={el => { inputRefs.current[block.id] = el }}
                  type="text"
                  value={block.text}
                  onChange={(e) => {
                    const val = e.target.value
                    // Check for slash commands
                    if (val === '/h' || val === '/heading' || val === '/b' || val === '/bullet' || val === '/c' || val === '/check' || val === '/p' || val === '/text') {
                      handleSlashCommand(block.id, val)
                    } else {
                      handleBlockChange(block.id, val)
                    }
                  }}
                  onKeyDown={(e) => handleKeyDown(e, block.id)}
                  placeholder={
                    block.type === 'heading' ? 'Heading...' :
                    block.type === 'bullet' ? 'List item...' :
                    block.type === 'checklist' ? 'To-do...' :
                    'Type something... (/ for commands)'
                  }
                  className={cn(
                    "flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40 py-1",
                    block.type === 'heading' && "text-xl font-bold",
                    block.type === 'paragraph' && "text-sm",
                    block.type === 'bullet' && "text-sm ml-2",
                    block.type === 'checklist' && cn("text-sm ml-1", block.checked && "line-through text-muted-foreground"),
                  )}
                />

                {/* Delete block */}
                <button
                  onClick={() => removeBlock(block.id)}
                  className="mt-1.5 md:opacity-0 md:group-hover:opacity-100 p-0.5 hover:bg-secondary rounded transition-all"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>

          {/* Add block button */}
          <button
            onClick={() => addBlock(blocks[blocks.length - 1]?.id || '', 'paragraph')}
            className="mt-2 flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add block</span>
          </button>

          {/* Child Pages */}
          {(childPages.length > 0 || true) && (
            <div className="mt-12 pt-6 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Sub-pages ({childPages.length})
              </h4>
              <div className="space-y-1 mb-3">
                {childPages.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors group"
                  >
                    <span className="text-sm">{child.icon || '📄'}</span>
                    <span className="flex-1 text-sm text-foreground truncate">{child.title}</span>
                    <button
                      onClick={() => handleDeleteChildPage(child.id)}
                      className="md:opacity-0 md:group-hover:opacity-100 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChildPage()}
                  placeholder="New sub-page..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <Button variant="outline" size="sm" onClick={handleAddChildPage} className="h-8">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
