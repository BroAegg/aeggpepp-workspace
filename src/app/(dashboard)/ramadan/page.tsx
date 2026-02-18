'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { motion } from 'framer-motion'
import { Moon, Clock, BookOpen, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    isRamadan, getRamadanDay, getRamadanDaysTotal,
    fetchPrayerTimes, getTimeUntil, getNextPrayer, parseTimeToDate,
    getDayData, saveDayData, getTotalFastedDays,
    getQuranProgress, getPrayerCompletionRate,
    type PrayerTimes, type RamadanDayData
} from '@/lib/ramadan'

const PRAYER_LABELS = [
    { key: 'subuh', label: 'Subuh', icon: '🌅', color: 'from-blue-500 to-indigo-600' },
    { key: 'dzuhur', label: 'Dzuhur', icon: '☀️', color: 'from-yellow-500 to-orange-500' },
    { key: 'ashar', label: 'Ashar', icon: '🌤️', color: 'from-orange-400 to-amber-500' },
    { key: 'maghrib', label: 'Maghrib', icon: '🌅', color: 'from-red-500 to-pink-600' },
    { key: 'isya', label: 'Isya', icon: '🌙', color: 'from-indigo-600 to-purple-700' },
    { key: 'tarawih', label: 'Tarawih', icon: '✨', color: 'from-emerald-500 to-teal-600' },
] as const

