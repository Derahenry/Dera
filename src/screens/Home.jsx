import { useState } from 'react'
import { ActionButton, Icon, Money, ProviderBadge, Sheet } from '../ui'
import { useCountUp } from '../hooks'
import {
  daysUntil, dueLabel, formatGBP, formatLongDate, formatShortDate, instalmentAmount,
  paidCount, payoffDate, progress, remaining,
} from '../debtMath'

function dueTone(days) {
  if (days < 0) return 'text-danger'
  if (days <= 3) return 'text-danger'
  return 'text-ink-3'
}

function friendlyDue(debt) {
  const days = daysUntil(debt.due_date)
  if (days === 1) return 'Tomorrow'
  if (days > 1 && days <= 6) return `in ${days} days`
  if (days > 6) return formatShortDate(debt.due_date)
  return dueLabel(days)
}

// One debt in the list: badge, item, provider and progress, next amount and when.
function DebtRow({ debt, onOpen, index = 0 }) {
  const days = daysUntil(debt.due_date)
  return (
    <button onClick={() => onOpen(debt)} className="fade-up w-full flex items-center gap-3 py-3 text-left active:opacity-70" style={{ animationDelay: `${index * 45}ms` }}>
      <ProviderBadge provider={debt.provider} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-ink truncate">{debt.item}</p>
        <p className="text-xs text-ink-3 mt-0.5">{debt.provider} · {paidCount(debt)} of {debt.instalments} paid</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[15px] font-semibold text-ink tabular">{formatGBP(instalmentAmount(debt))}</p>
        <p className={`text-xs mt-0.5 ${dueTone(days)}`}>{friendlyDue(debt)}</p>
      </div>
    </button>
  )
}

