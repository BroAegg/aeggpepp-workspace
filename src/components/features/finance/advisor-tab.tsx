'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  User,
  Zap,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  HeartHandshake,
  DollarSign,
  Loader2,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { askFinancialAdvisor, getFinancialAdvisorContext, type ChatMessage } from '@/lib/actions/finance-ai'
import type { FinancialHealthReport } from '@/types'

const QUICK_PROMPTS = [
  {
    icon: Zap,
    title: 'Strategi Hemat Rp 2 Juta',
    prompt: 'Bagaimana strategi konkret dan realistis untuk kita bisa menghemat pengeluaran Rp 2.000.000 di bulan depan tanpa tersiksa?',
  },
  {
    icon: TrendingUp,
    title: 'Evaluasi Pos Makan & Jajan',
    prompt: 'Tolong analisis pos pengeluaran makan, nongkrong, dan jajan kita bulan ini. Apakah overbudget dan apa saran pengurangannya?',
  },
  {
    icon: HeartHandshake,
    title: 'Fairness Spending Aegg & Peppaa',
    prompt: 'Bagaimana proporsi pengeluaran antara Aegg vs Peppaa bulan ini? Apakah sudah seimbang dan adil?',
  },
  {
    icon: DollarSign,
    title: 'Proyeksi Tabungan Wedding 25jt',
    prompt: 'Berdasarkan arus kas dan saldo tabungan saat ini, bagaimana proyeksi kesiapan dana untuk target Intimate Wedding Rp 25.000.000 (180 pax)?',
  },
  {
    icon: ShieldCheck,
    title: 'Audit Lokasi Uang Kita',
    prompt: 'Tolong review lokasi uang kita (Bank, E-Wallet, Cash, atau Uang di Teman). Di mana uang paling banyak mengendap dan apa saran penataannya?',
  },
]

