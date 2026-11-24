import { useState } from 'react'
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

// Month-by-month view of every remaining instalment, checked against a monthly budget.
function PaymentPlan({ debts, providerColors }) {
  const [budget, setBudget] = useState(readBudget)

  const changeBudget = (value) => {
    setBudget(value)
    try { localStorage.setItem(BUDGET_KEY, String(value)) } catch { /* not saved, still works */ }
  }

  if (debts.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Payment plan</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">Add debts to see your payment plan</p>
      </div>
    )
  }

  const months = monthlyPlan(debts)
  const totalLeft = debts.reduce((s, d) => s + remaining(d), 0)
  const payoffs = debts
    .map(d => ({ debt: d, date: payoffDate(d) }))
    .filter(p => p.date)
    .sort((a, b) => a.date.localeCompare(b.date))
  const allClear = payoffs.length ? payoffs[payoffs.length - 1].date : null
  const overBudgetMonths = months.filter(m => m.total > budget).length

  // Spare-money tip: first month with room in the budget, pointing at the debt with the least left.
  const firstSpare = months.find(m => m.total < budget)
  const smallest = [...debts].sort((a, b) => remaining(a) - remaining(b))[0]
  const spareTip = firstSpare && smallest && debts.length > 1
    ? { month: formatMonth(firstSpare.key), spare: budget - firstSpare.total, debt: smallest }
    : null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Payment plan</p>

      {/* Summary */}
      <div className="rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20 mb-4">
        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
          {allClear ? `All clear by ${formatLongDate(allClear)}` : 'Nothing left to pay'}
        </p>
        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
          {formatGBP(totalLeft)} left across {debts.length} debt{debts.length !== 1 ? 's' : ''}
          {overBudgetMonths > 0 && ` · ${overBudgetMonths} month${overBudgetMonths !== 1 ? 's' : ''} over budget`}
        </p>
      </div>

      {/* Budget slider */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="plan-budget" className="text-xs text-gray-500 dark:text-slate-400">Monthly budget for BNPL</label>
          <p className="text-sm font-bold text-gray-900 dark:text-white">£{budget}/mo</p>
        </div>
        <input
          id="plan-budget"
          type="range" min="40" max="500" step="10"
          value={budget}
          onChange={e => changeBudget(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-300 dark:text-slate-600">£40</span>
          <span className="text-xs text-gray-300 dark:text-slate-600">£500</span>
        </div>
      </div>

      {/* Month-by-month timeline */}
      <div className="flex flex-col gap-4">
        {months.map(month => {
          const over = month.total > budget
          const pct = Math.min(100, (month.total / budget) * 100)
          return (
            <div key={month.key}>
              <div className="flex items-baseline justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-800 dark:text-white">{formatMonth(month.key)}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatGBP(month.total)}</p>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: over ? '#DC2626' : '#16A34A' }} />
              </div>
              <p className={`text-xs mt-1 font-medium ${over ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {over
                  ? `⚠ ${formatGBP(month.total - budget)} over budget`
                  : `Within budget · ${formatGBP(budget - month.total)} spare`}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {month.payments.map(p => (
                  <div key={`${p.debt.id}-${p.date}`} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: providerColors[p.debt.provider] || '#9AA0B5' }} />
                    <span className="flex-1 min-w-0 truncate text-gray-600 dark:text-slate-300">{p.debt.provider} — {p.debt.item}</span>
                    <span className={`flex-shrink-0 ${p.overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                      {p.overdue ? `overdue (${formatShortDate(p.date)})` : formatShortDate(p.date)}
                    </span>
                    <span className="flex-shrink-0 font-semibold text-gray-700 dark:text-slate-200 w-16 text-right">{formatGBP(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Payoff dates */}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700">
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Paid off on</p>
        <div className="flex flex-col gap-1.5">
          {payoffs.map(({ debt, date }) => (
            <div key={debt.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-slate-300 truncate">{debt.item}</span>
              <span className="font-semibold text-gray-800 dark:text-white flex-shrink-0 ml-2">{formatLongDate(date)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spare-money tip */}
      {spareTip && (
        <div className="mt-4 rounded-xl p-3 bg-green-50 dark:bg-green-900/20">
          <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">
            💡 {formatGBP(spareTip.spare)} spare in {spareTip.month}: paying ahead on <span className="font-semibold">{spareTip.debt.item}</span> ({formatGBP(remaining(spareTip.debt))} left) would clear it sooner.
          </p>
        </div>
      )}
    </div>
  )
}

export default PaymentPlan
