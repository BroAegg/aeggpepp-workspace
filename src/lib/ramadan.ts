// Ramadan 2026 utilities
// Ramadan 1447H: Feb 18, 2026 – Mar 19, 2026 (approximately)

// Bandung coordinates
export const LOCATION_LAT = -6.9175
export const LOCATION_LNG = 107.6191
export const ALADHAN_METHOD = 20 // Kemenag RI

// Ramadan 2026 dates (1 Ramadan = Feb 18, based on Aladhan API Hijri confirmation)
export const RAMADAN_START = new Date(2026, 1, 18) // Feb 18, 2026
export const RAMADAN_END = new Date(2026, 2, 20)   // Mar 20, 2026 (1 Syawal approx)

export function isRamadan(date: Date = new Date()): boolean {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    return d >= RAMADAN_START && d < RAMADAN_END
}

export function getRamadanDay(date: Date = new Date()): number {
    if (!isRamadan(date)) return 0
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffMs = d.getTime() - RAMADAN_START.getTime()
    return Math.floor(diffMs / 86400000) + 1
}

export function getRamadanDaysTotal(): number {
    return Math.round((RAMADAN_END.getTime() - RAMADAN_START.getTime()) / 86400000)
}

export interface PrayerTimes {
    Imsak: string
    Fajr: string
    Sunrise: string
    Dhuhr: string
    Asr: string
    Maghrib: string
    Isha: string
    Midnight: string
}

export interface PrayerTimesResponse {
    timings: PrayerTimes
    date: {
        readable: string
        hijri: {
            date: string
            day: string
            month: { number: number; en: string; ar: string }
            year: string
        }
        gregorian: {
            date: string
            day: string
            month: { number: number; en: string }
            year: string
        }
    }
}

export async function fetchPrayerTimes(date: Date = new Date()): Promise<PrayerTimesResponse | null> {
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()

    try {
        const res = await fetch(
            `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${LOCATION_LAT}&longitude=${LOCATION_LNG}&method=${ALADHAN_METHOD}`
        )
        const json = await res.json()
        if (json.code === 200) {
            return json.data as PrayerTimesResponse
        }
        return null
    } catch (error) {
        console.error('Error fetching prayer times:', error)
        return null
    }
}

export function parseTimeToDate(timeStr: string, baseDate: Date = new Date()): Date {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const d = new Date(baseDate)
    d.setHours(hours, minutes, 0, 0)
    return d
}

export function getTimeUntil(targetTime: string, now: Date = new Date()): { hours: number; minutes: number; seconds: number; total: number } {
    const target = parseTimeToDate(targetTime, now)
    let diffMs = target.getTime() - now.getTime()
    if (diffMs < 0) diffMs = 0

    const totalSeconds = Math.floor(diffMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return { hours, minutes, seconds, total: totalSeconds }
}

export function getNextPrayer(timings: PrayerTimes, now: Date = new Date()): { name: string; time: string; nameId: string } | null {
    const prayers = [
        { name: 'Imsak', time: timings.Imsak, nameId: 'Imsak' },
        { name: 'Subuh', time: timings.Fajr, nameId: 'Subuh' },
        { name: 'Dzuhur', time: timings.Dhuhr, nameId: 'Dzuhur' },
        { name: 'Ashar', time: timings.Asr, nameId: 'Ashar' },
        { name: 'Maghrib', time: timings.Maghrib, nameId: 'Maghrib' },
        { name: 'Isya', time: timings.Isha, nameId: 'Isya' },
    ]

    for (const prayer of prayers) {
        const prayerDate = parseTimeToDate(prayer.time, now)
        if (prayerDate > now) return prayer
    }

    return null // All prayers passed for today
}

// ========== LocalStorage Tracker Data ==========

export interface RamadanDayData {
    fasted: boolean
    prayers: {
        subuh: boolean
        dzuhur: boolean
        ashar: boolean
        maghrib: boolean
        isya: boolean
        tarawih: boolean
    }
    quranJuz: number // 0-30
}

const STORAGE_KEY = 'ramadan-tracker-2026'

export function getTrackerData(): Record<string, RamadanDayData> {
    if (typeof window === 'undefined') return {}
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

export function getDayData(dayNumber: number): RamadanDayData {
    const all = getTrackerData()
    return all[String(dayNumber)] || {
        fasted: false,
        prayers: { subuh: false, dzuhur: false, ashar: false, maghrib: false, isya: false, tarawih: false },
        quranJuz: 0,
    }
}

export function saveDayData(dayNumber: number, data: RamadanDayData): void {
    if (typeof window === 'undefined') return
    const all = getTrackerData()
    all[String(dayNumber)] = data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

// Stats helpers
export function getTotalFastedDays(): number {
    const all = getTrackerData()
    return Object.values(all).filter(d => d.fasted).length
}

export function getQuranProgress(): number {
    const all = getTrackerData()
    const maxJuz = Math.max(0, ...Object.values(all).map(d => d.quranJuz || 0))
    return maxJuz
}

export function getPrayerCompletionRate(): number {
    const all = getTrackerData()
    const entries = Object.values(all)
    if (entries.length === 0) return 0
    let total = 0, completed = 0
    entries.forEach(d => {
        const prayers = Object.values(d.prayers)
        total += prayers.length
        completed += prayers.filter(Boolean).length
    })
    return total > 0 ? Math.round((completed / total) * 100) : 0
}