export function AdvisorTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputPrompt, setInputPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [healthContext, setHealthContext] = useState<{
    score: number
    statusLabel: string
    monthlyIncome: number
    monthlyExpense: number
    savingsRate: number
    userName: string
  } | null>(null)
  const [contextLoading, setContextLoading] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch initial summary context to populate welcome message
  const loadContext = async () => {
    try {
      setContextLoading(true)
      const data = await getFinancialAdvisorContext()
      setHealthContext({
        score: data.healthReport.score,
        statusLabel: data.healthReport.statusLabel,
        monthlyIncome: data.healthReport.monthlyIncome,
        monthlyExpense: data.healthReport.monthlyExpense,
        savingsRate: data.healthReport.savingsRate,
        userName: data.currentUserName,
      })

      // Initialize default welcome message if empty
      if (messages.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content: `Halo **${data.currentUserName}**! 👋✨\n\nSaya adalah **AeggPepp AI Financial Advisor** kalian. Saya sudah membaca seluruh data buku kas bulan ini secara real-time:\n\n- 📊 **Health Score**: **${data.healthReport.score}/100** (${data.healthReport.statusLabel})\n- 💰 **Savings Rate**: **${data.healthReport.savingsRate.toFixed(1)}%**\n- 💍 **Fokus Utama**: Persiapan Intimate Wedding 180 Pax (Target Rp 25jt) & Tabungan Bersama\n\nAda hal finansial yang ingin kita diskusikan hari ini? Kamu bisa ketik pertanyaan bebas atau pilih salah satu tombol rekomendasi di bawah! 🚀`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }
    } catch (err) {
      console.error('Failed to load advisor context:', err)
    } finally {
      setContextLoading(false)
    }
  }

  useEffect(() => {
    loadContext()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim()
    if (!query || loading) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputPrompt('')
    setLoading(true)

    try {
      const res = await askFinancialAdvisor(messages, query)
      if (res.success && res.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.reply!,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Maaf, terjadi kendala: ${res.error || 'Gagal memproses jawaban'}. Silakan coba lagi atau cek koneksi API.`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Terjadi kesalahan: ${err?.message || 'Gagal menghubungi server'}`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleReset = () => {
    if (window.confirm('Mulai sesi konsultasi baru? Riwayat chat saat ini akan dibersihkan.')) {
      setMessages([])
      loadContext()
    }
  }

  // Simple Markdown renderer for bold, lists, and line breaks
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n')
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1.5" />
          }

          // Bullet items
          const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ')
          const cleanLine = isBullet ? line.trim().replace(/^[-•]\s*/, '') : line

          // Parse bold markers **text**
          const parts = cleanLine.split(/(\*\*.*?\*\*)/g)

          const renderedText = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-foreground">
                  {part.slice(2, -2)}
                </strong>
              )
            }
            return part
          })

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-primary mt-1 text-xs">•</span>
                <span className="flex-1 text-foreground/90">{renderedText}</span>
              </div>
            )
          }

          return (
            <p key={idx} className="text-foreground/90">
              {renderedText}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">AeggPepp AI Financial Advisor</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Gemini Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Konsultan keuangan pribadi berbasis data riil transaksi, tabungan, dan anggaran kalian.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {healthContext && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/80 border border-border/60 text-xs">
                <span className="text-muted-foreground">Skor:</span>
                <span className="font-bold text-primary">{healthContext.score}/100</span>
                <span className="text-muted-foreground">({healthContext.statusLabel})</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadContext}
              disabled={contextLoading}
              className="text-xs h-8 gap-1.5"
              title="Sinkronkan data keuangan terkini"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', contextLoading && 'animate-spin')} />
              Sync Data
            </Button>
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs h-8 text-muted-foreground hover:text-rose-500 gap-1.5"
                title="Reset percakapan"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          Rekomendasi Pertanyaan Finansial Cepat:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {QUICK_PROMPTS.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={loading}
                className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 bg-card hover:bg-secondary/60 hover:border-primary/40 text-left transition-all duration-150 group shadow-2xs disabled:opacity-50"
              >
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {item.prompt}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all self-center" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat Thread Container */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs flex flex-col h-[520px] shadow-sm overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant'

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex gap-3 max-w-[88%] sm:max-w-[80%]',
                    isAssistant ? 'mr-auto items-start' : 'ml-auto flex-row-reverse items-start'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-2xs',
                      isAssistant
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'bg-secondary text-secondary-foreground font-semibold border border-border'
                    )}
                  >
                    {isAssistant ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      'group relative rounded-2xl px-4 py-3 shadow-2xs transition-all',
                      isAssistant
                        ? 'bg-card border border-border/90 text-foreground'
                        : 'bg-primary text-primary-foreground font-normal'
                    )}
                  >
                    {/* Header info */}
                    <div
                      className={cn(
                        'flex items-center justify-between gap-3 text-[10px] mb-1.5 font-medium',
                        isAssistant ? 'text-muted-foreground' : 'text-primary-foreground/80'
                      )}
                    >
                      <span>{isAssistant ? 'AeggPepp Advisor' : 'Kamu'}</span>
                      {msg.timestamp && <span>{msg.timestamp}</span>}
                    </div>

                    {/* Content */}
                    {isAssistant ? (
                      renderFormattedContent(msg.content)
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {/* Copy Button for Assistant */}
                    {isAssistant && (
                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="absolute bottom-2 right-2 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Salin jawaban"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Typing Indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 mr-auto items-start max-w-[80%]"
            >
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl bg-card border border-border/80 px-4 py-3 shadow-2xs flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                <span className="text-xs text-muted-foreground ml-1">Menganalisis data finansial...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-card border-t border-border/80">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Tanyakan apa saja tentang keuangan, pos boros, wedding, tabungan..."
              disabled={loading}
              className="flex-1 bg-secondary/50 hover:bg-secondary/80 focus:bg-background border border-border/70 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-hidden transition-all"
            />
            <Button
              type="submit"
              disabled={!inputPrompt.trim() || loading}
              className="rounded-xl px-4 py-2.5 gap-2 shrink-0 font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline">Kirim</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 mt-2 px-1">
            <span>Saran berbasis data real-time Next.js & Gemini 3.5 Flash</span>
            <span className="hidden sm:inline">Tekan Enter untuk mengirim</span>
          </div>
        </div>
      </div>
    </div>
  )
}
