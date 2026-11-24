import { useState } from 'react'
import { supabase } from './supabase'
import { FREQUENCY_LABELS, formatGBP, validateDebt } from './debtMath'

const SAMPLE_EMAIL = `From: noreply@klarna.com
Subject: Your next payment is due soon

Hi there,

Just a heads up — your next Klarna payment is coming up.

Order details:
Item: Nike Air Force 1 '07
Total order value: £89.97
Next payment: £29.99
Payment date: 2026-07-18
Instalment: 1 of 3

You don't need to do anything — we'll collect the payment automatically from your registered card.

Questions? Visit klarna.com/uk or reply to this email.

Thanks,
The Klarna team`

function EmailParser({ onDebtParsed, onEditParsed }) {
  const [emailText, setEmailText] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const parseEmail = async () => {
    if (!emailText.trim()) return
    setLoading(true)
    setParsed(null)
    setError('')

    // The AI call runs in the ai-assist Edge Function, so the Groq key stays on the server.
    const { data, error } = await supabase.functions.invoke('ai-assist', {
      body: { task: 'parse-email', input: { emailText } },
    })

    if (error || !data?.result) {
      setError('Could not read the email. Try copying more of the email text.')
    } else {
      // Check the AI's answer before it can be saved.
      setParsed(validateDebt(data.result))
    }

    setLoading(false)
  }

  const handleAddDebt = async () => {
    if (!parsed || parsed.errors.length > 0) return
    setSaving(true)
    setError('')
    const saveError = await onDebtParsed(parsed.debt)
    setSaving(false)
    if (saveError) {
      setError(saveError)
      return
    }
    setEmailText('')
    setParsed(null)
  }

  const handleEdit = () => {
    if (!parsed) return
    onEditParsed(parsed.debt)
  }

  const d = parsed?.debt
  const fields = d ? [
    { label: 'Provider', value: d.provider },
    { label: 'Item', value: d.item || '—' },
    { label: 'Total', value: Number.isFinite(d.total) ? formatGBP(d.total) : '—' },
    { label: 'Instalments', value: `${d.paid} of ${d.instalments} paid` },
    { label: 'How often', value: FREQUENCY_LABELS[d.frequency] },
    { label: 'Due date', value: d.due_date || '—' },
  ] : []

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-gray-400 dark:text-slate-500 leading-relaxed">
        Paste a BNPL confirmation email and DERA will extract the debt details automatically.
      </p>

      {/* Email textarea */}
      <textarea
        value={emailText}
        onChange={e => setEmailText(e.target.value)}
        placeholder="Paste your Klarna, Clearpay or PayPal email here..."
        rows={8}
        className="w-full text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl p-4 resize-none focus:outline-none focus:border-indigo-400 dark:placeholder-slate-500 leading-relaxed"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setEmailText(SAMPLE_EMAIL)}
          className="flex-1 py-2.5 rounded-2xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          Use sample
        </button>
        <button
          onClick={parseEmail}
          disabled={!emailText.trim() || loading}
          className="flex-1 py-2.5 rounded-2xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Reading...' : 'Extract details'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Parsed result */}
      {parsed && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex flex-col gap-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Extracted details</p>

          <div className="flex flex-col divide-y divide-gray-50 dark:divide-slate-700">
            {fields.map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                <span className="text-xs text-gray-400 dark:text-slate-500">{label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>

          {parsed.errors.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Please check before saving:</p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc pl-4">
                {parsed.errors.map(e => <li key={e}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Edit first
            </button>
            <button
              onClick={handleAddDebt}
              disabled={parsed.errors.length > 0 || saving}
              className="flex-1 py-3 bg-green-600 text-white rounded-2xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save to my debts'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailParser
