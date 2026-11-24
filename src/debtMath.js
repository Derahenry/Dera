// Shared money and date maths for debts, so every screen agrees.

export const PROVIDERS = ['Klarna', 'Clearpay', 'PayPal Pay in 3', 'Zilch', 'Other']
export const FREQUENCIES = ['weekly', 'fortnightly', 'monthly']

export const FREQUENCY_LABELS = {
  weekly: 'Weekly',
  fortnightly: 'Every 2 weeks',
  monthly: 'Monthly',
}

const PROVIDER_FREQUENCY = {
  'Klarna': 'monthly',
  'Clearpay': 'fortnightly',
  'PayPal Pay in 3': 'monthly',
  'Zilch': 'fortnightly',
  'Other': 'monthly',
}

export function defaultFrequency(provider) {
  return PROVIDER_FREQUENCY[provider] || 'monthly'
}

// Parse 'YYYY-MM-DD' as a local calendar date (new Date('YYYY-MM-DD') would be UTC midnight).
export function parseDate(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isValidDateString(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) return false
  const date = parseDate(dateStr)
  return toDateString(date) === dateStr
}

// Whole calendar days from today to the due date (0 = today, negative = overdue).
export function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDate(dateStr) - today) / 86400000)
}

export function addMonths(dateStr, n) {
  const date = parseDate(dateStr)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + n)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return toDateString(date)
}

export function nextDueDate(dateStr, frequency) {
  const date = parseDate(dateStr)
  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7)
  } else if (frequency === 'fortnightly') {
    date.setDate(date.getDate() + 14)
  } else {
    // Monthly: same day next month, clamped to the month's last day (31 Jan -> 28/29 Feb).
    const day = date.getDate()
    date.setDate(1)
    date.setMonth(date.getMonth() + 1)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    date.setDate(Math.min(day, lastDay))
  }
  return toDateString(date)
}

export function instalmentAmount(debt) {
  const n = Number(debt.instalments) || 1
  return Number(debt.total) / n
}

export function paidCount(debt) {
  return Math.min(Number(debt.paid) || 0, Number(debt.instalments) || 0)
}

export function isPaidOff(debt) {
  return paidCount(debt) >= (Number(debt.instalments) || 0)
}

// Amount still owed: the unpaid instalments.
export function remaining(debt) {
  const left = (Number(debt.instalments) || 0) - paidCount(debt)
  return Math.max(0, left * instalmentAmount(debt))
}

export function progress(debt) {
  const n = Number(debt.instalments) || 0
  return n > 0 ? (paidCount(debt) / n) * 100 : 0
}

// Every remaining instalment for a debt: [{ date, amount }], starting at its next due date.
export function instalmentSchedule(debt) {
  const left = (Number(debt.instalments) || 0) - paidCount(debt)
  const amount = instalmentAmount(debt)
  const dates = []
  let date = debt.due_date
  for (let i = 0; i < left; i++) {
    // Monthly dates are counted from the first date so 31 Jan -> 28 Feb -> 31 Mar (no drift).
    if (debt.frequency === 'monthly' || !FREQUENCIES.includes(debt.frequency)) date = addMonths(debt.due_date, i)
    dates.push({ date, amount })
    if (debt.frequency !== 'monthly') date = nextDueDate(date, debt.frequency)
  }
  return dates
}

// Date of the last remaining instalment, or null if nothing is left.
export function payoffDate(debt) {
  const schedule = instalmentSchedule(debt)
  return schedule.length ? schedule[schedule.length - 1].date : null
}

const monthKey = (dateStr) => dateStr.slice(0, 7) // 'YYYY-MM'

// Groups all remaining instalments by calendar month. Overdue instalments are
// counted in the current month (they still need paying now).
// Returns [{ key, total, payments: [{ debt, date, amount, overdue }] }] sorted by month.
export function monthlyPlan(debts) {
  const thisMonth = monthKey(toDateString(new Date()))
  const months = new Map()
  for (const debt of debts) {
    for (const { date, amount } of instalmentSchedule(debt)) {
      const overdue = daysUntil(date) < 0
      const key = overdue || monthKey(date) < thisMonth ? thisMonth : monthKey(date)
      if (!months.has(key)) months.set(key, { key, total: 0, payments: [] })
      const month = months.get(key)
      month.total += amount
      month.payments.push({ debt, date, amount, overdue })
    }
  }
  return [...months.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(m => ({ ...m, payments: m.payments.sort((a, b) => a.date.localeCompare(b.date)) }))
}

export function formatMonth(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'short', year: 'numeric' })
}

export function formatShortDate(dateStr) {
  return parseDate(dateStr).toLocaleString('en-GB', { day: 'numeric', month: 'short' })
}

export function formatLongDate(dateStr) {
  return parseDate(dateStr).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatGBP(amount) {
  return `£${Number(amount || 0).toFixed(2)}`
}

export function dueLabel(days) {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  return `${days} day${days === 1 ? '' : 's'} left`
}

// Checks AI-extracted (or any untrusted) debt data before it is saved.
// Returns { debt, errors } where errors lists what needs fixing.
export function validateDebt(raw) {
  const errors = []
  const provider = PROVIDERS.includes(raw?.provider) ? raw.provider : 'Other'
  const item = String(raw?.item ?? '').trim().slice(0, 120)
  const total = Number(raw?.total)
  const instalments = Number(raw?.instalments)
  const paid = Number(raw?.paid ?? 0)
  const dueDate = String(raw?.due_date ?? '')
  const frequency = FREQUENCIES.includes(raw?.frequency) ? raw.frequency : defaultFrequency(provider)

  if (!item) errors.push('item name is missing')
  if (!Number.isFinite(total) || total <= 0) errors.push('total must be a positive amount')
  if (!Number.isInteger(instalments) || instalments < 1 || instalments > 24) errors.push('number of instalments looks wrong')
  if (!Number.isInteger(paid) || paid < 0 || (Number.isInteger(instalments) && paid > instalments)) errors.push('payments made looks wrong')
  if (!isValidDateString(dueDate)) errors.push('due date is not a valid date')

  return {
    debt: { provider, item, total, instalments, paid, due_date: dueDate, frequency },
    errors,
  }
}
