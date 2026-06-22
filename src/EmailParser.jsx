import { useState } from 'react'

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

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY

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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      )

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-medium text-gray-900">Email Parser</h2>
        <p className="text-gray-500 text-sm mt-1">Paste a BNPL email and DERA will extract the debt details automatically.</p>
      </div>

      {/* Email input */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-900">Paste your BNPL email here</p>
        <textarea
          value={emailText}
          onChange={e => setEmailText(e.target.value)}
          placeholder="Copy and paste the full text of your Klarna, Clearpay or PayPal email here..."
          rows={8}
          className="w-full text-sm text-gray-700 border border-gray-100 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-100"
        />
      </div>

      {/* Parse button */}
      <button
        onClick={parseEmail}
        disabled={!emailText.trim() || loading}
        className={`w-full py-3 rounded-2xl text-sm font-medium transition-colors ${
          !emailText.trim() || loading
            ? 'bg-gray-100 text-gray-400'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {loading ? 'Reading your email...' : 'Extract debt details'}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Parsed result */}
      {parsed && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">
          <p className="text-sm font-medium text-gray-900">Extracted details</p>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Provider</span>
              <span className="text-gray-900 font-medium">{parsed.provider}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Item</span>
              <span className="text-gray-900 font-medium">{parsed.item}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total amount</span>
              <span className="text-gray-900 font-medium">£{Number(parsed.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Due date</span>
              <span className="text-gray-900 font-medium">{parsed.due_date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Instalments</span>
              <span className="text-gray-900 font-medium">{parsed.paid} of {parsed.instalments} paid</span>
            </div>
          </div>

          <button
            onClick={handleAddDebt}
            className="w-full py-3 bg-purple-600 text-white rounded-2xl text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Add this debt to DERA
          </button>
        </div>
      )}
    </div>
  )
}

export default EmailParser