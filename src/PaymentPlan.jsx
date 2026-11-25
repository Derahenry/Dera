import { useState } from 'react'
import { ProviderBadge } from './ui'
import {
  formatGBP, formatLongDate, formatMonth, formatShortDate, monthlyPlan, payoffDate, remaining,
} from './debtMath'

const BUDGET_KEY = 'dera-plan-budget'

function readBudget() {
  try {
    const saved = Number(localStorage.getItem(BUDGET_KEY))
    return saved >= 40 && saved <= 500 ? saved : 120
  } catch {
    return 120
  }
}

const shortMonth = (key) => formatMonth(key).split(' ')[0]

// Month-by-month view of every remaining instalment, checked against a monthly budget.
function PaymentPlan({ debts }) {
  const [budget, setBudget] = useState(readBudget)
  const [openMonth, setOpenMonth] = useState(null)

  const changeBudget = (value) => {
    setBudget(value)
    try { localStorage.setItem(BUDGET_KEY, String(value)) } catch { /* not saved, still works */ }
  }

  if (debts.length === 0) return null

  const months = monthlyPlan(debts)
  const totalLeft = debts.reduce((s, d) => s + remaining(d), 0)
  const payoffs = debts
    .map(d => ({ debt: d, date: payoffDate(d) }))
    .filter(p => p.date)
    .sort((a, b) => a.date.localeCompare(b.date))
  const allClear = payoffs.length ? payoffs[payoffs.length - 1].date : null
  const overBudget = months.filter(m => m.total > budget)
  const peak = Math.max(budget, ...months.map(m => m.total))
  const shown = months.find(m => m.key === openMonth) || months[0]

  // Spare-money tip: first month with room in the budget, pointing at the debt with the least left.
  const firstSpare = months.find(m => m.total < budget)
  const smallest = [...debts].sort((a, b) => remaining(a) - remaining(b))[0]
  const spareTip = firstSpare && smallest && debts.length > 1
    ? { month: formatMonth(firstSpare.key), spare: budget - firstSpare.total, debt: smallest }
    : null

  return (
    <section className="bg-surface border border-line rounded-3xl p-5" aria-label="Payment plan">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink-3 uppercase tracking-wide">Payment plan</p>
          <p className="text-xl font-semibold text-ink tracking-tight mt-1">
            {allClear ? `All clear by ${formatLongDate(allClear)}` : 'Nothing left to pay'}
          </p>
          <p className="text-sm text-ink-3 mt-0.5 tabular">
            {formatGBP(totalLeft)} left across {debts.length} debt{debts.length !== 1 ? 's' : ''}
          </p>
        </div>
        {overBudget.length > 0 && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-danger/10 text-danger whitespace-nowrap">
            {overBudget.length} month{overBudget.length > 1 ? 's' : ''} over
          </span>
        )}
      </div>

      {/* Bars: each month against the budget line */}
      <div className="relative mt-6 h-40 flex items-end gap-2 border-b border-line" role="list" aria-label="Payments per month">
        <div
          className="absolute left-0 right-0 border-t border-dashed border-ink-3 pointer-events-none"
          style={{ bottom: `${(budget / peak) * 100}%` }}
          aria-hidden="true"
        >
          <span className="absolute right-0 -top-5 text-[11px] text-ink-3 tabular">£{budget} budget</span>
        </div>
        {months.map((m, i) => {
          const over = m.total > budget
          const active = shown.key === m.key
          return (
            <button
              key={m.key}
              role="listitem"
              onClick={() => setOpenMonth(m.key)}
              aria-label={`${formatMonth(m.key)}: ${formatGBP(m.total)}${over ? ', over budget' : ''}`}
              aria-pressed={active}
              className="flex-1 h-full flex flex-col justify-end items-center"
            >
              {/* Dimming lives on the wrapper so the entrance animation can't override it */}
              <span
                className={`w-full max-w-10 flex flex-col justify-end transition-opacity ${active ? '' : 'opacity-35'}`}
                style={{ height: `${Math.max(4, (m.total / peak) * 100)}%` }}
              >
                <span
                  className={`fade-up block h-full rounded-t-lg ${over ? 'bg-danger' : 'bg-ink'}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex gap-2 mt-2" aria-hidden="true">
        {months.map(m => (
          <span key={m.key} className={`flex-1 text-center text-[11px] ${shown.key === m.key ? 'text-ink font-semibold' : 'text-ink-3'}`}>
            {shortMonth(m.key)}
          </span>
        ))}
      </div>

      {/* Chosen month detail */}
      <div className="mt-5 bg-surface-2 rounded-2xl p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink">{formatMonth(shown.key)}</p>
          <p className="text-sm font-semibold text-ink tabular">{formatGBP(shown.total)}</p>
        </div>
        <p className={`text-xs mt-0.5 ${shown.total > budget ? 'text-danger' : 'text-ink-3'}`}>
          {shown.total > budget
            ? `${formatGBP(shown.total - budget)} over your budget`
            : `${formatGBP(budget - shown.total)} spare`}
        </p>
        <div className="mt-3 flex flex-col gap-2.5">
          {shown.payments.map(p => (
            <div key={`${p.debt.id}-${p.date}`} className="flex items-center gap-2.5">
              <ProviderBadge provider={p.debt.provider} size={26} />
              <span className="flex-1 min-w-0 truncate text-sm text-ink">{p.debt.item}</span>
              <span className={`text-xs flex-shrink-0 ${p.overdue ? 'text-danger font-medium' : 'text-ink-3'}`}>
                {p.overdue ? `overdue · ${formatShortDate(p.date)}` : formatShortDate(p.date)}
              </span>
              <span className="text-sm font-semibold text-ink tabular w-16 text-right flex-shrink-0">{formatGBP(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="mt-5">
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="plan-budget" className="text-sm text-ink-2">Monthly budget for BNPL</label>
          <p className="text-sm font-semibold text-ink tabular">£{budget}/mo</p>
        </div>
        <input
          id="plan-budget"
          type="range" min="40" max="500" step="10"
          value={budget}
          onChange={e => changeBudget(Number(e.target.value))}
          className="w-full accent-[var(--ink)]"
        />
      </div>

      {/* Payoff dates */}
      <div className="mt-5 pt-4 border-t border-line">
        <p className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-2">Paid off on</p>
        <div className="flex flex-col gap-2">
          {payoffs.map(({ debt, date }) => (
            <div key={debt.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-2 truncate">{debt.item}</span>
              <span className="font-medium text-ink flex-shrink-0 ml-2">{formatLongDate(date)}</span>
            </div>
          ))}
        </div>
      </div>

      {spareTip && (
        <p className="mt-4 text-sm text-ink-2 leading-relaxed bg-success-soft rounded-2xl p-4">
          <span className="font-semibold text-success">{formatGBP(spareTip.spare)} spare</span> in {spareTip.month}. Paying ahead on{' '}
          <span className="font-semibold text-ink">{spareTip.debt.item}</span> ({formatGBP(remaining(spareTip.debt))} left) would clear it sooner.
        </p>
      )}
    </section>
  )
}

export default PaymentPlan
