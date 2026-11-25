// Open banking isn't built yet: this card explains what's coming instead of
// showing a connect flow that doesn't work. The earlier TrueLayer redirect code
// is in git history (commit 1b3c713) for when the real integration is built.

const BENEFITS = [
  'Spot Klarna, Clearpay, PayPal and Zilch payments automatically',
  'Mark instalments as paid when they leave your account',
  'No more typing debts in by hand',
]

function OpenBanking() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="bg-surface border border-line rounded-3xl p-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-inverse text-on-inverse flex items-center justify-center mb-4">
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 10l9-6 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-ink mb-3">
          Coming soon
        </span>

        <p className="text-xl font-semibold text-ink tracking-tight">Connect your bank</p>
        <p className="text-sm text-ink-3 leading-relaxed mt-1.5 max-w-[300px]">
          Connect your bank and DERA will spot your BNPL payments automatically.
        </p>

        <ul className="mt-5 w-full flex flex-col gap-2.5 text-left">
          {BENEFITS.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-ink-2">
              <span className="w-5 h-5 rounded-full bg-success-soft text-success flex items-center justify-center text-xs font-bold flex-shrink-0 mt-px">✓</span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 px-1">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" className="text-ink-3 flex-shrink-0 mt-0.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p className="text-xs text-ink-3 leading-relaxed">
          Read-only access only. DERA can never move or modify your money.
        </p>
      </div>
    </div>
  )
}

export default OpenBanking
