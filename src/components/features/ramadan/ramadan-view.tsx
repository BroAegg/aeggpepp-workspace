'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { motion } from 'framer-motion'
import { Moon, Clock, BookOpen, Check, Users, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    isRamadan, getRamadanDay, getRamadanDaysTotal,
    fetchPrayerTimes, getTimeUntil, getNextPrayer, parseTimeToDate, toLocalISOString,
    type PrayerTimes, type RamadanDayData, DEFAULT_DAY_DATA
} from '@/lib/ramadan'
import { logRamadanDay, getRamadanLogs, type RamadanLog } from '@/lib/actions/ramadan'
import { Button } from '@/components/ui/button'

const PRAYER_LABELS = [
    { key: 'subuh', label: 'Subuh', icon: '🌅', color: 'from-blue-500 to-indigo-600' },
    { key: 'dzuhur', label: 'Dzuhur', icon: '☀️', color: 'from-yellow-500 to-orange-500' },
    { key: 'ashar', label: 'Ashar', icon: '🌤️', color: 'from-orange-400 to-amber-500' },
    { key: 'maghrib', label: 'Maghrib', icon: '🌅', color: 'from-red-500 to-pink-600' },
    { key: 'isya', label: 'Isya', icon: '🌙', color: 'from-indigo-600 to-purple-700' },
    { key: 'tarawih', label: 'Tarawih', icon: '✨', color: 'from-emerald-500 to-teal-600' },
] as const

interface RamadanViewProps {
    userData: {
        id: string
        role: string
        partnerId?: string
    }
    initialLogs: RamadanLog[]
}