function Home({
  activeDebts, paidOffDebts, loading, fetchError, onRetry,
  onAdd, onEdit, onDelete, onMarkPaid, payingId, wellbeing, onNavigate, onMessage,
}) {
  const [openDebtId, setOpenDebtId] = useState(null)
  const [payPickerOpen, setPayPickerOpen] = useState(false)
  const [showPaidOff, setShowPaidOff] = useState(false)

  const sorted = [...activeDebts].sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date))
  const totalLeft = activeDebts.reduce((s, d) => s + remaining(d), 0)
  const dueThisWeek = activeDebts
    .filter(d => { const n = daysUntil(d.due_date); return n >= 0 && n <= 7 })
    .reduce((s, d) => s + instalmentAmount(d), 0)
  const overdue = activeDebts.filter(d => daysUntil(d.due_date) < 0).length
  const allClear = activeDebts.map(payoffDate).filter(Boolean).sort().pop()
  const shownLeft = useCountUp(totalLeft)

  // Always read the latest copy so the sheet updates after a payment.
  const openDebt = openDebtId ? activeDebts.find(d => d.id === openDebtId) || null : null

  const payAndClose = async (debt) => {
    await onMarkPaid(debt)
    setPayPickerOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* DERA card */}
      <section className="dera-card rounded-[28px] p-6 text-white" aria-label="Summary">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-[0.2em] text-white/80">DERA</span>
          {overdue > 0 ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#FF6369]/20 text-[#FF9A9E]">
              {overdue} overdue
            </span>
          ) : activeDebts.length > 0 ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-white/80">On track</span>
          ) : null}
        </div>

        <p className="text-sm text-white/55 mt-7">Left to pay</p>
        {loading ? (
          <div className="h-12 w-40 rounded-xl bg-white/10 animate-pulse mt-1" aria-label="Loading" />
        ) : (
          <Money amount={shownLeft} className="block text-[48px] leading-tight font-bold tracking-tight" penceClassName="text-white/45" />
        )}

        <div className="flex gap-2 mt-5 flex-wrap">
          <span className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/85 tabular">
            {formatGBP(dueThisWeek)} due this week
          </span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/85">
            {activeDebts.length} active plan{activeDebts.length === 1 ? '' : 's'}
          </span>
          {allClear && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/85">
              All clear {formatShortDate(allClear)}
            </span>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section className="flex justify-between px-2" aria-label="Quick actions">
        <ActionButton icon="plus" label="Add" primary onClick={onAdd} />
        <ActionButton icon="check" label="Mark paid" onClick={() => setPayPickerOpen(true)} />
        <ActionButton icon="calendar" label="Plan" onClick={() => onNavigate('insights')} />
        <ActionButton icon="message" label="Message" onClick={() => onNavigate('tools')} />
      </section>

      {/* Wellbeing */}
      {activeDebts.length > 0 && (
        <button
          onClick={() => onNavigate('insights')}
          className="flex items-center gap-4 bg-surface border border-line rounded-3xl px-5 py-4 text-left"
        >
          <div className="relative w-11 h-11 flex-shrink-0">
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--surface-2)" strokeWidth="5" />
              <circle cx="22" cy="22" r="18" fill="none" stroke={wellbeing.color} strokeWidth="5"
                strokeDasharray={`${(wellbeing.score / 100) * 113} 113`} strokeLinecap="round" transform="rotate(-90 22 22)" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink tabular">{wellbeing.score}</span>
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-medium text-ink">Wellbeing score</p>
            <p className="text-xs text-ink-3 mt-0.5">{wellbeing.label}</p>
          </div>
          <Icon name="chevron" size={18} className="text-ink-3" />
        </button>
      )}

      {/* Upcoming */}
      <section aria-label="Your plans">
        <div className="flex items-baseline justify-between px-1 mb-2">
          <h2 className="text-lg font-semibold text-ink">Upcoming</h2>
          {activeDebts.length > 0 && (
            <button onClick={() => onNavigate('calendar')} className="text-sm font-medium text-accent">Calendar</button>
          )}
        </div>

        {loading ? (
          <div className="bg-surface border border-line rounded-3xl px-5 py-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full shimmer" />
                <div className="flex-1 h-4 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="bg-surface border border-line rounded-3xl p-6 text-center">
            <Icon name="alert" size={24} className="text-danger mx-auto" />
            <p className="text-[15px] font-medium text-ink mt-3">Couldn't load your debts</p>
            <p className="text-sm text-ink-3 mt-1">{fetchError}</p>
            <button onClick={onRetry} className="mt-4 px-5 py-2.5 rounded-full bg-inverse text-on-inverse text-sm font-medium">
              Try again
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-surface border border-line rounded-3xl p-7 text-center">
            <p className="text-[15px] font-medium text-ink">
              {paidOffDebts.length > 0 ? 'Nothing left to pay' : 'Add your first plan'}
            </p>
            <p className="text-sm text-ink-3 mt-1">
              {paidOffDebts.length > 0
                ? 'Every plan is paid off. Nice work.'
                : 'Track Klarna, Clearpay, PayPal and Zilch payments in one place.'}
            </p>
            <button onClick={onAdd} className="mt-5 px-5 py-2.5 rounded-full bg-inverse text-on-inverse text-sm font-medium">
              Add a debt
            </button>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-3xl px-5 py-1 divide-y divide-line">
            {sorted.map((debt, i) => <DebtRow key={debt.id} debt={debt} index={i} onOpen={d => setOpenDebtId(d.id)} />)}
          </div>
        )}
      </section>

      {/* Paid off */}
      {!loading && !fetchError && paidOffDebts.length > 0 && (
        <section aria-label="Paid off">
          <button
            onClick={() => setShowPaidOff(s => !s)}
            aria-expanded={showPaidOff}
            className="w-full flex items-center justify-between px-1 mb-2"
          >
            <h2 className="text-lg font-semibold text-ink">
              Paid off <span className="text-ink-3 font-normal">{paidOffDebts.length}</span>
            </h2>
            <Icon name="chevron" size={18} className={`text-ink-3 transition-transform ${showPaidOff ? 'rotate-90' : ''}`} />
          </button>
          {showPaidOff && (
            <div className="bg-surface border border-line rounded-3xl px-5 py-1 divide-y divide-line">
              {paidOffDebts.map(debt => (
                <div key={debt.id} className="flex items-center gap-3 py-3">
                  <div className="check-pop w-10 h-10 rounded-full bg-success-soft text-success flex items-center justify-center flex-shrink-0">
                    <Icon name="check" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-ink truncate">{debt.item}</p>
                    <p className="text-xs text-ink-3 mt-0.5">{debt.provider} · {formatGBP(debt.total)} paid</p>
                  </div>
                  <button onClick={() => onEdit(debt)} aria-label={`Edit ${debt.item}`} className="w-9 h-9 rounded-full flex items-center justify-center text-ink-3 hover:text-ink">
                    <Icon name="edit" size={17} />
                  </button>
                  <button onClick={() => onDelete(debt)} aria-label={`Remove ${debt.item}`} className="w-9 h-9 rounded-full flex items-center justify-center text-ink-3 hover:text-danger">
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Debt details sheet */}
      <Sheet open={Boolean(openDebt)} onClose={() => setOpenDebtId(null)} title={openDebt?.item}>
        {openDebt && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <ProviderBadge provider={openDebt.provider} size={44} />
              <div>
                <p className="text-[15px] font-medium text-ink">{openDebt.provider}</p>
                <p className="text-xs text-ink-3">{paidCount(openDebt)} of {openDebt.instalments} payments made</p>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <Money amount={remaining(openDebt)} className="text-3xl font-semibold text-ink" penceClassName="text-ink-3" />
                <span className="text-sm text-ink-3 tabular">of {formatGBP(openDebt.total)}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden mt-3">
                <div className="h-full rounded-full bg-ink" style={{ width: `${progress(openDebt)}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between bg-surface-2 rounded-2xl px-4 py-3">
              <div>
                <p className="text-xs text-ink-3">Next payment</p>
                <p className="text-[15px] font-medium text-ink mt-0.5">{formatLongDate(openDebt.due_date)}</p>
              </div>
              <p className={`text-lg font-semibold tabular ${daysUntil(openDebt.due_date) < 0 ? 'text-danger' : 'text-ink'}`}>
                {formatGBP(instalmentAmount(openDebt))}
              </p>
            </div>

            <button
              onClick={() => onMarkPaid(openDebt)}
              disabled={payingId !== null}
              className="press w-full py-3.5 rounded-full bg-inverse text-on-inverse text-[15px] font-semibold disabled:opacity-50"
            >
              {payingId === openDebt.id ? 'Saving…' : `Mark payment ${paidCount(openDebt) + 1} of ${openDebt.instalments} made`}
            </button>
            <button
              onClick={() => { setOpenDebtId(null); onMessage(openDebt) }}
              className="w-full py-3 rounded-full bg-surface-2 text-ink text-sm font-medium flex items-center justify-center gap-2"
            >
              <Icon name="message" size={16} /> Struggling? Message {openDebt.provider === 'PayPal Pay in 3' ? 'PayPal' : openDebt.provider}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => { setOpenDebtId(null); onEdit(openDebt) }}
                className="flex-1 py-3 rounded-full bg-surface-2 text-ink text-sm font-medium flex items-center justify-center gap-2"
              >
                <Icon name="edit" size={16} /> Edit
              </button>
              <button
                onClick={() => { setOpenDebtId(null); onDelete(openDebt) }}
                className="flex-1 py-3 rounded-full bg-surface-2 text-danger text-sm font-medium flex items-center justify-center gap-2"
              >
                <Icon name="trash" size={16} /> Remove
              </button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Mark paid picker */}
      <Sheet open={payPickerOpen} onClose={() => setPayPickerOpen(false)} title="Which payment did you make?">
        {sorted.length === 0 ? (
          <p className="text-sm text-ink-3 py-4">No payments to mark yet.</p>
        ) : (
          <div className="divide-y divide-line">
            {sorted.map(debt => (
              <div key={debt.id} className="flex items-center gap-3 py-3">
                <ProviderBadge provider={debt.provider} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-ink truncate">{debt.item}</p>
                  <p className={`text-xs mt-0.5 ${dueTone(daysUntil(debt.due_date))}`}>{friendlyDue(debt)}</p>
                </div>
                <button
                  onClick={() => payAndClose(debt)}
                  disabled={payingId !== null}
                  className="px-4 py-2 rounded-full bg-inverse text-on-inverse text-sm font-medium tabular disabled:opacity-50"
                >
                  {payingId === debt.id ? 'Saving…' : `Paid ${formatGBP(instalmentAmount(debt))}`}
                </button>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  )
}

export default Home
