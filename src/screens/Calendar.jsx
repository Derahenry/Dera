import { useState } from 'react'
import { Icon, ProviderBadge } from '../ui'
import {
  daysUntil, formatGBP, instalmentSchedule, paidCount, parseDate, toDateString,
} from '../debtMath'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Every remaining instalment across all active debts, with its payment number.
function allPayments(debts) {
  return debts.flatMap(debt =>
    instalmentSchedule(debt).map((p, i) => ({ ...p, debt, number: paidCount(debt) + 1 + i })),
  ).sort((a, b) => a.date.localeCompare(b.date))
}

function monthDays(cursor) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7 // Monday first
  const count = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= count; d++) cells.push(toDateString(new Date(year, month, d)))
  return cells
}

function PaymentRow({ p, showDate, index = 0 }) {
  const days = daysUntil(p.date)
  return (
    <div className="fade-up flex items-center gap-3 py-3" style={{ animationDelay: `${index * 40}ms` }}>
      <ProviderBadge provider={p.debt.provider} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-ink truncate">{p.debt.item}</p>
        <p className="text-xs text-ink-3 mt-0.5">{p.debt.provider} · payment {p.number} of {p.debt.instalments}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[15px] font-semibold text-ink tabular">{formatGBP(p.amount)}</p>
        {showDate && (
          <p className={`text-xs mt-0.5 ${days < 0 ? 'text-danger' : 'text-ink-3'}`}>
            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : parseDate(p.date).toLocaleString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        )}
      </div>
    </div>
  )
}

function Calendar({ debts, loading, onAdd }) {
  const today = toDateString(new Date())
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selected, setSelected] = useState(today)

  const payments = allPayments(debts)
  const byDate = payments.reduce((map, p) => { (map[p.date] ||= []).push(p); return map }, {})
  const overdue = payments.filter(p => p.date < today)
  const upcoming = payments.filter(p => p.date >= today).slice(0, 12)
  const monthKey = toDateString(cursor).slice(0, 7)
  const monthTotal = payments.filter(p => p.date.startsWith(monthKey)).reduce((s, p) => s + p.amount, 0)
  const selectedPayments = byDate[selected] || []

  const moveMonth = (step) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + step, 1))

  if (!loading && debts.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-3xl p-7 text-center">
        <p className="text-[15px] font-medium text-ink">No payments yet</p>
        <p className="text-sm text-ink-3 mt-1">Add a debt to see your payment dates here.</p>
        <button onClick={onAdd} className="press mt-5 px-5 py-2.5 rounded-full bg-inverse text-on-inverse text-sm font-medium">Add a debt</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Month grid */}
      <section className="bg-surface border border-line rounded-3xl p-5" aria-label="Payment calendar">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink tracking-tight">
              {cursor.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-sm text-ink-3 mt-0.5 tabular">{formatGBP(monthTotal)} due this month</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => moveMonth(-1)} aria-label="Previous month" className="press w-9 h-9 rounded-full bg-surface-2 text-ink flex items-center justify-center">
              <Icon name="chevron" size={16} className="rotate-180" />
            </button>
            <button onClick={() => moveMonth(1)} aria-label="Next month" className="press w-9 h-9 rounded-full bg-surface-2 text-ink flex items-center justify-center">
              <Icon name="chevron" size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mt-5 text-center text-xs font-medium text-ink-3" aria-hidden="true">
          {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1 mt-2">
          {monthDays(cursor).map((date, i) => {
            if (!date) return <span key={`b${i}`} />
            const has = Boolean(byDate[date])
            const late = has && date < today
            const isSelected = date === selected
            const isToday = date === today
            return (
              <button
                key={date}
                onClick={() => setSelected(date)}
                aria-label={`${parseDate(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${has ? `, ${byDate[date].length} payment${byDate[date].length > 1 ? 's' : ''}` : ''}`}
                aria-pressed={isSelected}
                className={`relative aspect-square rounded-xl text-sm tabular flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-inverse text-on-inverse font-semibold'
                    : has
                      ? `font-semibold text-ink border ${late ? 'border-danger text-danger' : 'border-ink-3'}`
                      : isToday ? 'bg-surface-2 text-ink font-semibold' : 'text-ink-2'
                }`}
              >
                {Number(date.slice(8))}
                {has && !isSelected && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${late ? 'bg-danger' : 'bg-ink'}`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Selected day */}
        <div className="mt-5 pt-4 border-t border-line">
          <p className="text-sm font-semibold text-ink">
            {selected === today ? 'Today' : parseDate(selected).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {selectedPayments.length === 0 ? (
            <p className="text-sm text-ink-3 mt-1">No payments on this day.</p>
          ) : (
            <div className="divide-y divide-line">
              {selectedPayments.map((p, i) => <PaymentRow key={`${p.debt.id}-${p.date}`} p={p} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* Overdue */}
      {overdue.length > 0 && (
        <section aria-label="Overdue payments">
          <h2 className="text-lg font-semibold text-danger px-1 mb-2">Overdue</h2>
          <div className="bg-surface border border-danger/40 rounded-3xl px-5 py-1 divide-y divide-line">
            {overdue.map((p, i) => <PaymentRow key={`${p.debt.id}-${p.date}`} p={p} showDate index={i} />)}
          </div>
        </section>
      )}

      {/* Coming up */}
      <section aria-label="Coming up">
        <h2 className="text-lg font-semibold text-ink px-1 mb-2">Coming up</h2>
        {loading ? (
          <div className="bg-surface border border-line rounded-3xl px-5 py-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full shimmer" />
                <div className="flex-1 h-4 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-ink-3 px-1">Nothing else due.</p>
        ) : (
          <div className="bg-surface border border-line rounded-3xl px-5 py-1 divide-y divide-line">
            {upcoming.map((p, i) => <PaymentRow key={`${p.debt.id}-${p.date}`} p={p} showDate index={i} />)}
          </div>
        )}
      </section>
    </div>
  )
}

export default Calendar
