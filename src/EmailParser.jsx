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
    <div className="flex flex-col gap-5 pb-4">
      <p className="text-sm text-ink-3 leading-relaxed">
        Paste a BNPL confirmation email and DERA will extract the debt details automatically.
      </p>

      {/* Email textarea */}
      <textarea
        value={emailText}
        onChange={e => setEmailText(e.target.value)}
        placeholder="Paste your Klarna, Clearpay or PayPal email here..."
        rows={8}
        className="w-full text-[15px] text-ink bg-surface border border-line rounded-3xl p-4 resize-none focus:outline-none focus:border-ink-3 placeholder:text-ink-3 leading-relaxed"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setEmailText(SAMPLE_EMAIL)}
          className="press flex-1 py-3 rounded-full text-sm font-semibold bg-surface-2 text-ink"
        >
          Use sample
        </button>
        <button
          onClick={parseEmail}
          disabled={!emailText.trim() || loading}
          className="press flex-1 py-3 rounded-full text-sm font-semibold bg-inverse text-on-inverse disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Reading...' : 'Extract details'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 rounded-2xl p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Parsed result */}
      {parsed && (
        <div className="fade-up bg-surface border border-line rounded-3xl p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-ink">Extracted details</p>

          <div className="flex flex-col divide-y divide-line">
            {fields.map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-ink-3">{label}</span>
                <span className="text-sm font-semibold text-ink">{value}</span>
              </div>
            ))}
          </div>

          {parsed.errors.length > 0 && (
            <div className="bg-danger/10 rounded-2xl p-3">
              <p className="text-xs font-semibold text-danger mb-1">Please check before saving:</p>
              <ul className="text-xs text-danger list-disc pl-4">
                {parsed.errors.map(e => <li key={e}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="press flex-1 py-3 rounded-full text-sm font-semibold bg-surface-2 text-ink"
            >
              Edit first
            </button>
            <button
              onClick={handleAddDebt}
              disabled={parsed.errors.length > 0 || saving}
              className="press flex-1 py-3 rounded-full text-sm font-semibold bg-inverse text-on-inverse disabled:opacity-40 disabled:cursor-not-allowed"
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
