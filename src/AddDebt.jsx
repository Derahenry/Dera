import { useState } from 'react'
import { supabase } from './supabase'
import { FREQUENCIES, FREQUENCY_LABELS, PROVIDERS, defaultFrequency, formatGBP } from './debtMath'
import { Icon, ProviderBadge, Sheet } from './ui'
import { fieldClass } from './styles'

const SHORT_NAME = { 'PayPal Pay in 3': 'PayPal' }
const INSTALMENT_CHOICES = [2, 3, 4, 6, 12]

function Label({ children, htmlFor }) {
  return <label htmlFor={htmlFor} className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-2 block">{children}</label>
}

// Add or edit a debt in a slide-up sheet. A debt without an id (e.g. from the
// Detected card's "Edit") is treated as a new debt with pre-filled values.
function AddDebt({ onDebtAdded, onLinkPending, onClose, existingDebt }) {
  const isEditing = Boolean(existingDebt?.id)
  const [provider, setProvider] = useState(PROVIDERS.includes(existingDebt?.provider) ? existingDebt.provider : 'Klarna')
  const [item, setItem] = useState(existingDebt?.item || '')
  const [total, setTotal] = useState(() => {
    const t = Number(existingDebt?.total)
    return existingDebt?.total != null && existingDebt?.total !== '' && Number.isFinite(t) ? String(t) : ''
  })
  const [instalments, setInstalments] = useState(() => {
    const n = Number(existingDebt?.instalments)
    return Number.isInteger(n) && n >= 1 ? n : 3
  })
  const [paid, setPaid] = useState(() => {
    const p = Number(existingDebt?.paid)
    return Number.isInteger(p) && p >= 0 ? p : 0
  })
  const [frequency, setFrequency] = useState(existingDebt?.frequency || defaultFrequency(existingDebt?.provider || 'Klarna'))
  const [frequencyTouched, setFrequencyTouched] = useState(Boolean(existingDebt?.frequency))
  const [dueDate, setDueDate] = useState(existingDebt?.due_date || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const choices = [...new Set([...INSTALMENT_CHOICES, instalments])].sort((a, b) => a - b)
  const totalNum = parseFloat(total)
  const perPayment = Number.isFinite(totalNum) && totalNum > 0 ? totalNum / instalments : null
  const safePaid = Math.min(paid, instalments)

  const changeProvider = (value) => {
    setProvider(value)
    // Follow the provider's usual schedule until the user picks one themselves.
    if (!frequencyTouched) setFrequency(defaultFrequency(value))
  }

  const changeInstalments = (n) => {
    setInstalments(n)
    if (paid > n) setPaid(n)
  }

  const onAmount = (value) => {
    // Digits and one decimal point, max 2 decimal places.
    const cleaned = value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    const [whole, dec] = cleaned.split('.')
    setTotal(dec !== undefined ? `${whole}.${dec.slice(0, 2)}` : whole)
    setError('')
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setError('')
    if (!Number.isFinite(totalNum) || totalNum <= 0) return setError('Enter a total amount above £0.')
    if (!item.trim()) return setError('Add what you bought.')
    if (!dueDate) return setError('Pick the next payment date.')
    setLoading(true)

    const fields = {
      provider,
      item: item.trim(),
      total: totalNum,
      instalments,
      paid: safePaid,
      frequency,
      due_date: dueDate,
    }

    let saveError
    let saved = null
    if (isEditing) {
      ({ error: saveError } = await supabase.from('debts').update(fields).eq('id', existingDebt.id))
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      ;({ data: saved, error: saveError } = await supabase
        .from('debts')
        .insert({ ...fields, user_id: user.id, status: 'on-track' })
        .select('id')
        .single())
    }

    if (!saveError && saved && existingDebt?.pendingId) {
      // Saved from a detected purchase: mark it added so it leaves the Detected list.
      await onLinkPending?.(existingDebt.pendingId, saved.id)
    }
    setLoading(false)
    if (saveError) {
      setError("Couldn't save this debt. Check your connection and try again.")
      return
    }
    onDebtAdded()
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={isEditing ? 'Edit debt' : 'Add a debt'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Big amount */}
        <div className="text-center">
          <label htmlFor="debt-total" className="text-xs font-medium text-ink-3 uppercase tracking-wide">Total amount</label>
          <div className="flex items-baseline justify-center mt-1">
            <span className="text-[44px] font-bold text-ink-3 tracking-tight">£</span>
            <input
              id="debt-total"
              inputMode="decimal"
              autoComplete="off"
              value={total}
              onChange={e => onAmount(e.target.value)}
              placeholder="0.00"
              style={{ width: `${Math.max(2, (total || '0.00').length) + 0.4}ch` }}
              className="bg-transparent text-[44px] font-bold text-ink tracking-tight tabular outline-none placeholder:text-ink-3 text-left min-w-0"
            />
          </div>
          <p className="text-sm text-ink-3 mt-1 tabular min-h-5">
            {perPayment ? `${instalments} × ${formatGBP(perPayment)} · ${FREQUENCY_LABELS[frequency].toLowerCase()}` : ' '}
          </p>
        </div>

        {/* Provider */}
        <div>
          <Label>Provider</Label>
          <div className="flex justify-between" role="radiogroup" aria-label="Provider">
            {PROVIDERS.map(p => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={provider === p}
                onClick={() => changeProvider(p)}
                className="flex flex-col items-center gap-1.5 w-14"
              >
                <span className={`rounded-full p-0.5 transition-shadow ${provider === p ? 'ring-2 ring-ink' : ''}`}>
                  <ProviderBadge provider={p} size={44} />
                </span>
                <span className={`text-[11px] ${provider === p ? 'text-ink font-semibold' : 'text-ink-3'}`}>{SHORT_NAME[p] || p}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Item */}
        <div>
          <Label htmlFor="debt-item">What did you buy?</Label>
          <input id="debt-item" value={item} onChange={e => { setItem(e.target.value); setError('') }} placeholder="Nike trainers" maxLength={120} className={fieldClass} />
        </div>

        {/* Instalments */}
        <div>
          <Label>Number of payments</Label>
          <div className="flex gap-2" role="radiogroup" aria-label="Number of payments">
            {choices.map(n => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={instalments === n}
                onClick={() => changeInstalments(n)}
                className={`press flex-1 py-2.5 rounded-full text-sm font-semibold tabular transition-colors ${
                  instalments === n ? 'bg-inverse text-on-inverse' : 'bg-surface-2 text-ink'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Payments made + how often */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Payments made</Label>
            <div className="flex items-center justify-between bg-surface-2 rounded-2xl p-1.5">
              <button type="button" onClick={() => setPaid(p => Math.max(0, p - 1))} aria-label="One fewer payment made" className="press w-9 h-9 rounded-xl bg-surface text-ink text-lg font-semibold">−</button>
              <span className="text-[15px] font-semibold text-ink tabular" aria-live="polite">{safePaid} of {instalments}</span>
              <button type="button" onClick={() => setPaid(p => Math.min(instalments, p + 1))} aria-label="One more payment made" className="press w-9 h-9 rounded-xl bg-surface text-ink text-lg font-semibold">+</button>
            </div>
          </div>
          <div className="flex-1">
            <Label htmlFor="debt-frequency">How often</Label>
            <select
              id="debt-frequency"
              value={frequency}
              onChange={e => { setFrequency(e.target.value); setFrequencyTouched(true) }}
              className={`${fieldClass} py-3 appearance-none`}
            >
              {FREQUENCIES.map(f => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
            </select>
          </div>
        </div>

        {/* Next payment */}
        <div>
          <Label htmlFor="debt-due">{safePaid >= instalments ? 'Last payment date' : 'Next payment due'}</Label>
          <input id="debt-due" type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); setError('') }} className={fieldClass} />
        </div>

        {error && (
          <p className="text-sm text-danger flex items-center gap-2" role="alert">
            <Icon name="alert" size={16} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="press w-full py-4 rounded-full bg-inverse text-on-inverse text-[15px] font-semibold disabled:opacity-50"
        >
          {loading ? 'Saving…' : isEditing ? 'Save changes' : 'Add debt'}
        </button>
      </form>
    </Sheet>
  )
}

export default AddDebt
