import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { Icon, ProviderBadge } from '../ui'
import { daysUntil, formatGBP, formatLongDate, instalmentAmount, remaining } from '../debtMath'
import { FREE_ADVICE, PROVIDER_HELP, RIGHTS_NOTE } from '../providerHelp'

const REQUESTS = [
  { id: 'more-time', label: 'More time', hint: 'Move your next payment back' },
  { id: 'pause', label: 'Pause', hint: 'A short break from payments' },
  { id: 'smaller', label: 'Smaller', hint: "Spread what's left over more payments" },
]

const REASONS = [
  { label: 'Unexpected bill', text: 'I had an unexpected bill this month' },
  { label: 'Lost income', text: "I've lost some of my income" },
  { label: 'Illness', text: "I've been unwell and couldn't work as much" },
  { label: 'Something else', text: '' },
]

const FORMATS = [
  { id: 'chat', label: 'Chat message', icon: 'message' },
  { id: 'email', label: 'Email', icon: 'mail' },
]

function Label({ children }) {
  return <p className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-2">{children}</p>
}

function MessageProvider({ debts, userName, initialDebtId, onAddDebt }) {
  const sorted = [...debts].sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date))
  const [debtId, setDebtId] = useState(() =>
    (initialDebtId && sorted.some(d => d.id === initialDebtId) ? initialDebtId : sorted[0]?.id) ?? null)
  const [request, setRequest] = useState('more-time')
  const [reason, setReason] = useState('')
  const [format, setFormat] = useState('chat')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const selectedChip = useRef(null)

  // Bring the chosen debt into view when the screen opens (it may be off to the side).
  useEffect(() => {
    selectedChip.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [])

  const debt = sorted.find(d => d.id === debtId) || null
  const help = debt ? PROVIDER_HELP[debt.provider] || PROVIDER_HELP.Other : null

  if (sorted.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-3xl p-7 text-center">
        <p className="text-[15px] font-medium text-ink">Add a debt first</p>
        <p className="text-sm text-ink-3 mt-1">Then DERA can help you write to your provider about it.</p>
        <button onClick={onAddDebt} className="mt-5 px-5 py-2.5 rounded-full bg-inverse text-on-inverse text-sm font-medium">
          Add a debt
        </button>
      </div>
    )
  }

  const write = async () => {
    if (!debt) return
    if (!reason.trim()) {
      setError("Tell your provider a little about what's happening first.")
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    const { data, error: fnError } = await supabase.functions.invoke('ai-assist', {
      body: {
        task: 'letter',
        input: {
          provider: debt.provider,
          item: debt.item,
          total: debt.total,
          remaining: remaining(debt),
          next_amount: instalmentAmount(debt),
          due_date: formatLongDate(debt.due_date),
          reason,
          request,
          format,
          name: format === 'email' ? userName : '',
        },
      },
    })
    setLoading(false)
    if (fnError || !data?.result) {
      setError("Couldn't write your message. Try again.")
      return
    }
    setMessage(String(data.result).trim())
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setError('')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Couldn't copy. Select the text and copy it instead.")
    }
  }

  const pickReason = (r) => {
    setReason(r.text)
    setError('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink tracking-tight">Message your provider</h2>
        <p className="text-sm text-ink-3 mt-1">Struggling with a payment? Ask your provider for help.</p>
      </div>

      {/* Which debt */}
      <section>
        <Label>Which debt</Label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {sorted.map(d => {
            const active = d.id === debtId
            return (
              <button
                key={d.id}
                ref={active ? selectedChip : null}
                onClick={() => { setDebtId(d.id); setMessage('') }}
                aria-pressed={active}
                className={`flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                  active ? 'bg-inverse text-on-inverse border-transparent' : 'bg-surface text-ink border-line'
                }`}
              >
                <ProviderBadge provider={d.provider} size={26} />
                <span className="font-medium">{d.provider === 'PayPal Pay in 3' ? 'PayPal' : d.provider}</span>
                <span className={active ? 'opacity-70' : 'text-ink-3'}>· {d.item}</span>
              </button>
            )
          })}
        </div>
        {debt && (
          <p className="text-xs text-ink-3 mt-2 tabular">
            Next payment {formatGBP(instalmentAmount(debt))} on {formatLongDate(debt.due_date)} · {formatGBP(remaining(debt))} left
          </p>
        )}
      </section>

      {/* What you need */}
      <section>
        <Label>What you need</Label>
        <div className="flex bg-surface-2 rounded-2xl p-1" role="radiogroup" aria-label="What you need">
          {REQUESTS.map(r => (
            <button
              key={r.id}
              role="radio"
              aria-checked={request === r.id}
              onClick={() => setRequest(r.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                request === r.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3 mt-2">{REQUESTS.find(r => r.id === request).hint}</p>
      </section>

      {/* What's happening */}
      <section>
        <Label>What's happening</Label>
        <div className="flex gap-2 flex-wrap mb-2.5">
          {REASONS.map(r => (
            <button
              key={r.label}
              onClick={() => pickReason(r)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface border border-line text-ink-2 hover:text-ink"
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          value={reason}
          onChange={e => { setReason(e.target.value); setError('') }}
          placeholder="My hours were cut this month"
          rows={3}
          maxLength={600}
          className="w-full text-[15px] text-ink bg-surface border border-line rounded-2xl p-3.5 resize-none focus:outline-none focus:border-ink-3 placeholder:text-ink-3"
        />
      </section>

      {/* Send as */}
      <section>
        <Label>Send as</Label>
        <div className="flex gap-2">
          {FORMATS.map(f => (
            <button
              key={f.id}
              onClick={() => { setFormat(f.id); setMessage('') }}
              aria-pressed={format === f.id}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium border transition-colors ${
                format === f.id ? 'bg-accent-soft text-accent border-transparent' : 'bg-surface text-ink-2 border-line'
              }`}
            >
              <Icon name={f.icon} size={16} /> {f.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p className="text-sm text-danger flex items-center gap-2" role="alert">
          <Icon name="alert" size={16} /> {error}
        </p>
      )}

      <button
        onClick={write}
        disabled={loading}
        className="w-full py-3.5 rounded-full bg-inverse text-on-inverse text-[15px] font-semibold disabled:opacity-60"
      >
        {loading ? 'Writing your message…' : message ? 'Write again' : 'Write my message'}
      </button>

      {/* Result */}
      {message && (
        <section className="flex flex-col gap-4">
          <div className="bg-surface border border-line rounded-3xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-ink">Your message</p>
              <button
                onClick={copy}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  copied ? 'bg-success-soft text-success' : 'bg-surface-2 text-ink'
                }`}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              aria-label="Your message, you can edit it"
              rows={Math.min(18, Math.max(5, Math.ceil(message.length / 36) + message.split('\n').length))}
              style={{ fieldSizing: 'content' }}
              className="w-full text-[15px] leading-relaxed text-ink bg-transparent resize-none focus:outline-none"
            />
            <p className="text-xs text-ink-3 mt-1">You can edit this before you send it.</p>
          </div>

          {/* Where to send it */}
          {help && (
            <div className="bg-surface border border-line rounded-3xl p-4 flex gap-3">
              <ProviderBadge provider={debt.provider} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">Where to send it</p>
                <p className="text-sm text-ink-2 mt-1 leading-relaxed">{help.steps}</p>
                {help.phone && (
                  <p className="text-sm text-ink-2 mt-1.5">
                    Or call <a href={`tel:${help.phone.replace(/\s/g, '')}`} className="font-medium text-ink underline underline-offset-2">{help.phone}</a>
                    {help.hours && <span className="text-ink-3"> · {help.hours}</span>}
                  </p>
                )}
                {help.link && (
                  <a href={help.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-accent mt-2">
                    {help.linkLabel} <Icon name="external" size={14} />
                  </a>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Free advice */}
      <section className="bg-success-soft rounded-3xl p-5">
        <p className="text-[15px] font-semibold text-ink">Free, confidential debt advice</p>
        <p className="text-sm text-ink-2 mt-1">If things feel hard to manage, these charities and services can help, for free.</p>
        <div className="flex flex-col gap-3 mt-4">
          {FREE_ADVICE.map(a => (
            <div key={a.name} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-ink underline underline-offset-2">{a.name}</a>
                <p className="text-xs text-ink-3 mt-0.5">{a.hours}</p>
              </div>
              <a href={`tel:${a.phone.replace(/\s/g, '')}`} className="text-sm font-medium text-ink bg-surface rounded-full px-3 py-1.5 tabular whitespace-nowrap">
                {a.phone}
              </a>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-2 mt-4 leading-relaxed">
          {RIGHTS_NOTE.text}{' '}
          <a href={RIGHTS_NOTE.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Read the FCA guidance</a>
        </p>
      </section>
    </div>
  )
}

export default MessageProvider
