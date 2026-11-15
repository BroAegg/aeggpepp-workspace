/**
 * Utility functions for Dynamic Billing Cycle & Daily Safe-to-Spend calculations
 * Tailored for salary cycles (e.g. 25th of month to 24th of next month)
 */

export interface BillingCycle {
  startDate: Date
  endDate: Date
  startStr: string // YYYY-MM-DD
  endStr: string   // YYYY-MM-DD
  daysInCycle: number
  daysElapsed: number
  daysRemaining: number
  label: string    // e.g. "25 Okt – 24 Nov 2026"
  nextPaydayLabel: string // e.g. "25 Nov"
  isTodayPayday: boolean
}

/**
 * Computes the active billing cycle based on start day (1 - 28, default: 25)
 */
export function getBillingCycle(startDay: number = 25, referenceDate: Date = new Date()): BillingCycle {
  // Clamp startDay to 1 - 28 to avoid end-of-month quirks (February etc.)
  const day = Math.min(Math.max(startDay, 1), 28)
  
  const refYear = referenceDate.getFullYear()
  const refMonth = referenceDate.getMonth()
  const refDay = referenceDate.getDate()

  let cycleStartYear = refYear
  let cycleStartMonth = refMonth

  if (refDay < day) {
    // Current date is before payday in this calendar month -> Cycle started in previous calendar month
    cycleStartMonth = refMonth - 1
    if (cycleStartMonth < 0) {
      cycleStartMonth = 11
      cycleStartYear = refYear - 1
    }
  }

  const startDate = new Date(cycleStartYear, cycleStartMonth, day, 0, 0, 0, 0)

  // Cycle ends the day before next payday
  let cycleEndYear = cycleStartYear
  let cycleEndMonth = cycleStartMonth + 1
  if (cycleEndMonth > 11) {
    cycleEndMonth = 0
    cycleEndYear = cycleStartYear + 1
  }

  // End date is day - 1 of next month at 23:59:59
  const endDate = new Date(cycleEndYear, cycleEndMonth, day - 1, 23, 59, 59, 999)

  const toYmd = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dt = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dt}`
  }

  const startStr = toYmd(startDate)
  const endStr = toYmd(endDate)

  // Total days in cycle
  const diffTime = endDate.getTime() - startDate.getTime()
  const daysInCycle = Math.round(diffTime / (1000 * 60 * 60 * 24))

  // Days elapsed (including today)
  const todayZero = new Date(refYear, refMonth, refDay, 0, 0, 0, 0)
  const elapsedMs = todayZero.getTime() - startDate.getTime()
  const daysElapsed = Math.max(1, Math.min(daysInCycle, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1))

  // Days remaining until cycle ends
  const daysRemaining = Math.max(1, daysInCycle - daysElapsed + 1)

  // Format cycle label (id-ID)
  const startFmt = startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const endFmt = endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const label = `${startFmt} – ${endFmt}`

  const nextPaydayDate = new Date(cycleEndYear, cycleEndMonth, day)
  const nextPaydayLabel = nextPaydayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const isTodayPayday = refDay === day

  return {
    startDate,
    endDate,
    startStr,
    endStr,
    daysInCycle,
    daysElapsed,
    daysRemaining,
    label,
    nextPaydayLabel,
    isTodayPayday,
  }
}

/**
 * Checks if a transaction date string (YYYY-MM-DD) falls inside the billing cycle
 */
export function isDateInBillingCycle(dateStr: string, cycle: BillingCycle): boolean {
  if (!dateStr) return false
  const cleanDate = dateStr.slice(0, 10)
  return cleanDate >= cycle.startStr && cleanDate <= cycle.endStr
}

/**
 * Calculates the Daily Safe-to-Spend metric:
 * (Remaining Budget) / (Days Remaining)
 */
export function calculateDailySafeToSpend(remainingBudget: number, daysRemaining: number): {
  dailyAmount: number
  status: 'safe' | 'warning' | 'critical'
} {
  const safeRemaining = Math.max(0, remainingBudget)
  const safeDays = Math.max(1, daysRemaining)
  const dailyAmount = Math.round(safeRemaining / safeDays)

  let status: 'safe' | 'warning' | 'critical' = 'safe'
  if (remainingBudget <= 0) {
    status = 'critical'
  } else if (dailyAmount < 50000) {
    status = 'warning'
  }

  return {
    dailyAmount,
    status,
  }
}