export default function RamadanPage() {
    const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null)
    const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
    const [selectedDay, setSelectedDay] = useState(getRamadanDay() || 1)
    const [dayData, setDayData] = useState<RamadanDayData>(getDayData(selectedDay))
    const [hijriDate, setHijriDate] = useState('')
    const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null)

    const ramadanDay = getRamadanDay() || 1
    const totalDays = getRamadanDaysTotal()
    const isMaghribPassed = prayerTimes ? getTimeUntil(prayerTimes.Maghrib).total <= 0 : false

    useEffect(() => {
        fetchPrayerTimes().then(data => {
            if (data) {
                setPrayerTimes(data.timings)
                setHijriDate(`${data.date.hijri.day} ${data.date.hijri.month.en} ${data.date.hijri.year}`)
            }
        })
    }, [])

    useEffect(() => {
        if (!prayerTimes) return
        const update = () => {
            const now = new Date()
            setNextPrayer(getNextPrayer(prayerTimes, now))
            const target = isMaghribPassed ? prayerTimes.Imsak : prayerTimes.Maghrib
            setCountdown(getTimeUntil(target, now))
        }
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [prayerTimes, isMaghribPassed])

    useEffect(() => {
        setDayData(getDayData(selectedDay))
    }, [selectedDay])

    const updateDayData = useCallback((updates: Partial<RamadanDayData>) => {
        const newData = { ...dayData, ...updates }
        setDayData(newData)
        saveDayData(selectedDay, newData)
    }, [dayData, selectedDay])

    const togglePrayer = (key: string) => {
        updateDayData({
            prayers: { ...dayData.prayers, [key]: !dayData.prayers[key as keyof typeof dayData.prayers] }
        })
    }

    const completedPrayers = Object.values(dayData.prayers).filter(Boolean).length
    const pad = (n: number) => String(n).padStart(2, '0')

    // Stats
    const totalFasted = getTotalFastedDays()
    const quranJuz = getQuranProgress()
    const prayerRate = getPrayerCompletionRate()

    const PRAYER_TIME_LIST = prayerTimes ? [
        { name: 'Imsak', time: prayerTimes.Imsak, icon: '🌃' },
        { name: 'Subuh', time: prayerTimes.Fajr, icon: '🌅' },
        { name: 'Terbit', time: prayerTimes.Sunrise, icon: '🌤️' },
        { name: 'Dzuhur', time: prayerTimes.Dhuhr, icon: '☀️' },
        { name: 'Ashar', time: prayerTimes.Asr, icon: '🌤️' },
        { name: 'Maghrib', time: prayerTimes.Maghrib, icon: '🌅' },
        { name: 'Isya', time: prayerTimes.Isha, icon: '🌙' },
    ] : []

    return (
        <>
            <Header title="Ramadan Tracker" icon={Moon} />

            <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
                {/* Hero Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-900 p-6 md:p-8 text-white"
                >
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-1">Ramadan Mubarak 🌙</h2>
                                <p className="text-sm opacity-80">Hari ke-{ramadanDay} dari {totalDays} · {hijriDate} · Bandung</p>
                            </div>

                            {/* Progress Ring */}
                            <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20">
                                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                                        <circle cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="6"
                                            strokeDasharray={`${(ramadanDay / totalDays) * 213.6} 213.6`}
                                            strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-lg font-bold">{ramadanDay}</span>
                                        <span className="text-[10px] opacity-70">/{totalDays}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Countdown */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <p className="text-[11px] uppercase tracking-wider opacity-70 mb-2">
                                {isMaghribPassed ? '🌅 Waktu Imsak (Sahur)' : '🕌 Hitung Mundur Berbuka'}
                            </p>
                            <div className="flex items-baseline gap-2">
                                {[
                                    { val: countdown.hours, label: 'Jam' },
                                    { val: countdown.minutes, label: 'Menit' },
                                    { val: countdown.seconds, label: 'Detik' },
                                ].map((item, i) => (
                                    <div key={item.label} className="flex items-baseline gap-1">
                                        {i > 0 && <span className="text-2xl font-light opacity-50">:</span>}
                                        <div className="text-center">
                                            <span className="text-4xl md:text-5xl font-bold tabular-nums">{pad(item.val)}</span>
                                            <p className="text-[10px] opacity-60 mt-0.5">{item.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Puasa', value: `${totalFasted} hari`, icon: '🌙', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                        { label: 'Sholat Rate', value: `${prayerRate}%`, icon: '🕌', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
                        { label: "Qur'an", value: `${quranJuz}/30 Juz`, icon: '📖', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
                    ].map((stat) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className={cn('rounded-xl p-3 md:p-4 border', stat.color)}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{stat.icon}</span>
                                <span className="text-xs font-medium opacity-70">{stat.label}</span>
                            </div>
                            <p className="text-lg md:text-xl font-bold">{stat.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Day Selector */}
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pilih Hari</h3>
                    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={cn(
                                    'flex-shrink-0 w-9 h-9 rounded-lg text-xs font-bold transition-all',
                                    selectedDay === day
                                        ? 'bg-primary text-primary-foreground shadow-md scale-110'
                                        : day === ramadanDay
                                            ? 'bg-primary/20 text-primary border border-primary/30'
                                            : day <= ramadanDay
                                                ? getDayData(day).fasted
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    : 'bg-secondary text-muted-foreground'
                                                : 'bg-secondary/50 text-muted-foreground/50'
                                )}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Prayer Times */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" /> Jadwal Sholat Hari Ini · Bandung
                        </h3>
                        <div className="space-y-2">
                            {PRAYER_TIME_LIST.map((prayer) => {
                                const now = new Date()
                                const prayerDate = parseTimeToDate(prayer.time, now)
                                const isPassed = now > prayerDate
                                const isNext = nextPrayer?.name === prayer.name
                                return (
                                    <div key={prayer.name}
                                        className={cn(
                                            'flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors',
                                            isNext ? 'bg-primary/10 border border-primary/20' :
                                                isPassed ? 'opacity-50' : 'bg-secondary/50'
                                        )}>
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-base">{prayer.icon}</span>
                                            <span className={cn('text-sm font-medium', isNext && 'text-primary font-semibold')}>
                                                {prayer.name}
                                            </span>
                                            {isNext && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">NEXT</span>}
                                        </div>
                                        <span className={cn('text-sm font-mono font-semibold', isNext ? 'text-primary' : 'text-foreground')}>
                                            {prayer.time}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Sholat Tracker */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                🕌 Sholat Tracker · Hari {selectedDay}
                            </h3>
                            <span className="text-xs text-muted-foreground">{completedPrayers}/6</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {PRAYER_LABELS.map((prayer) => {
                                const checked = dayData.prayers[prayer.key as keyof typeof dayData.prayers]
                                return (
                                    <button
                                        key={prayer.key}
                                        onClick={() => togglePrayer(prayer.key)}
                                        className={cn(
                                            'flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all',
                                            checked
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'border-border hover:border-primary/30'
                                        )}
                                    >
                                        <div className={cn(
                                            'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                                            checked ? 'bg-emerald-500 text-white' : 'bg-secondary'
                                        )}>
                                            {checked && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="text-left">
                                            <p className={cn('text-sm font-medium', checked ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground')}>
                                                {prayer.label}
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Fasting Toggle + Quran Progress */}
                    <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Fasting */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                    🌙 Puasa · Hari {selectedDay}
                                </h3>
                                <button
                                    onClick={() => updateDayData({ fasted: !dayData.fasted })}
                                    className={cn(
                                        'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                                        dayData.fasted
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                            : 'border-border hover:border-primary/30'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'w-10 h-10 rounded-full flex items-center justify-center',
                                            dayData.fasted ? 'bg-emerald-500 text-white' : 'bg-secondary'
                                        )}>
                                            {dayData.fasted ? <Check className="w-5 h-5" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
                                        </div>
                                        <div className="text-left">
                                            <p className={cn('font-semibold', dayData.fasted ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground')}>
                                                {dayData.fasted ? 'Alhamdulillah, Puasa ✓' : 'Tandai Puasa Hari Ini'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {dayData.fasted ? 'MasyaAllah, semangat!' : 'Tap untuk menandai'}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Quran Progress */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" /> Progres Al-Qur&apos;an
                                    </h3>
                                    <span className="text-xs text-muted-foreground">{dayData.quranJuz}/30 Juz</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={30}
                                    value={dayData.quranJuz}
                                    onChange={(e) => updateDayData({ quranJuz: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>0</span>
                                    <span>10</span>
                                    <span>20</span>
                                    <span>30</span>
                                </div>
                                {/* Juz Visual */}
                                <div className="mt-3 grid grid-cols-10 gap-1">
                                    {Array.from({ length: 30 }, (_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                'h-2 rounded-full transition-colors',
                                                i < dayData.quranJuz ? 'bg-primary' : 'bg-secondary'
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
