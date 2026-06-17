import { useState } from 'react'

const PROVIDERS = {
  'Klarna': 'Klarna Bank AB',
  'Clearpay': 'Clearpay Finance Limited',
  'PayPal Pay in 3': 'PayPal Credit',
  'Zilch': 'Zilch Technology Limited',
  'Other': 'the creditor',
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

    const prompt = `You are a professional debt advisor in the UK. Write a formal, polite hardship letter from a customer to ${PROVIDERS[debt.provider] || debt.provider}. 

The customer details:
- Provider: ${debt.provider}
- Item/purchase: ${debt.item}
- Amount owed: £${Number(debt.total).toFixed(2)}
- Due date: ${debt.due_date}
- Reason for difficulty: ${reason}

Write a short, professional letter requesting a payment extension of 14 days. The tone should be polite, honest, and respectful. Do not include a subject line. Start with "Dear ${PROVIDERS[debt.provider] || debt.provider}," and end with "Yours sincerely," followed by a blank line for their name. Keep it under 200 words.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-medium text-gray-900">AI Letter Writer</h2>
        <p className="text-gray-500 text-sm mt-1">Generate a professional hardship letter to send to your creditor.</p>
      </div>

      {/* Step 1 — pick debt */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-900">1. Which debt do you need help with?</p>
        {debts.length === 0 ? (
          <p className="text-sm text-gray-400">No debts added yet. Add a debt from the dashboard first.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {debts.map(debt => (
              <button
                key={debt.id}
                onClick={() => setSelectedDebt(debt.id)}
                className={`text-left p-3 rounded-xl border text-sm transition-colors ${
                  selectedDebt === debt.id
                    ? 'border-purple-600 bg-purple-50 text-purple-900'
                    : 'border-gray-100 text-gray-700 hover:border-gray-200'
                }`}
              >
                <span className="font-medium">{debt.provider}</span> — {debt.item}
                <span className="text-gray-400 ml-2">£{Number(debt.total).toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 — reason */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-900">2. Briefly explain why you need more time</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. unexpected car repair bill this month"
          rows={3}
          className="w-full text-sm text-gray-700 border border-gray-100 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-100"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={generateLetter}
        disabled={!selectedDebt || !reason || loading}
        className={`w-full py-3 rounded-2xl text-sm font-medium transition-colors ${
          !selectedDebt || !reason || loading
            ? 'bg-gray-100 text-gray-400'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {loading ? 'Writing your letter...' : 'Generate letter'}
      </button>

      {/* Generated letter */}
      {letter && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Your letter</p>
            <button
              onClick={copyLetter}
              className="text-xs text-purple-600 font-medium"
            >
              {copied ? 'Copied!' : 'Copy letter'}
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{letter}</p>
          <p className="text-xs text-gray-400">Review the letter before sending. You can edit it to add your name and any personal details.</p>
        </div>
      )}
    </div>
  )
}

export default LetterWriter