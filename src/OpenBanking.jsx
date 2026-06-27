import { useState, useEffect } from 'react'

const BANKS = [
  { name: 'Barclays',  color: '#00AEEF', bg: '#e0f6ff' },
  { name: 'HSBC',      color: '#DB0011', bg: '#ffe0e2' },
  { name: 'Lloyds',    color: '#006A4D', bg: '#e0f4ef' },
  { name: 'NatWest',   color: '#6B2D8B', bg: '#f0e6f7' },
  { name: 'Monzo',     color: '#FF5A5F', bg: '#ffe8e8' },
  { name: 'Starling',  color: '#00B4AD', bg: '#e0f7f6' },
]

function OpenBanking() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('code')) {
      setConnected(true)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const handleConnect = (bankName) => {
    setConnecting(bankName)
    const authUrl = `https://auth.truelayer-sandbox.com/?response_type=code&client_id=${import.meta.env.VITE_TRUELAYER_CLIENT_ID}&scope=accounts%20transactions%20balance&redirect_uri=https://dera-alpha.vercel.app/callback&providers=uk-ob-all%20uk-oauth-all`
    window.location.href = authUrl
  }

  if (connected) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" className="text-green-600 dark:text-green-400">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-900 dark:text-white">Bank connected successfully!</p>
        <p className="text-sm text-gray-400 dark:text-slate-500 leading-relaxed max-w-[280px]">
          We're scanning your transactions for BNPL payments. This may take a moment.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Connect your bank</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
          Automatically detect your BNPL payments — no manual entry needed
        </p>
      </div>

      {/* Bank list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm divide-y divide-gray-50 dark:divide-slate-700/60">
        {BANKS.map((bank) => (
          <div key={bank.name} className="flex items-center gap-3 px-4 py-3.5">
            {/* Coloured initial circle */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ backgroundColor: bank.bg, color: bank.color }}
            >
              {bank.name[0]}
            </div>

            <p className="flex-1 text-sm font-medium text-gray-800 dark:text-white">{bank.name}</p>

            <button
              onClick={() => handleConnect(bank.name)}
              disabled={connecting !== null}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting === bank.name ? 'Redirecting…' : 'Connect'}
            </button>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 px-1">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" className="text-gray-300 dark:text-slate-600 flex-shrink-0 mt-0.5">
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
