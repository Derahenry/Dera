// Shared building blocks for DERA's monochrome design.
import { useEffect } from 'react'

// ── Icons (stroke icons, inherit text colour) ───────────────────────────────
const ICON_PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
  message: <path d="M5 18.5l-1.5 3 4-1.6c1.3.6 2.9 1.1 4.5 1.1 4.7 0 8.5-3.4 8.5-7.5S16.7 6 12 6s-8.5 3.4-8.5 7.5c0 1.8.5 3.5 1.5 5z" />,
  home: <><path d="M4 10.5L12 4l8 6.5" /><path d="M6 9v10.5h12V9" /></>,
  chart: <><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" /><path d="M12 3.5V12h8.5A8.5 8.5 0 0 0 12 3.5z" /></>,
  tools: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.6 6.6a2.1 2.1 0 0 1-3-3l6.6-6.6a6 6 0 0 1 7.9-7.9z" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  edit: <><path d="M12 20h8" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  trash: <><path d="M4 7h16M9 7V4.5h6V7M18 7l-1 13H7L6 7" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M4 7.5l8 5.5 8-5.5" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></>,
}

export function Icon({ name, size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  )
}

// ── Provider badge: round monogram in the provider's colour ─────────────────
const PROVIDER_STYLE = {
  'Klarna': { bg: '#FFE3EE', fg: '#B0305F', darkBg: '#3A1D2A', darkFg: '#FF9CC0' },
  'Clearpay': { bg: '#DDF6EE', fg: '#0B7356', darkBg: '#10302A', darkFg: '#6FE3C1' },
  'PayPal Pay in 3': { bg: '#E1ECFD', fg: '#1A56B8', darkBg: '#14233F', darkFg: '#8DB6FF' },
  'Zilch': { bg: '#ECE8FF', fg: '#5B45D6', darkBg: '#231F42', darkFg: '#B3A6FF' },
  'Other': { bg: '#EDEDF0', fg: '#5B5D66', darkBg: '#24242B', darkFg: '#A3A5AE' },
}

export function ProviderBadge({ provider, size = 40 }) {
  const s = PROVIDER_STYLE[provider] || PROVIDER_STYLE.Other
  const letter = (provider || '?')[0].toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0 provider-badge"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        '--pb-bg': s.bg, '--pb-fg': s.fg, '--pb-dark-bg': s.darkBg, '--pb-dark-fg': s.darkFg,
      }}
      aria-hidden="true"
    >
      {letter}
    </div>
  )
}

// ── Money: big pounds, smaller lighter pence ────────────────────────────────
export function Money({ amount, className = '', penceClassName = 'opacity-50' }) {
  const [pounds, pence] = Number(amount || 0).toFixed(2).split('.')
  const withCommas = Number(pounds).toLocaleString('en-GB')
  return (
    <span className={`tabular ${className}`}>
      £{withCommas}<span className={penceClassName} style={{ fontSize: '0.55em' }}>.{pence}</span>
    </span>
  )
}

// ── Round quick-action button ───────────────────────────────────────────────
export function ActionButton({ icon, label, onClick, primary = false }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <span
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform group-active:scale-95 ${
          primary ? 'bg-inverse text-on-inverse' : 'bg-surface text-ink border border-line'
        }`}
      >
        <Icon name={icon} size={22} />
      </span>
      <span className="text-xs font-medium text-ink-2">{label}</span>
    </button>
  )
}

// ── Sign-in layout: black hero with the wordmark, form on a sheet below ─────
export function AuthShell({ title, sub, children }) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="px-6 pt-14 pb-10 text-white max-w-lg w-full mx-auto">
        <p className="text-2xl font-black tracking-[-0.04em] fade-up">DERA</p>
        <h1 className="mt-10 text-[34px] leading-[1.05] font-black tracking-tight fade-up" style={{ animationDelay: '60ms' }}>
          {title}
        </h1>
        {sub && <p className="mt-3 text-[15px] text-white/60 fade-up" style={{ animationDelay: '120ms' }}>{sub}</p>}
      </div>
      <div className="flex-1 bg-surface rounded-t-[32px] sheet-panel">
        <div className="max-w-lg mx-auto px-6 pt-8 pb-10">{children}</div>
      </div>
    </div>
  )
}

// ── Bottom sheet: slides up, closes on backdrop tap or Escape ───────────────
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="sheet-backdrop absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-panel relative w-full max-w-lg bg-surface rounded-t-[28px] px-5 pt-3 pb-8 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1.5 rounded-full bg-surface-2 mx-auto mb-4" />
        {title && <p className="text-lg font-semibold text-ink mb-4">{title}</p>}
        {children}
      </div>
    </div>
  )
}

// ── Floating pill bottom bar with a centre add button ───────────────────────
const NAV = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar' },
  { id: 'add', icon: 'plus', label: 'Add a debt' },
  { id: 'insights', icon: 'chart', label: 'Insights' },
  { id: 'tools', icon: 'tools', label: 'Tools' },
]

export function BottomNav({ active, onNavigate, onAdd }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" aria-label="Main">
      <div className="mx-auto max-w-lg px-6 pb-6 flex justify-center">
        <div className="nav-pill pointer-events-auto rounded-full px-3 py-2 flex items-center gap-1">
          {NAV.map(item => {
            if (item.id === 'add') {
              return (
                <button
                  key={item.id}
                  onClick={onAdd}
                  aria-label={item.label}
                  className="w-12 h-12 mx-1 rounded-full bg-inverse text-on-inverse flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Icon name="plus" size={22} />
                </button>
              )
            }
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-12 h-12 rounded-full flex flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                <Icon name={item.icon} size={22} />
                <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-ink' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
