import PaymentPlan from '../PaymentPlan'
import Benchmarking from '../Benchmarking'
import { Icon } from '../ui'
import { useCountUp } from '../hooks'
import {
  daysUntil, dueLabel, formatGBP, instalmentAmount, instalmentSchedule, paidCount,
} from '../debtMath'

function tone(score) {
  if (score >= 70) return { text: 'text-success', bg: 'bg-success-soft' }
  if (score >= 40) return { text: 'text-ink', bg: 'bg-surface-2' }
  return { text: 'text-danger', bg: 'bg-danger/10' }
}

function Insights({ activeDebts, allDebts, wellbeing, atRisk, onAdd }) {
  const score = Math.round(useCountUp(wellbeing.score))
  const t = tone(wellbeing.score)

  const leftToPay = activeDebts.reduce((s, d) => s + (d.instalments - paidCount(d)) * instalmentAmount(d), 0)
  const paidSoFar = allDebts.reduce((s, d) => s + paidCount(d) * instalmentAmount(d), 0)
  const next30 = activeDebts
    .flatMap(d => instalmentSchedule(d))
    .filter(p => { const n = daysUntil(p.date); return n <= 30 })
    .reduce((s, p) => s + p.amount, 0)

  if (allDebts.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-3xl p-7 text-center">
        <p className="text-[15px] font-medium text-ink">Your insights will appear here</p>
        <p className="text-sm text-ink-3 mt-1">Add a debt to see your score, plan and how you compare.</p>
        <button onClick={onAdd} className="press mt-5 px-5 py-2.5 rounded-full bg-inverse text-on-inverse text-sm font-medium">Add a debt</button>
      </div>
    )
  }

  const factors = [
    { label: 'Paying on time', value: wellbeing.timeliness },
    { label: 'How much you owe', value: wellbeing.load },
    { label: 'Progress so far', value: wellbeing.progress },
  ]

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Needs attention */}
      {atRisk.length > 0 && (
        <section className="fade-up flex items-start gap-3 bg-danger/10 rounded-3xl p-4" role="status">
          <span className="w-9 h-9 rounded-full bg-danger text-white flex items-center justify-center flex-shrink-0">
            <Icon name="alert" size={18} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">
              {atRisk.length} payment{atRisk.length > 1 ? 's' : ''} need{atRisk.length === 1 ? 's' : ''} attention
            </p>
            <p className="text-sm text-ink-2 mt-0.5">
              {atRisk[0].provider} · {atRisk[0].item}: {dueLabel(atRisk[0].days).toLowerCase()}
            </p>
          </div>
        </section>
      )}

      {/* Wellbeing */}
      <section className="bg-surface border border-line rounded-3xl p-5" aria-label="Wellbeing score">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-ink-3 uppercase tracking-wide">Wellbeing score</p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.bg} ${t.text}`}>{wellbeing.label}</span>
        </div>
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[64px] leading-none font-black tracking-tighter text-ink tabular">{score}</span>
          <span className="text-lg text-ink-3 font-medium">/ 100</span>
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {factors.map(f => (
            <div key={f.label}>
              <div className="flex justify-between text-sm">
                <span className="text-ink-2">{f.label}</span>
                <span className="font-semibold text-ink tabular">{f.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 mt-1.5 overflow-hidden">
                <div className="line-sweep h-full rounded-full bg-ink" style={{ width: `${f.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Numbers */}
      <section className="grid grid-cols-2 gap-3" aria-label="Your numbers">
        {[
          { label: 'Left to pay', value: formatGBP(leftToPay) },
          { label: 'Paid so far', value: formatGBP(paidSoFar) },
          { label: 'Due in 30 days', value: formatGBP(next30) },
          { label: 'Active plans', value: activeDebts.length },
        ].map((s, i) => (
          <div key={s.label} className="fade-up bg-surface border border-line rounded-3xl p-4" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="text-xs text-ink-3">{s.label}</p>
            <p className="text-xl font-semibold text-ink tabular mt-1 tracking-tight">{s.value}</p>
          </div>
        ))}
      </section>

      <PaymentPlan debts={activeDebts} />
      <Benchmarking debts={allDebts} />
    </div>
  )
}

export default Insights
