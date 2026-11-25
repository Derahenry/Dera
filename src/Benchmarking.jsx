import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { formatGBP } from './debtMath'

function Benchmarking({ debts }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const userTotal = debts.reduce((sum, d) => sum + Number(d.total), 0)
  const userCount = debts.length

  // Totals are computed server-side from each user's real debts (one per user, anonymous).
  useEffect(() => {
    supabase.rpc('get_benchmark_totals').then(({ data }) => {
      if (data) setRows(data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className="h-40 rounded-3xl shimmer" aria-label="Loading comparison" />
  }

  if (rows.length === 0 || userCount === 0) return null

  const totals = rows.map(r => Number(r.total_debt)).sort((a, b) => a - b)
  const avg = totals.reduce((s, v) => s + v, 0) / totals.length
  const below = totals.filter(v => v < userTotal).length
  const percentile = Math.round((below / totals.length) * 100)
  const pos = Math.min(Math.max(percentile, 3), 97)
  const aboveAvg = userTotal > avg

  return (
    <section className="bg-surface border border-line rounded-3xl p-5" aria-label="How you compare">
      <p className="text-xs font-medium text-ink-3 uppercase tracking-wide">How you compare</p>
      <p className="text-xl font-semibold text-ink tracking-tight mt-1">
        {aboveAvg ? `More than ${percentile}% of DERA users` : `Less than ${100 - percentile}% of DERA users`}
      </p>
      <p className="text-sm text-ink-3 mt-0.5">Anonymous, based on everyone's total BNPL borrowing</p>

      <div className="relative mt-6 h-2 rounded-full bg-surface-2">
        <div className="absolute inset-y-0 left-0 rounded-full bg-ink/15" style={{ width: `${pos}%` }} />
        <div
          className={`absolute top-1/2 w-4 h-4 rounded-full border-[3px] border-surface ${aboveAvg ? 'bg-danger' : 'bg-success'}`}
          style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)' }}
          aria-hidden="true"
        />
      </div>
      <div className="flex justify-between mt-2 text-[11px] text-ink-3">
        <span>Less</span><span>More</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-5">
        {[
          { label: 'You', value: formatGBP(userTotal) },
          { label: 'Average', value: formatGBP(avg) },
          { label: 'Users', value: totals.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-2 rounded-2xl px-3 py-3">
            <p className="text-[11px] text-ink-3">{label}</p>
            <p className="text-sm font-semibold text-ink tabular mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Benchmarking
