import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addMonths, daysUntil, defaultFrequency, dueLabel, formatGBP, instalmentAmount, instalmentSchedule,
  isPaidOff, isValidDateString, monthlyPlan, nextDueDate, paidCount, parseDate, payoffDate, progress,
  remaining, toDateString, validateDebt,
} from './debtMath'

const debt = (fields = {}) => ({
  provider: 'Klarna', item: 'Trainers', total: 90, instalments: 3, paid: 0,
  due_date: '2026-12-10', frequency: 'monthly', ...fields,
})

describe('dates', () => {
  it('parses YYYY-MM-DD as a local date, not UTC', () => {
    const d = parseDate('2026-03-29')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 29])
    expect(toDateString(d)).toBe('2026-03-29')
  })

  it('rejects impossible or badly formatted dates', () => {
    expect(isValidDateString('2026-02-28')).toBe(true)
    expect(isValidDateString('2026-02-30')).toBe(false)
    expect(isValidDateString('2026-2-3')).toBe(false)
    expect(isValidDateString('')).toBe(false)
  })

  it('adds months without overflowing short months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29') // leap year
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15') // across a year
  })

  it('moves the due date on by the plan frequency', () => {
    expect(nextDueDate('2026-12-28', 'weekly')).toBe('2027-01-04')
    expect(nextDueDate('2026-12-28', 'fortnightly')).toBe('2027-01-11')
    expect(nextDueDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(nextDueDate('2026-01-31', undefined)).toBe('2026-02-28') // defaults to monthly
  })

  it('uses each provider\'s usual schedule', () => {
    expect(defaultFrequency('Clearpay')).toBe('fortnightly')
    expect(defaultFrequency('Zilch')).toBe('fortnightly')
    expect(defaultFrequency('Klarna')).toBe('monthly')
    expect(defaultFrequency('Someone new')).toBe('monthly')
  })
})

describe('days until a payment', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 25, 23, 30)) // 25 Nov 2026, late evening
  })
  afterEach(() => vi.useRealTimers())

  it('counts whole calendar days regardless of the time of day', () => {
    expect(daysUntil('2026-11-25')).toBe(0)
    expect(daysUntil('2026-11-26')).toBe(1)
    expect(daysUntil('2026-11-24')).toBe(-1)
    expect(daysUntil('2026-12-25')).toBe(30)
  })

  it('stays correct across the clocks going forward (29 Mar 2026)', () => {
    vi.setSystemTime(new Date(2026, 2, 28, 12))
    expect(daysUntil('2026-03-30')).toBe(2)
  })

  it('labels due dates', () => {
    expect(dueLabel(-3)).toBe('3d overdue')
    expect(dueLabel(0)).toBe('Due today')
    expect(dueLabel(1)).toBe('1 day left')
    expect(dueLabel(5)).toBe('5 days left')
  })
})

describe('amounts', () => {
  it('splits the total into equal instalments', () => {
    expect(instalmentAmount(debt({ total: 89.97 }))).toBeCloseTo(29.99, 2)
  })

  it('works out what is left, progress and when a plan is paid off', () => {
    const d = debt({ total: 120, instalments: 4, paid: 1 })
    expect(remaining(d)).toBe(90)
    expect(progress(d)).toBe(25)
    expect(isPaidOff(d)).toBe(false)
    expect(isPaidOff(debt({ paid: 3 }))).toBe(true)
    expect(remaining(debt({ paid: 3 }))).toBe(0)
  })

  it('never counts more payments than the plan has', () => {
    const d = debt({ paid: 7 })
    expect(paidCount(d)).toBe(3)
    expect(remaining(d)).toBe(0)
    expect(progress(d)).toBe(100)
  })

  it('treats a missing paid count as nothing paid', () => {
    expect(paidCount(debt({ paid: null }))).toBe(0)
  })

  it('formats pounds', () => {
    expect(formatGBP(29.99)).toBe('£29.99')
    expect(formatGBP(0)).toBe('£0.00')
    expect(formatGBP(undefined)).toBe('£0.00')
  })
})

describe('payment schedule', () => {
  it('lists only the payments still to make', () => {
    const s = instalmentSchedule(debt({ paid: 1 }))
    expect(s.map(p => p.date)).toEqual(['2026-12-10', '2027-01-10'])
    expect(s.every(p => p.amount === 30)).toBe(true)
  })

  it('keeps monthly dates on the same day without drifting', () => {
    const s = instalmentSchedule(debt({ due_date: '2026-01-31', instalments: 3 }))
    expect(s.map(p => p.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('steps fortnightly plans by 14 days', () => {
    const s = instalmentSchedule(debt({ provider: 'Clearpay', instalments: 4, frequency: 'fortnightly' }))
    expect(s.map(p => p.date)).toEqual(['2026-12-10', '2026-12-24', '2027-01-07', '2027-01-21'])
    expect(payoffDate(debt({ instalments: 4, frequency: 'fortnightly' }))).toBe('2027-01-21')
  })

  it('has nothing left once paid off', () => {
    expect(instalmentSchedule(debt({ paid: 3 }))).toEqual([])
    expect(payoffDate(debt({ paid: 3 }))).toBeNull()
  })
})

describe('monthly plan', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 25, 12))
  })
  afterEach(() => vi.useRealTimers())

  it('groups payments by month and counts overdue ones in this month', () => {
    const plan = monthlyPlan([
      debt({ total: 60, instalments: 2, due_date: '2026-11-20' }), // overdue + next month
      debt({ total: 40, instalments: 1, due_date: '2026-12-05' }),
    ])
    expect(plan.map(m => m.key)).toEqual(['2026-11', '2026-12'])
    expect(plan[0].total).toBe(30)
    expect(plan[0].payments[0].overdue).toBe(true)
    expect(plan[1].total).toBe(70)
  })
})

describe('checking AI or pasted details before saving', () => {
  it('accepts a complete purchase', () => {
    const { debt: d, errors } = validateDebt({
      provider: 'Clearpay', item: ' Coat ', total: '120', instalments: 4, paid: 0, due_date: '2026-12-10',
    })
    expect(errors).toEqual([])
    expect(d).toMatchObject({ provider: 'Clearpay', item: 'Coat', total: 120, frequency: 'fortnightly' })
  })

  it('flags every problem with a bad answer', () => {
    const { debt: d, errors } = validateDebt({
      provider: 'MadeUpPay', item: '', total: 'abc', instalments: 0, paid: 5, due_date: '18/07/2026',
    })
    expect(d.provider).toBe('Other')
    expect(errors).toEqual([
      'item name is missing',
      'total must be a positive amount',
      'number of instalments looks wrong',
      'payments made looks wrong',
      'due date is not a valid date',
    ])
  })

  it('copes with nothing at all', () => {
    expect(validateDebt(null).errors.length).toBeGreaterThan(0)
    expect(validateDebt(undefined).debt.paid).toBe(0)
  })

  it('caps long item names', () => {
    expect(validateDebt(debt({ item: 'x'.repeat(300) })).debt.item).toHaveLength(120)
  })
})
