import { useState } from 'react'
import { supabase } from './supabase'

function AddDebt({ onDebtAdded, onClose, existingDebt }) {
  const [provider, setProvider] = useState(existingDebt?.provider || 'Klarna')
  const [item, setItem] = useState(existingDebt?.item || '')
  const [total, setTotal] = useState(existingDebt ? String(existingDebt.total) : '')
  const [instalments, setInstalments] = useState(existingDebt ? String(existingDebt.instalments) : '3')
  const [dueDate, setDueDate] = useState(existingDebt?.due_date || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    if (existingDebt) {
      const { error } = await supabase.from('debts').update({
        provider,
        item,
        total: parseFloat(total),
        instalments: parseInt(instalments),
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
        total: parseFloat(total),
        instalments: parseInt(instalments),
        paid: 0,
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
          <h2 className="text-lg font-medium text-gray-900">{existingDebt ? 'Edit debt' : 'Add a debt'}</h2>
          <button onClick={onClose} className="text-gray-400 text-sm">Cancel</button>
        </div>

        {/* Provider */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
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
            onChange={(e) => setInstalments(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="6">6</option>
            <option value="12">12</option>
          </select>
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
          {loading ? 'Saving...' : existingDebt ? 'Update debt' : 'Add debt'}
        </button>

      </div>
    </div>
  )
}

export default AddDebt
