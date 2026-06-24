import { useState } from 'react'

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

function EmailParser({ onDebtParsed }) {
  const [emailText, setEmailText] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')

  const parseEmail = async () => {
    if (!emailText.trim()) return
    setLoading(true)
    setParsed(null)
    setError('')

    const apiKey = import.meta.env.VITE_GROQ_API_KEY

    const prompt = `You are a financial data extractor. Read the following BNPL (Buy Now Pay Later) email and extract the key details.

Email content:
${emailText}

Extract and return ONLY a JSON object with these exact fields:
{
  "provider": "one of: Klarna, Clearpay, PayPal Pay in 3, Zilch, Other",
  "item": "name of the item or purchase",
  "total": "total amount as a number only, no currency symbol",
  "due_date": "due date in YYYY-MM-DD format",
  "instalments": "total number of instalments as a number",
  "paid": "number of instalments already paid as a number"
}

If any field cannot be determined from the email, use these defaults: instalments: 3, paid: 0.
Return ONLY the JSON object, no explanation, no markdown, no code blocks.`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
        }),
      })

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const result = JSON.parse(clean)
      setParsed(result)
    } catch (err) {
      setError('Could not read the email. Try copying more of the email text.')
    }

    setLoading(false)
  }

  const handleAddDebt = () => {
    if (parsed) {
      onDebtParsed(parsed)
      setEmailText('')
      setParsed(null)
    }
  }

  const fields = parsed ? [
    { label: 'Provider', value: parsed.provider },
    { label: 'Item', value: parsed.item },
    { label: 'Total', value: `£${Number(parsed.total).toFixed(2)}` },
    { label: 'Instalments', value: `${parsed.paid} of ${parsed.instalments} paid` },
    { label: 'Due date', value: parsed.due_date },
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

          <button
            onClick={handleAddDebt}
            className="w-full py-3 bg-green-600 text-white rounded-2xl text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Save to my debts
          </button>
        </div>
      )}
    </div>
  )
}

export default EmailParser
