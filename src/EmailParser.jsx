import { useState } from 'react'
import { supabase } from './supabase'
import { validateDebt } from './debtMath'
import DetectedCard from './DetectedCard'

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

// Paste an email: the AI reads it, and what it finds joins the Detected list
// (only the details are kept, never the email). The same card shows here.
function EmailParser({ onDetected, pending, actions, onDone }) {
  const [emailText, setEmailText] = useState('')
  const [loading, setLoading] = useState(false)
  const [detectedId, setDetectedId] = useState(null)
  const [error, setError] = useState('')

  const parseEmail = async () => {
    if (!emailText.trim()) return
    setLoading(true)
    setDetectedId(null)
    setError('')

    // The AI call runs in the ai-assist Edge Function, so the Groq key stays on the server.
    const { data, error } = await supabase.functions.invoke('ai-assist', {
      body: { task: 'parse-email', input: { emailText } },
    })

    if (error || !data?.result) {
      setError('Could not read the email. Try copying more of the email text.')
      setLoading(false)
      return
    }

    // Tidy the AI's answer (known provider, sensible numbers) before it is saved.
    const { debt } = validateDebt(data.result)
    const saved = await onDetected(debt)
    setLoading(false)
    if (saved.error) {
      setError(saved.error)
      return
    }
    setDetectedId(saved.id)
    setEmailText('')
  }

  const purchase = detectedId ? pending.find(p => p.id === detectedId) : null

  const add = async () => {
    if (await actions.onAdd(purchase)) onDone()
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <p className="text-sm text-ink-3 leading-relaxed">
        Paste a BNPL confirmation email and DERA will pick out the purchase. Only the details are saved, never the email.
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

      {/* What was found: the same Detected card that shows on Home */}
      {purchase && (
        <div className="flex flex-col gap-2">
          <DetectedCard
            purchase={purchase}
            duplicate={actions.isDuplicate(purchase)}
            busy={actions.busyId === purchase.id}
            onAdd={add}
            onEdit={() => actions.onEdit(purchase)}
            onIgnore={() => { actions.onIgnore(purchase); setDetectedId(null) }}
          />
          <p className="text-xs text-ink-3 px-1">Not now? It waits for you on Home.</p>
        </div>
      )}
    </div>
  )
}

export default EmailParser