export function RamadanView({ userData, initialLogs }: RamadanViewProps) {
    const [viewMode, setViewMode] = useState<'me' | 'partner'>('me')
    const [logs, setLogs] = useState<RamadanLog[]>(initialLogs)
    const [loading, setLoading] = useState(false)
    const [partnerLogs, setPartnerLogs] = useState<RamadanLog[]>([])

    const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null)
    const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
    const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null)

    const ramadanDay = getRamadanDay() || 1
    const totalDays = getRamadanDaysTotal()
    const [selectedDay, setSelectedDay] = useState(ramadanDay)

    // Derived state
    const isMaghribPassed = prayerTimes ? getTimeUntil(prayerTimes.Maghrib).total <= 0 : false

    // Get data for selected day based on viewMode
    const activeLogs = viewMode === 'me' ? logs : partnerLogs
    const currentDayLog = activeLogs.find(l => {
        const date = new Date(2026, 1, 18)
        date.setDate(date.getDate() + (selectedDay - 1))
        const dateStr = toLocalISOString(date) // Use local YYYY-MM-DD
        return l.date === dateStr
    })

    const dayData: RamadanDayData = currentDayLog?.data || DEFAULT_DAY_DATA

    // Fetch Partner Logs
    useEffect(() => {
        if (viewMode === 'partner' && partnerLogs.length === 0 && userData.partnerId) {
            setLoading(true)
            getRamadanLogs(userData.partnerId).then(data => {
                setPartnerLogs(data)
                setLoading(false)
            })
        }
    }, [viewMode, userData.partnerId, partnerLogs.length])

    // Fetch Prayer Times
    useEffect(() => {
        fetchPrayerTimes().then(data => {
            if (data) setPrayerTimes(data.timings)
        })
    }, [])

    // Countdown Timer
    useEffect(() => {
        if (!prayerTimes) return
        const update = () => {
            const now = new Date()
            setNextPrayer(getNextPrayer(prayerTimes, now))
            // Logic: if Maghrib passed, count to Imsak (true for isNextDay)
            const target = isMaghribPassed ? prayerTimes.Imsak : prayerTimes.Maghrib
            setCountdown(getTimeUntil(target, now, isMaghribPassed))
        }
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [prayerTimes, isMaghribPassed])

    // Update Handler
    const updateDayData = async (updates: Partial<RamadanDayData>) => {
        if (viewMode !== 'me') return // Read only for partner

        const newData = { ...dayData, ...updates }

        // Optimistic update
        const date = new Date(2026, 1, 18); date.setDate(date.getDate() + (selectedDay - 1))
        const dateStr = toLocalISOString(date) // Use local YYYY-MM-DD

        setLogs(prev => {
            const existing = prev.findIndex(l => l.date === dateStr)
            if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = { ...updated[existing], data: newData, updated_at: new Date().toISOString() }
                return updated
            } else {
                return [...prev, {
                    id: 'temp', user_id: userData.id, date: dateStr, data: newData,
                    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
                }]
            }
        })

        // Server update
        await logRamadanDay(dateStr, newData)
    }

    const togglePrayer = (key: string) => {
        updateDayData({
            prayers: { ...dayData.prayers, [key]: !dayData.prayers[key as keyof typeof dayData.prayers] }
        })
    }

    const completedPrayers = Object.values(dayData.prayers).filter(Boolean).length
    const pad = (n: number) => String(n).padStart(2, '0')

    // Stats Calculation
    const calculateStats = (logsToUse: RamadanLog[]) => {
        const fasted = logsToUse.filter(l => l.data.fasted).length
        const maxJuz = Math.max(0, ...logsToUse.map(l => l.data.quranJuz || 0))

        let totalPrayers = 0, donePrayers = 0
        logsToUse.forEach(l => {
            const p = Object.values(l.data.prayers)
            totalPrayers += p.length
            donePrayers += p.filter(Boolean).length
        })
        const prayerRate = totalPrayers > 0 ? Math.round((donePrayers / totalPrayers) * 100) : 0

        return { fasted, maxJuz, prayerRate }
    }

    const stats = calculateStats(activeLogs)

    return (
        <>
            <Header title="Ramadan Tracker" icon={Moon} />

            <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

                {/* View Toggle */}
                <div className="flex justify-center">
                    <div className="bg-secondary/50 p-1 rounded-xl flex items-center gap-1">
                        <button
                            onClick={() => setViewMode('me')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                viewMode === 'me' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Users className="w-4 h-4" /> My Tracker
                        </button>
                        <button
                            onClick={() => setViewMode('partner')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                viewMode === 'partner' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Users className="w-4 h-4" /> Partner's View
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-4 text-muted-foreground animate-pulse">Loading partner data...</div>
                )}

                {/* Hero Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "relative overflow-hidden rounded-2xl p-6 md:p-8 text-white transition-colors",
                        viewMode === 'me'
                            ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-900"
                            : "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 dark:from-violet-900 dark:via-purple-900 dark:to-fuchsia-900"
                    )}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-1">
                                    {viewMode === 'me' ? "Ramadan Mubarak 🌙" : "Partner's Tracker 💜"}
                                </h2>
                                <p className="text-sm opacity-80">Hari ke-{ramadanDay}/{totalDays} · Bandung</p>
                            </div>

                            {/* Circular Progress */}
                            <div className="relative w-20 h-20 flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="6" />
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6"
                                        strokeDasharray={`${(ramadanDay / totalDays) * 213.6} 213.6`} strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg font-bold">{ramadanDay}</span>
                                    <span className="text-[10px] opacity-70">/{totalDays}</span>
                                </div>
                            </div>
                        </div>

                        {/* Countdown (Only show on My View or just always show as shared context) */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
                            <div>
                                <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1">
                                    {isMaghribPassed ? '🌅 Menuju Imsak' : '🕌 Menuju Maghrib'}
                                </p>
                                <div className="flex items-baseline gap-2 font-mono">
                                    <span className="text-2xl font-bold">{pad(countdown.hours)}</span>:
                                    <span className="text-2xl font-bold">{pad(countdown.minutes)}</span>:
                                    <span className="text-2xl font-bold opacity-80">{pad(countdown.seconds)}</span>
                                </div>
                            </div>
                            {nextPrayer && (
                                <div className="text-right">
                                    <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1">Next Prayer</p>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">{nextPrayer.name}</span>
                                        <span className="text-sm opacity-80">{nextPrayer.time}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Col: Calendar & Stats */}
                    <div className="space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Puasa', value: `${stats.fasted} hari`, icon: '🌙', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                                { label: 'Sholat', value: `${stats.prayerRate}%`, icon: '🕌', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
                                { label: "Qur'an", value: `${stats.maxJuz}/30`, icon: '📖', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
                            ].map((stat) => (
                                <div key={stat.label} className={cn('rounded-xl p-3 border text-center', stat.color)}>
                                    <div className="text-xl mb-1">{stat.icon}</div>
                                    <div className="font-bold text-lg">{stat.value}</div>
                                    <div className="text-[10px] opacity-70 uppercase tracking-wide">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Calendar / Day Selector */}
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Calendar</h3>
                            <div className="grid grid-cols-7 gap-1.5">
                                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                                    // Check status for this day
                                    // Map day to date
                                    const d = new Date(2026, 1, 18); d.setDate(d.getDate() + (day - 1))
                                    const dStr = toLocalISOString(d) // Use local YYYY-MM-DD
                                    const log = activeLogs.find(l => l.date === dStr)
                                    const isFasted = log?.data.fasted

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={cn(
                                                'aspect-square rounded-lg text-xs font-bold transition-all flex items-center justify-center relative',
                                                selectedDay === day
                                                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                                                    : isFasted
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                        : day <= ramadanDay
                                                            ? 'bg-secondary text-muted-foreground'
                                                            : 'bg-secondary/30 text-muted-foreground/30'
                                            )}
                                        >
                                            {day}
                                            {day === ramadanDay && (
                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Daily Tracker */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tracker Card */}
                        <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
                            {viewMode === 'partner' && (
                                <div className="absolute top-0 right-0 p-2 bg-secondary/50 rounded-bl-xl text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Viewing Partner's Log
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        Activity Log
                                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-normal text-muted-foreground">Hari ke-{selectedDay}</span>
                                    </h3>
                                </div>
                                {viewMode === 'me' && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateDayData({ fasted: !dayData.fasted })}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2",
                                                dayData.fasted
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                    : "bg-secondary hover:bg-secondary/80"
                                            )}
                                        >
                                            {dayData.fasted ? <Check className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                            {dayData.fasted ? "Fasted" : "Mark Fasting"}
                                        </button>
                                    </div>
                                )}
                                {viewMode === 'partner' && (
                                    <div className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2",
                                        dayData.fasted
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                            : "bg-secondary text-muted-foreground"
                                    )}>
                                        {dayData.fasted ? "Partner Fasted ✓" : "Partner Didn't Fast"}
                                    </div>
                                )}
                            </div>

                            {/* Prayer Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                                {PRAYER_LABELS.map((prayer) => {
                                    const checked = dayData.prayers[prayer.key as keyof typeof dayData.prayers]
                                    return (
                                        <button
                                            key={prayer.key}
                                            disabled={viewMode === 'partner'}
                                            onClick={() => togglePrayer(prayer.key)}
                                            className={cn(
                                                'flex items-center gap-3 p-3 rounded-xl border transition-all text-left relative overflow-hidden group',
                                                checked
                                                    ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/10'
                                                    : 'border-border hover:border-primary/30',
                                                viewMode === 'partner' && !checked && 'opacity-50',
                                                viewMode === 'partner' && 'cursor-default'
                                            )}
                                        >
                                            <div className={cn(
                                                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                                                checked ? 'bg-emerald-500 text-white' : 'bg-secondary'
                                            )}>
                                                {checked ? <Check className="w-5 h-5" /> : <span className="text-lg">{prayer.icon}</span>}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">{prayer.label}</div>
                                                {checked && <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Done</div>}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Quran Progress */}
                            <div className="bg-secondary/20 rounded-xl p-4 border border-border">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-purple-500" /> Quran Progress
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground mr-1">Current:</span>
                                        <span className="text-sm font-bold bg-background px-2 py-1 rounded-md border border-border shadow-sm">
                                            Juz {dayData.quranJuz}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {/* Juz Slider */}
                                    <div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5 font-medium">
                                            <span>Juz 1</span>
                                            <span>Juz 15</span>
                                            <span>Juz 30</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={30}
                                            value={dayData.quranJuz}
                                            disabled={viewMode === 'partner'}
                                            onChange={(e) => updateDayData({ quranJuz: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Last Read Input */}
                                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-medium">Last Surah</label>
                                            <input
                                                type="text"
                                                value={dayData.lastSurah || ''}
                                                disabled={viewMode === 'partner'}
                                                onChange={(e) => updateDayData({ lastSurah: e.target.value })}
                                                placeholder="e.g. Al-Baqarah"
                                                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block font-medium">Last Ayah</label>
                                            <input
                                                type="text"
                                                value={dayData.lastAyah || ''}
                                                disabled={viewMode === 'partner'}
                                                onChange={(e) => updateDayData({ lastAyah: parseInt(e.target.value) || 0 })}
                                                placeholder="e.g. 255"
                                                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    )
}
