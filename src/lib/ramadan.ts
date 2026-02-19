// Ramadan 2026 utilities
// Ramadan 1447H: Feb 18, 2026 – Mar 19, 2026 (approximately)

// Bandung coordinates
export const LOCATION_LAT = -6.9175
export const LOCATION_LNG = 107.6191
export const ALADHAN_METHOD = 20 // Kemenag RI

// Ramadan 2026 dates (1 Ramadan = Feb 18, based on Aladhan API Hijri confirmation)
export const RAMADAN_START = new Date(2026, 1, 18) // Feb 18, 2026 (Month is 0-indexed: 1 = Feb)
export const RAMADAN_END = new Date(2026, 2, 20)   // Mar 20, 2026 (1 Syawal approx)

export function isRamadan(date: Date = new Date()): boolean {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    return d >= RAMADAN_START && d < RAMADAN_END
}

export function getRamadanDay(date: Date = new Date()): number {
    if (!isRamadan(date)) return 0
    // Normalize to start of day
    const start = new Date(RAMADAN_START.getFullYear(), RAMADAN_START.getMonth(), RAMADAN_START.getDate())
    const current = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffMs = current.getTime() - start.getTime()
    return Math.floor(diffMs / 86400000) + 1
}

export function getRamadanDaysTotal(): number {
    // Normalize to start of day
    const start = new Date(RAMADAN_START.getFullYear(), RAMADAN_START.getMonth(), RAMADAN_START.getDate())
    const end = new Date(RAMADAN_END.getFullYear(), RAMADAN_END.getMonth(), RAMADAN_END.getDate())
    return Math.round((end.getTime() - start.getTime()) / 86400000)
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

export function getTimeUntil(targetTime: string, now: Date = new Date(), isNextDay: boolean = false): { hours: number; minutes: number; seconds: number; total: number } {
    let target = parseTimeToDate(targetTime, now)

    // If we're targeting next day (e.g. imsak tomorrow), add 24h
    if (isNextDay) {
        target.setDate(target.getDate() + 1)
    }

    let diffMs = target.getTime() - now.getTime()

    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return { hours, minutes, seconds, total: totalSeconds }
}

export function getNextPrayer(timings: PrayerTimes, now: Date = new Date()): { name: string; time: string; nameId: string; isTomorrow?: boolean } | null {
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

    // If all passed, next is Imsak tomorrow
    return { name: 'Imsak (Besok)', time: timings.Imsak, nameId: 'Imsak', isTomorrow: true }
}

// Helper to get YYYY-MM-DD from local date (no UTC conversion)
export function toLocalISOString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// ========== Type Data ==========

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
    lastSurah?: string
    lastAyah?: number
}

export const DEFAULT_DAY_DATA: RamadanDayData = {
    fasted: false,
    prayers: { subuh: false, dzuhur: false, ashar: false, maghrib: false, isya: false, tarawih: false },
    quranJuz: 0,
    lastSurah: '',
    lastAyah: 0,
}
