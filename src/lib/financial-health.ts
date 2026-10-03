import { 
  Transaction, 
  Budget, 
  SavingsAccount, 
  FinancialHealthReport, 
  FinancialHealthAlert, 
  FinancialHealthStatus 
} from '@/types'

/**
 * Financial Health Engine for Aegg & Peppaa
 * Computes a weighted 0-100 score, 4-pillar ratios, burn-rate velocity, and couple equity insights.
 */
export function calculateFinancialHealth(
  currentMonthTransactions: Transaction[],
  budgets: Budget[],
  savingsAccounts: SavingsAccount[],
  currentDate: Date = new Date()
): FinancialHealthReport {
  // 1. Calculate Monthly Cashflow
  let monthlyIncome = 0
  let monthlyExpense = 0
  const categoryExpenses: Record<string, number> = {}
  let aeggExpense = 0
  let peppaaExpense = 0

  currentMonthTransactions.forEach((t) => {
    const amount = Number(t.amount) || 0
    if (t.type === 'income') {
      monthlyIncome += amount
    } else if (t.type === 'expense') {
      monthlyExpense += amount
      const cat = (t.category || 'Lainnya').toLowerCase()
      categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amount

      // Track couple spending attribution
      const payer = (t.paid_by || t.profiles?.display_name || t.profiles?.role || '').toLowerCase()
      if (payer.includes('aegg')) {
        aeggExpense += amount
      } else if (payer.includes('peppaa') || payer.includes('peppa')) {
        peppaaExpense += amount
      } else {
        // If unassigned, split evenly for stats
        aeggExpense += amount / 2
        peppaaExpense += amount / 2
      }
    }
  })

  const netSavings = monthlyIncome - monthlyExpense
  const savingsRate = monthlyIncome > 0 ? Math.max(0, (netSavings / monthlyIncome) * 100) : 0
  const expenseRatio = monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : monthlyExpense > 0 ? 100 : 0

  // 2. Burn-Rate Velocity Calculation
  const dayOfMonth = currentDate.getDate()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const dailyAverage = dayOfMonth > 0 ? monthlyExpense / dayOfMonth : 0
  const projectedMonthEnd = dailyAverage * daysInMonth
  const isOnTrack = monthlyIncome > 0 ? projectedMonthEnd <= monthlyIncome : true

  // 3. Liquid Assets & Cushion
  // Exclude friend_loan from immediately liquid cash
  const liquidAccounts = savingsAccounts.filter(
    (acc) => acc.type === 'bank' || acc.type === 'ewallet' || acc.type === 'cash' || acc.type === 'digital'
  )
  const totalLiquidAssets = liquidAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0)
  const liquidBufferMonths = monthlyExpense > 0 
    ? Number((totalLiquidAssets / monthlyExpense).toFixed(1)) 
    : totalLiquidAssets > 0 ? 12 : 0

  const budgetRunwayDays = dailyAverage > 0 
    ? Math.round(totalLiquidAssets / dailyAverage) 
    : null

  // 4. Couple Spending Fairness
  const totalTrackedCoupleExpense = aeggExpense + peppaaExpense
  const aeggPercent = totalTrackedCoupleExpense > 0 ? Math.round((aeggExpense / totalTrackedCoupleExpense) * 100) : 50
  const peppaaPercent = totalTrackedCoupleExpense > 0 ? 100 - aeggPercent : 50
  const fairnessRatio = `${aeggPercent}% / ${peppaaPercent}%`

  // 5. Four-Pillar Scoring (Max 100 points)
  // Pillar 1: Savings Rate (35 pts max)
  let savingsRateScore = 0
  if (savingsRate >= 35) savingsRateScore = 35
  else if (savingsRate >= 20) savingsRateScore = 26 + ((savingsRate - 20) / 15) * 9
  else if (savingsRate >= 10) savingsRateScore = 16 + ((savingsRate - 10) / 10) * 10
  else if (savingsRate > 0) savingsRateScore = 8 + (savingsRate / 10) * 8
  else savingsRateScore = 2

  // Pillar 2: Cashflow Stability & Expense Ratio (30 pts max)
  let cashflowScore = 0
  if (monthlyIncome === 0 && monthlyExpense === 0) {
    cashflowScore = 20
  } else if (monthlyIncome === 0 && monthlyExpense > 0) {
    cashflowScore = 8
  } else if (expenseRatio <= 65) {
    cashflowScore = 30
  } else if (expenseRatio <= 80) {
    cashflowScore = 24
  } else if (expenseRatio <= 100) {
    cashflowScore = 16
  } else {
    // Deficit
    const deficitOverflow = expenseRatio - 100
    cashflowScore = Math.max(0, 10 - deficitOverflow * 0.2)
  }

  // Pillar 3: Budget Discipline (20 pts max)
  let budgetScore = 20
  const overBudgetCategories: { category: string; overAmount: number }[] = []
  if (budgets.length > 0) {
    let safeCount = 0
    budgets.forEach((b) => {
      const budgetLimit = Number(b.amount) || 0
      const spent = categoryExpenses[(b.category || '').toLowerCase()] || 0
      if (budgetLimit > 0 && spent > budgetLimit) {
        overBudgetCategories.push({
          category: b.category,
          overAmount: spent - budgetLimit,
        })
      } else {
        safeCount++
      }
    })
    budgetScore = Math.round((safeCount / budgets.length) * 20)
  }

  // Pillar 4: Liquid Cushion & Runway (15 pts max)
  let cushionScore = 0
  if (liquidBufferMonths >= 6) cushionScore = 15
  else if (liquidBufferMonths >= 3) cushionScore = 12
  else if (liquidBufferMonths >= 1.5) cushionScore = 9
  else if (liquidBufferMonths >= 0.8) cushionScore = 6
  else if (totalLiquidAssets > 0) cushionScore = 3
  else cushionScore = 0

  const rawScore = Math.round(savingsRateScore + cashflowScore + budgetScore + cushionScore)
  const score = Math.max(0, Math.min(100, rawScore))

  // Determine Status
  let status: FinancialHealthStatus = 'good'
  let statusLabel = 'Cukup Sehat & Terkendali'
  let statusColor = 'text-blue-500'

  if (score >= 80) {
    status = 'excellent'
    statusLabel = 'Keuangan Sangat Sehat'
    statusColor = 'text-emerald-500'
  } else if (score >= 60) {
    status = 'good'
    statusLabel = 'Stabil & Terjaga'
    statusColor = 'text-blue-500'
  } else if (score >= 40) {
    status = 'warning'
    statusLabel = 'Perlu Waspada & Evaluasi'
    statusColor = 'text-amber-500'
  } else {
    status = 'critical'
    statusLabel = 'Perlu Perhatian Serius'
    statusColor = 'text-rose-500'
  }

  // 6. Generate Contextual Alerts
  const alerts: FinancialHealthAlert[] = []

  // Deficit Alert
  if (monthlyIncome > 0 && monthlyExpense > monthlyIncome) {
    alerts.push({
      id: 'deficit-alert',
      type: 'danger',
      title: 'Arus Kas Defisit Bulan Ini',
      message: `Pengeluaran telah melampaui pemasukan sebesar Rp ${(monthlyExpense - monthlyIncome).toLocaleString('id-ID')}. Batasi pengeluaran sekunder.`,
      metric: `Defisit Rp ${(monthlyExpense - monthlyIncome).toLocaleString('id-ID')}`,
    })
  }

  // Burn Rate Velocity Alert
  if (monthlyIncome > 0 && !isOnTrack && dayOfMonth <= 20) {
    alerts.push({
      id: 'burn-rate-alert',
      type: 'warning',
      title: 'Laju Pengeluaran Melebihi Rata-rata',
      message: `Dengan rata-rata belanja Rp ${Math.round(dailyAverage).toLocaleString('id-ID')}/hari, proyeksi pengeluaran akhir bulan mencapai Rp ${Math.round(projectedMonthEnd).toLocaleString('id-ID')}.`,
      metric: `Proyeksi: Rp ${Math.round(projectedMonthEnd).toLocaleString('id-ID')}`,
    })
  }

  // Overbudget Categories
  if (overBudgetCategories.length > 0) {
    const names = overBudgetCategories.map((o) => o.category).join(', ')
    alerts.push({
      id: 'budget-overrun-alert',
      type: 'warning',
      title: `${overBudgetCategories.length} Kategori Melebihi Budget`,
      message: `Pos budget ${names} telah melampaui batas yang direncanakan.`,
      metric: `${overBudgetCategories.length} Pos Jebol`,
    })
  }

  // Liquid Buffer Alert
  if (monthlyExpense > 0 && liquidBufferMonths < 1) {
    alerts.push({
      id: 'buffer-alert',
      type: 'warning',
      title: 'Dana Likuid Menipis',
      message: `Total saldo di bank & e-wallet hanya cukup untuk bertahan ${Math.round(liquidBufferMonths * 30)} hari ke depan.`,
      metric: `${liquidBufferMonths} Bulan Runway`,
    })
  }

  // Positive Reinforcement
  if (savingsRate >= 25 && monthlyIncome > 0) {
    alerts.push({
      id: 'savings-success-alert',
      type: 'success',
      title: 'Rasio Tabungan Fantastis!',
      message: `Kalian berhasil menyisihkan ${savingsRate.toFixed(1)}% dari pemasukan bulan ini untuk tabungan & masa depan. Pertahankan ritme ini!`,
      metric: `Tabungan ${savingsRate.toFixed(1)}%`,
    })
  }

  // 7. Contextual Recommendations
  const recommendations: string[] = []
  if (savingsRate < 20 && monthlyIncome > 0) {
    recommendations.push('Tingkatkan rasio tabungan minimal 20% dengan mengalokasikan tabungan di awal bulan.')
  }
  if (overBudgetCategories.length > 0) {
    recommendations.push(`Tinjau ulang pagu budget untuk kategori ${overBudgetCategories[0].category}.`)
  }
  if (liquidBufferMonths < 3) {
    recommendations.push('Bangun dana darurat di rekening tabungan cair (Bank/SeaBank) hingga minimal 3 bulan pengeluaran.')
  }
  if (Math.abs(aeggPercent - peppaaPercent) > 40 && totalTrackedCoupleExpense > 1000000) {
    recommendations.push('Perhatikan keseimbangan pengeluaran bersama agar tidak memberatkan salah satu pihak.')
  }
  if (recommendations.length === 0) {
    recommendations.push('Pola keuangan kalian sangat seimbang dan terkontrol dengan baik! Siap menyongsong target wedding & impian bersama.')
  }

  return {
    score,
    status,
    statusLabel,
    statusColor,
    savingsRate: Number(savingsRate.toFixed(1)),
    expenseRatio: Number(expenseRatio.toFixed(1)),
    burnRateVelocity: {
      daysElapsed: dayOfMonth,
      daysInMonth,
      dailyAverage: Math.round(dailyAverage),
      projectedMonthEnd: Math.round(projectedMonthEnd),
      budgetRunwayDays,
      isOnTrack,
    },
    coupleSplit: {
      aeggTotal: Math.round(aeggExpense),
      aeggPercent,
      peppaaTotal: Math.round(peppaaExpense),
      peppaaPercent,
      fairnessRatio,
    },
    liquidBufferMonths,
    totalLiquidAssets,
    monthlyIncome,
    monthlyExpense,
    netSavings,
    alerts,
    recommendations,
  }
}
