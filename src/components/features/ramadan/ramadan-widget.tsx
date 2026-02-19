'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Moon, Clock, ArrowRight } from 'lucide-react'
import {
    isRamadan, getRamadanDay, getRamadanDaysTotal,
    fetchPrayerTimes, getTimeUntil, getNextPrayer,
    type PrayerTimes
} from '@/lib/ramadan'

export function RamadanWidget() {
    const [visible, setVisible] = useState(false)
    const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null)
    const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
    const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null)
    const [ramadanDay, setRamadanDay] = useState(0)
    const [hijriDate, setHijriDate] = useState('')

    useEffect(() => {
        if (!isRamadan()) return
        setVisible(true)
        setRamadanDay(getRamadanDay())

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
            const next = getNextPrayer(prayerTimes, now)
            setNextPrayer(next)

            // Always countdown to Maghrib for iftar
            const iftarCountdown = getTimeUntil(prayerTimes.Maghrib, now)
            if (iftarCountdown.total > 0) {
                setCountdown(iftarCountdown)
            } else {
                // After maghrib, show countdown to next Imsak (sahur)
                const imsak = getTimeUntil(prayerTimes.Imsak, now, true)
                setCountdown(imsak)
            }
        }

        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [prayerTimes])

    if (!visible) return null

    const pad = (n: number) => String(n).padStart(2, '0')
    const isMaghribPassed = prayerTimes ? getTimeUntil(prayerTimes.Maghrib).total <= 0 : false
    const totalDays = getRamadanDaysTotal()
    const progressPct = (ramadanDay / totalDays) * 100

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <Link href="/ramadan" className="block group">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-900 p-5 md:p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-48 h-48 opacity-10">
                        <svg viewBox="0 0 200 200" fill="currentColor">
                            <path d="M100 0C60 0 30 30 30 70c0 30 20 55 45 65C55 155 40 180 40 180s40-15 60-45c20 30 60 45 60 45s-15-25-35-45c25-10 45-35 45-65C170 30 140 0 100 0z" />
                        </svg>
                    </div>
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Moon className="w-5 h-5" />
                                <span className="text-sm font-semibold opacity-90">Ramadan Mubarak 🌙</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs opacity-75">
                                <span>Hari ke-{ramadanDay}/{totalDays}</span>
                                <ArrowRight className="w-3.5 h-3.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1 bg-white/20 rounded-full mb-4 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPct}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-white/60 rounded-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Countdown */}
                            <div>
                                <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1">
                                    {isMaghribPassed ? '🌅 Sahur (Imsak)' : '🕌 Berbuka Puasa'}
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl md:text-4xl font-bold tabular-nums">
                                        {pad(countdown.hours)}
                                    </span>
                                    <span className="text-lg opacity-60">:</span>
                                    <span className="text-3xl md:text-4xl font-bold tabular-nums">
                                        {pad(countdown.minutes)}
                                    </span>
                                    <span className="text-lg opacity-60">:</span>
                                    <span className="text-xl md:text-2xl font-bold tabular-nums opacity-80">
                                        {pad(countdown.seconds)}
                                    </span>
                                </div>
                                {prayerTimes && (
                                    <p className="text-xs opacity-70 mt-1">
                                        Maghrib {prayerTimes.Maghrib} · Imsak {prayerTimes.Imsak}
                                    </p>
                                )}
                            </div>

                            {/* Next Prayer + Info */}
                            <div className="text-right">
                                {nextPrayer && (
                                    <div className="mb-2">
                                        <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1">Sholat Selanjutnya</p>
                                        <p className="text-lg font-bold">{nextPrayer.name}</p>
                                        <p className="text-sm opacity-80 flex items-center gap-1 justify-end">
                                            <Clock className="w-3 h-3" /> {nextPrayer.time}
                                        </p>
                                    </div>
                                )}
                                {hijriDate && (
                                    <p className="text-[11px] opacity-60">{hijriDate}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}
