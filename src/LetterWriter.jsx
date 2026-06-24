import { useState } from 'react'

const PROVIDERS = {
  'Klarna': 'Klarna Bank AB',
  'Clearpay': 'Clearpay Finance Limited',
  'PayPal Pay in 3': 'PayPal Credit',
  'Zilch': 'Zilch Technology Limited',
  'Other': 'the creditor',
}

const providerColors = {
  'Klarna': '#FF7DA8',
  'Clearpay': '#1EC9A0',
  'PayPal Pay in 3': '#1E73E8',
  'Zilch': '#7C5CFC',
  'Other': '#9AA0B5',
}

function LetterWriter({ debts }) {
  const [selectedDebt, setSelectedDebt] = useState('')
  const [reason, setReason] = useState('')
  const [letter, setLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateLetter = async () => {
    if (!selectedDebt || !reason) return
    setLoading(true)
    setLetter('')

    const debt = debts.find(d => d.id === selectedDebt)
    const apiKey = import.meta.env.VITE_GROQ_API_KEY

    const prompt = `You are a professional debt advisor in the UK. Write a formal, polite hardship letter from a customer to ${PROVIDERS[debt.provider] || debt.provider}.

The customer details:
- Provider: ${debt.provider}
- Item/purchase: ${debt.item}
- Amount owed: £${Number(debt.total).toFixed(2)}
- Due date: ${debt.due_date}
- Reason for difficulty: ${reason}

Write a short, professional letter requesting a payment extension of 14 days. The tone should be polite, honest, and respectful. Do not include a subject line. Start with "Dear ${PROVIDERS[debt.provider] || debt.provider}," and end with "Yours sincerely," followed by a blank line for their name. Keep it under 200 words.`

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
          max_tokens: 500,
        }),
      })

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ''
      setLetter(text)
    } catch (err) {
      setLetter('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  const copyLetter = () => {
    navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-gray-400 dark:text-slate-500 leading-relaxed">
        Generate a professional hardship letter to send to your BNPL provider requesting a payment extension.
      </p>

      {/* Which debt? */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Which debt?</p>
        {debts.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">No debts added yet. Add one from the home screen.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {debts.map(debt => {
              const color = providerColors[debt.provider] || '#9AA0B5'
              const isSelected = selectedDebt === debt.id
              return (
                <button
                  key={debt.id}
                  onClick={() => setSelectedDebt(debt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-indigo-300'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : color }}
                  />
                  {debt.provider}
                </button>
              )
            })}
          </div>
        )}
        {selectedDebt && (
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
            {(() => { const d = debts.find(x => x.id === selectedDebt); return d ? `${d.item} · £${Number(d.total).toFixed(2)}` : '' })()}
          </p>
        )}
      </div>

      {/* Reason */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Reason</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. unexpected car repair bill this month"
          rows={3}
          className="w-full text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl p-3 resize-none focus:outline-none focus:border-indigo-400 dark:placeholder-slate-500"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={generateLetter}
        disabled={!selectedDebt || !reason || loading}
        className="w-full py-3 rounded-2xl text-sm font-semibold transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Writing your letter...' : 'Generate letter'}
      </button>

      {/* Generated letter */}
      {letter && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Your letter</p>
            <button
              onClick={copyLetter}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                copied
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
              }`}
            >
              {copied ? 'Copied ✓' : 'Copy to clipboard'}
            </button>
          </div>
          <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{letter}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Review before sending — add your name and any personal details.</p>
        </div>
      )}
    </div>
  )
}

export default LetterWriter
