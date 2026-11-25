import { Icon, ProviderBadge } from './ui'
import { formatGBP, formatShortDate, isValidDateString } from './debtMath'
import { isComplete } from './pendingPurchases'

// A purchase DERA detected, waiting for the user: Add, Edit or Ignore.
function DetectedCard({ purchase, duplicate, busy, onAdd, onEdit, onIgnore, index = 0 }) {
  const complete = isComplete(purchase)
  const provider = purchase.provider || 'BNPL'
  const parts = [
    purchase.item,
    purchase.total != null && (
      purchase.instalments ? `${formatGBP(purchase.total)} in ${purchase.instalments} payments` : formatGBP(purchase.total)
    ),
    isValidDateString(purchase.due_date || '') && `next payment ${formatShortDate(purchase.due_date)}`,
  ].filter(Boolean)

  return (
    <div className="fade-up bg-surface border border-line rounded-3xl p-4" style={{ animationDelay: `${index * 45}ms` }}>
      <div className="flex items-start gap-3">
        <ProviderBadge provider={purchase.provider} />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-ink">New {provider} purchase detected</p>
          <p className="text-sm text-ink-2 mt-0.5 break-words">{parts.join(' · ') || 'Some details could not be read'}</p>
        </div>
      </div>

      {duplicate && (
        <p className="mt-3 text-xs text-ink-2 bg-surface-2 rounded-xl px-3 py-2 flex items-center gap-2">
          <Icon name="alert" size={14} className="flex-shrink-0" /> Looks like you already have this in DERA.
        </p>
      )}
      {!complete && (
        <p className="mt-3 text-xs text-ink-2 bg-surface-2 rounded-xl px-3 py-2 flex items-center gap-2">
          <Icon name="alert" size={14} className="flex-shrink-0" /> Some details are missing. Check them before adding.
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={onIgnore}
          disabled={busy}
          className="press flex-1 py-2.5 rounded-full bg-surface-2 text-ink-2 text-sm font-semibold disabled:opacity-50"
        >
          Ignore
        </button>
        {complete && (
          <button
            onClick={onEdit}
            disabled={busy}
            className="press flex-1 py-2.5 rounded-full bg-surface-2 text-ink text-sm font-semibold disabled:opacity-50"
          >
            Edit
          </button>
        )}
        <button
          onClick={complete ? onAdd : onEdit}
          disabled={busy}
          className="press flex-1 py-2.5 rounded-full bg-inverse text-on-inverse text-sm font-semibold disabled:opacity-50"
        >
          {busy ? 'Saving…' : complete ? 'Add' : 'Check details'}
        </button>
      </div>
    </div>
  )
}

export default DetectedCard
