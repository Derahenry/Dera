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
    <div className="flex flex-col gap-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-4">
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24" className="text-indigo-600 dark:text-indigo-400" aria-hidden="true">
            <path d="M3 10l9-6 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 mb-3">
          Coming soon
        </span>

        <p className="text-base font-semibold text-gray-900 dark:text-white">Connect your bank</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mt-1.5 max-w-[300px]">
          Connect your bank and DERA will spot your BNPL payments automatically.
        </p>

        <ul className="mt-5 w-full flex flex-col gap-2.5 text-left">
          {BENEFITS.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-slate-300">
              <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-px">✓</span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 px-1">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" className="text-gray-300 dark:text-slate-600 flex-shrink-0 mt-0.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
          Read-only access only. DERA can never move or modify your money.
        </p>
      </div>
    </div>
  )
}

export default OpenBanking
