import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function Benchmarking({ debts }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const userTotal = debts.reduce((sum, d) => sum + Number(d.total), 0)
  const userCount = debts.length

  useEffect(() => {
    const run = async () => {
      const today = new Date().toISOString().slice(0, 10)
      const lastSubmit = localStorage.getItem('dera-benchmark-date')

      if (lastSubmit !== today && userCount > 0) {
        await supabase.from('benchmarks').insert([{ total_debt: userTotal, debt_count: userCount }])
        localStorage.setItem('dera-benchmark-date', today)
      }

      const { data } = await supabase.from('benchmarks').select('total_debt')
      if (data) setRows(data)
      setLoading(false)
    }
    run()
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-indigo-600 animate-spin" />
      </div>
    )
  }

  if (rows.length === 0 || userCount === 0) return null

  const totals = rows.map(r => Number(r.total_debt)).sort((a, b) => a - b)
  const avg = totals.reduce((s, v) => s + v, 0) / totals.length
  const below = totals.filter(v => v < userTotal).length
  const percentile = Math.round((below / totals.length) * 100)
  const barPos = Math.min(Math.max(percentile, 2), 98)
  const aboveAvg = userTotal > avg
  const rank = totals.length - below

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">

      {/* Header */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">How you compare</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Anonymous data from DERA users</p>
      </div>

      {/* User total */}
      <p
        className="text-3xl font-bold text-gray-900 dark:text-white mb-5"
        style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px' }}
      >
        £{userTotal.toFixed(2)}
      </p>

      {/* Bar */}
      <div className="relative mb-2">
        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-visible relative">
          {/* Gradient fill up to user position */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${barPos}%`,
              background: aboveAvg
                ? 'linear-gradient(90deg, #86efac 0%, #f87171 100%)'
                : 'linear-gradient(90deg, #86efac 0%, #34d399 100%)',
            }}
          />
          {/* Dot marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-md"
            style={{
              left: `${barPos}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: aboveAvg ? '#ef4444' : '#10b981',
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-300 dark:text-slate-600">Less debt</span>
          <span className="text-[10px] text-gray-300 dark:text-slate-600">More debt</span>
        </div>
      </div>

      {/* Percentile label */}
      <p className={`text-sm font-semibold mt-3 mb-5 ${aboveAvg ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
        {aboveAvg
          ? `You have more debt than ${percentile}% of students on DERA`
          : `You have less debt than ${100 - percentile}% of students on DERA`}
      </p>

      {/* Stat row */}
      <div className="flex border-t border-gray-100 dark:border-slate-700 pt-4 gap-0">
        {[
          { label: 'Avg debt', value: `£${avg.toFixed(0)}` },
          { label: 'Students', value: totals.length },
          { label: 'Your rank', value: `#${rank}` },
        ].map(({ label, value }, i) => (
          <div key={label} className={`flex-1 text-center ${i > 0 ? 'border-l border-gray-100 dark:border-slate-700' : ''}`}>
            <p
              className="text-base font-bold text-gray-900 dark:text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {value}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Benchmarking
