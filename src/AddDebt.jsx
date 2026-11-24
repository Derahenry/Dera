import { useState } from 'react'
import { supabase } from './supabase'
import { FREQUENCIES, FREQUENCY_LABELS, defaultFrequency } from './debtMath'

function AddDebt({ onDebtAdded, onClose, existingDebt }) {
  const [provider, setProvider] = useState(existingDebt?.provider || 'Klarna')
  const [item, setItem] = useState(existingDebt?.item || '')
  const [total, setTotal] = useState(Number.isFinite(Number(existingDebt?.total)) && existingDebt?.total !== '' && existingDebt?.total != null ? String(existingDebt.total) : '')
  const [instalments, setInstalments] = useState(
    Number.isInteger(Number(existingDebt?.instalments)) && Number(existingDebt.instalments) >= 1 ? String(existingDebt.instalments) : '3'
  )
  const instalmentOptions = [...new Set([2, 3, 4, 6, 12, Number(instalments)])].sort((a, b) => a - b)
  const [dueDate, setDueDate] = useState(existingDebt?.due_date || '')
  const [frequency, setFrequency] = useState(existingDebt?.frequency || defaultFrequency(existingDebt?.provider || 'Klarna'))
  const isEditing = Boolean(existingDebt?.id)
  const [frequencyTouched, setFrequencyTouched] = useState(Boolean(existingDebt?.frequency))
  const [paid, setPaid] = useState(() => {
    const p = Number(existingDebt?.paid)
    return Number.isInteger(p) && p >= 0 ? String(Math.min(p, Number(instalments) || p)) : '0'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const changeProvider = (value) => {
    setProvider(value)
    // Follow the provider's usual schedule until the user picks one themselves.
    if (!frequencyTouched) setFrequency(defaultFrequency(value))
  }

  const changeInstalments = (value) => {
    setInstalments(value)
    if (Number(paid) > Number(value)) setPaid(value)
  }

  const handleSubmit = async () => {
    setError('')
    const totalNum = parseFloat(total)
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      setError('Enter a total amount above £0.')
      return
    }
    setLoading(true)

    if (isEditing) {
      const { error } = await supabase.from('debts').update({
        provider,
        item,
        total: totalNum,
        instalments: parseInt(instalments),
        paid: parseInt(paid),
        frequency,
        due_date: dueDate,
      }).eq('id', existingDebt.id)

      if (error) {
        setError(error.message)
      } else {
        onDebtAdded()
        onClose()
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('debts').insert({
        user_id: user.id,
        provider,
        item,
        total: totalNum,
        instalments: parseInt(instalments),
        paid: parseInt(paid),
        frequency,
        due_date: dueDate,
        status: 'on-track'
      })

      if (error) {
        setError(error.message)
      } else {
        onDebtAdded()
        onClose()
      }
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl p-6">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">{isEditing ? 'Edit debt' : 'Add a debt'}</h2>
          <button onClick={onClose} className="text-gray-400 text-sm">Cancel</button>
        </div>

        {/* Provider */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Provider</label>
          <select
            value={provider}
            onChange={(e) => changeProvider(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
          >
            <option>Klarna</option>
            <option>Clearpay</option>
            <option>PayPal Pay in 3</option>
            <option>Zilch</option>
            <option>Other</option>
          </select>
        </div>

        {/* Item */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">What did you buy?</label>
          <input
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="e.g. Nike trainers"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
          />
        </div>

        {/* Total */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Total amount (£)</label>
          <input
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="e.g. 120.00"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
          />
        </div>

        {/* Instalments */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Number of instalments</label>
          <select
            value={instalments}
            onChange={(e) => changeInstalments(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
          >
            {instalmentOptions.map(n => (
              <option key={n} value={String(n)}>{n}</option>
            ))}
          </select>
        </div>

        {/* Payments made + frequency */}
        <div className="mb-4 flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Payments made</label>
            <select
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
            >
              {Array.from({ length: Number(instalments) + 1 }, (_, i) => (
                <option key={i} value={String(i)}>{i} of {instalments}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">How often</label>
            <select
              value={frequency}
              onChange={(e) => { setFrequency(e.target.value); setFrequencyTouched(true) }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
            >
              {FREQUENCIES.map(f => (
                <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date */}
        <div className="mb-6">
          <label className="text-xs text-gray-400 mb-1 block">Next payment due</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
          />
        </div>

        {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !item || !total || !dueDate}
          className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditing ? 'Update debt' : 'Add debt'}
        </button>

      </div>
    </div>
  )
}

export default AddDebt
