// Indonesian national & religious holidays (2025-2027)
// Source: Indonesian Government official calendar
// Islamic holidays are approximate (depends on moon sighting)

export interface Holiday {
  date: string // YYYY-MM-DD
  name: string
  type: 'national' | 'religious' | 'international'
}

// 2025 Holidays
const holidays2025: Holiday[] = [
  { date: '2025-01-01', name: 'Tahun Baru Masehi', type: 'national' },
  { date: '2025-01-27', name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'religious' },
  { date: '2025-01-29', name: 'Tahun Baru Imlek', type: 'religious' },
  { date: '2025-03-01', name: 'Awal Ramadhan', type: 'religious' },
  { date: '2025-03-29', name: 'Hari Raya Nyepi', type: 'religious' },
  { date: '2025-03-31', name: 'Idul Fitri 1446 H (Hari 1)', type: 'religious' },
  { date: '2025-04-01', name: 'Idul Fitri 1446 H (Hari 2)', type: 'religious' },
  { date: '2025-04-18', name: 'Wafat Isa Al-Masih', type: 'religious' },
  { date: '2025-05-01', name: 'Hari Buruh Internasional', type: 'national' },
  { date: '2025-05-12', name: 'Hari Raya Waisak', type: 'religious' },
  { date: '2025-05-29', name: 'Kenaikan Isa Al-Masih', type: 'religious' },
  { date: '2025-06-01', name: 'Hari Lahir Pancasila', type: 'national' },
  { date: '2025-06-07', name: 'Idul Adha 1446 H', type: 'religious' },
  { date: '2025-06-27', name: 'Tahun Baru Islam 1447 H', type: 'religious' },
  { date: '2025-08-17', name: 'Hari Kemerdekaan RI', type: 'national' },
  { date: '2025-09-05', name: 'Maulid Nabi Muhammad SAW', type: 'religious' },
  { date: '2025-12-25', name: 'Hari Natal', type: 'religious' },
]

// 2026 Holidays
const holidays2026: Holiday[] = [
  { date: '2026-01-01', name: 'Tahun Baru Masehi', type: 'national' },
  { date: '2026-01-17', name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'religious' },
  { date: '2026-02-17', name: 'Tahun Baru Imlek', type: 'religious' },
  { date: '2026-02-18', name: 'Awal Ramadhan', type: 'religious' },
  { date: '2026-03-19', name: 'Hari Raya Nyepi', type: 'religious' },
  { date: '2026-03-20', name: 'Idul Fitri 1447 H (Hari 1)', type: 'religious' },
  { date: '2026-03-21', name: 'Idul Fitri 1447 H (Hari 2)', type: 'religious' },
  { date: '2026-04-03', name: 'Wafat Isa Al-Masih', type: 'religious' },
  { date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'national' },
  { date: '2026-05-01', name: 'Hari Raya Waisak', type: 'religious' },
  { date: '2026-05-14', name: 'Kenaikan Isa Al-Masih', type: 'religious' },
  { date: '2026-05-27', name: 'Idul Adha 1447 H', type: 'religious' },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'national' },
  { date: '2026-06-17', name: 'Tahun Baru Islam 1448 H', type: 'religious' },
  { date: '2026-08-17', name: 'Hari Kemerdekaan RI', type: 'national' },
  { date: '2026-08-26', name: 'Maulid Nabi Muhammad SAW', type: 'religious' },
  { date: '2026-12-25', name: 'Hari Natal', type: 'religious' },
]

// 2027 Holidays
const holidays2027: Holiday[] = [
  { date: '2027-01-01', name: 'Tahun Baru Masehi', type: 'national' },
  { date: '2027-01-06', name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'religious' },
  { date: '2027-02-06', name: 'Tahun Baru Imlek', type: 'religious' },
  { date: '2027-02-08', name: 'Awal Ramadhan', type: 'religious' },
  { date: '2027-03-09', name: 'Hari Raya Nyepi', type: 'religious' },
  { date: '2027-03-10', name: 'Idul Fitri 1448 H (Hari 1)', type: 'religious' },
  { date: '2027-03-11', name: 'Idul Fitri 1448 H (Hari 2)', type: 'religious' },
  { date: '2027-03-26', name: 'Wafat Isa Al-Masih', type: 'religious' },
  { date: '2027-05-01', name: 'Hari Buruh Internasional', type: 'national' },
  { date: '2027-05-06', name: 'Kenaikan Isa Al-Masih', type: 'religious' },
  { date: '2027-05-16', name: 'Idul Adha 1448 H', type: 'religious' },
  { date: '2027-05-20', name: 'Hari Raya Waisak', type: 'religious' },
  { date: '2027-06-01', name: 'Hari Lahir Pancasila', type: 'national' },
  { date: '2027-06-07', name: 'Tahun Baru Islam 1449 H', type: 'religious' },
  { date: '2027-08-16', name: 'Maulid Nabi Muhammad SAW', type: 'religious' },
  { date: '2027-08-17', name: 'Hari Kemerdekaan RI', type: 'national' },
  { date: '2027-12-25', name: 'Hari Natal', type: 'religious' },
]

// Also add Valentine's Day, anniversary markers, etc. as international
const specialDates: Holiday[] = [
  { date: '2025-02-14', name: 'Valentine\'s Day 💕', type: 'international' },
  { date: '2026-02-14', name: 'Valentine\'s Day 💕', type: 'international' },
  { date: '2027-02-14', name: 'Valentine\'s Day 💕', type: 'international' },
  { date: '2025-03-08', name: 'International Women\'s Day', type: 'international' },
  { date: '2026-03-08', name: 'International Women\'s Day', type: 'international' },
  { date: '2027-03-08', name: 'International Women\'s Day', type: 'international' },
  { date: '2025-04-22', name: 'Hari Kartini', type: 'national' },
  { date: '2026-04-22', name: 'Hari Kartini', type: 'national' },
  { date: '2027-04-22', name: 'Hari Kartini', type: 'national' },
  { date: '2025-10-28', name: 'Hari Sumpah Pemuda', type: 'national' },
  { date: '2026-10-28', name: 'Hari Sumpah Pemuda', type: 'national' },
  { date: '2027-10-28', name: 'Hari Sumpah Pemuda', type: 'national' },
  { date: '2025-11-10', name: 'Hari Pahlawan', type: 'national' },
  { date: '2026-11-10', name: 'Hari Pahlawan', type: 'national' },
  { date: '2027-11-10', name: 'Hari Pahlawan', type: 'national' },
  { date: '2025-12-31', name: 'Malam Tahun Baru 🎆', type: 'international' },
  { date: '2026-12-31', name: 'Malam Tahun Baru 🎆', type: 'international' },
  { date: '2027-12-31', name: 'Malam Tahun Baru 🎆', type: 'international' },
]

const allHolidays: Holiday[] = [
  ...holidays2025,
  ...holidays2026,
  ...holidays2027,
  ...specialDates,
]

/**
 * Get holidays for a specific month
 */
export function getHolidaysByMonth(year: number, month: number): Holiday[] {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  return allHolidays.filter(h => h.date.startsWith(monthStr))
}

/**
 * Get holiday for a specific date
 */
export function getHolidaysByDate(dateStr: string): Holiday[] {
  return allHolidays.filter(h => h.date === dateStr)
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(dateStr: string): boolean {
  return allHolidays.some(h => h.date === dateStr)
}
