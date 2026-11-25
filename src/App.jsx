import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import ResetPassword from './ResetPassword'
import AddDebt from './AddDebt'
import LetterWriter from './LetterWriter'
import EmailParser from './EmailParser'
import Benchmarking from './Benchmarking'
import OpenBanking from './OpenBanking'
import PaymentPlan from './PaymentPlan'
import Home from './screens/Home'
import { BottomNav } from './ui'
import {
  daysUntil, dueLabel, formatGBP, instalmentAmount, isPaidOff, nextDueDate,
  paidCount, parseDate, progress,
} from './debtMath'

const providerColors = {
  'Klarna': '#FF7DA8',
  'Clearpay': '#1EC9A0',
  'PayPal Pay in 3': '#1E73E8',
  'Zilch': '#7C5CFC',
  'Other': '#9AA0B5',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 18) return 'Good afternoon,'
  return 'Good evening,'
}

function App() {
  const [session, setSession] = useState(null)
  // True after opening a password-reset link from email; shows the "Set a new password" screen.
  const [recovering, setRecovering] = useState(() => window.location.hash.includes('type=recovery'))
  const [debts, setDebts] = useState([])
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [toolsTab, setToolsTab] = useState('letter')
  const [confirmDelete, setConfirmDelete] = useState({ show: false, debtId: null, debtName: '' })
  const [editingDebt, setEditingDebt] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [paymentToast, setPaymentToast] = useState(null) // { debt (before), message, error }
  const paymentToastTimer = useRef(null)
  const [payingId, setPayingId] = useState(null)
  // 'system' follows the phone. Only a choice the user makes in Settings is saved
  // (the old 'dera-theme' key was written automatically, so it isn't read).
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem('dera-theme-choice') || 'system' } catch { return 'system' }
  })
  const setTheme = (update) => {
    setThemeState(prev => {
      const next = typeof update === 'function' ? update(prev) : update
      try { localStorage.setItem('dera-theme-choice', next) } catch { /* not saved, still applied */ }
      return next
    })
  }
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('dera-onboarded'))
  const [onboardingSlide, setOnboardingSlide] = useState(0)
  const onboardingTouchStart = useRef(null)
  const [showSplash, setShowSplash] = useState(true)
  const [splashFading, setSplashFading] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#08080A' : '#F4F4F6')
    }
    apply()
    // Follow the phone live when it switches between light and dark.
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 2200)
    const hideTimer = setTimeout(() => setShowSplash(false), 2700)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return

    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem('dera-last-notif-check') === today) return

    navigator.serviceWorker.register('/sw.js').catch(() => {})

    Notification.requestPermission().then(permission => {
      if (permission !== 'granted') return

      localStorage.setItem('dera-last-notif-check', today)

      supabase
        .from('debts')
        .select('*')
        .then(({ data }) => {
          if (!data) return

          data.filter(debt => !isPaidOff(debt)).forEach(debt => {
            const days = daysUntil(debt.due_date)
            const amount = formatGBP(instalmentAmount(debt))

            if (days === 0) {
              new Notification('Payment due today', {
                body: `Your ${debt.provider} payment of ${amount} is due today — don't miss it`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
              })
            } else if (days > 0 && days <= 3) {
              new Notification('Payment due soon', {
                body: `Your ${debt.provider} payment of ${amount} is due in ${days} day${days === 1 ? '' : 's'}`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
              })
            }
          })
        })
    })
  }, [session])

  const fetchDebts = async () => {
    setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('due_date', { ascending: true })
    if (error) {
      setFetchError('Check your connection and try again.')
    } else {
      setDebts(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Loading data from Supabase when the user signs in is the job of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) fetchDebts()
  }, [session])

  const deleteDebt = async () => {
    setDeleteError('')
    const { error } = await supabase.from('debts').delete().eq('id', confirmDelete.debtId)
    if (error) {
      setDeleteError('Could not remove this debt. Please check your connection and try again.')
      return
    }
    fetchDebts()
    setConfirmDelete({ show: false, debtId: null, debtName: '' })
  }

  const closeDeleteModal = () => {
    setDeleteError('')
    setConfirmDelete({ show: false, debtId: null, debtName: '' })
  }

  const showPaymentToast = (toast) => {
    clearTimeout(paymentToastTimer.current)
    setPaymentToast(toast)
    paymentToastTimer.current = setTimeout(() => setPaymentToast(null), 6000)
  }

  // Record one instalment as paid and move the due date on to the next one.
  const markPaid = async (debt) => {
    if (isPaidOff(debt) || payingId) return
    setPayingId(debt.id)
    const newPaid = paidCount(debt) + 1
    const finished = newPaid >= debt.instalments
    const update = {
      paid: newPaid,
      due_date: finished ? debt.due_date : nextDueDate(debt.due_date, debt.frequency),
    }
    const { error } = await supabase.from('debts').update(update).eq('id', debt.id)
    setPayingId(null)
    if (error) {
      showPaymentToast({ error: 'Could not record the payment. Please try again.' })
      return
    }
    await fetchDebts()
    showPaymentToast({
      debt,
      message: finished
        ? `${debt.item} is paid off 🎉`
        : `Payment recorded · ${newPaid}/${debt.instalments} paid`,
    })
  }

  const undoPayment = async () => {
    const before = paymentToast?.debt
    if (!before) return
    clearTimeout(paymentToastTimer.current)
    setPaymentToast(null)
    const { error } = await supabase
      .from('debts')
      .update({ paid: before.paid, due_date: before.due_date })
      .eq('id', before.id)
    if (error) {
      showPaymentToast({ error: 'Could not undo. Edit the debt to fix it.' })
      return
    }
    fetchDebts()
  }

  const completeOnboarding = () => {
    localStorage.setItem('dera-onboarded', 'true')
    setShowOnboarding(false)
  }

  // Receives a debt already checked by validateDebt in EmailParser. Returns an error message or null.
  const handleParsedDebt = async (debt) => {
    const { error } = await supabase.from('debts').insert([{
      ...debt,
      status: 'on-track',
      user_id: session.user.id,
    }])
    if (error) return 'Could not save this debt. Please try again.'
    fetchDebts()
    setActiveTab('home')
    return null
  }

  // Active debts still have instalments to pay; paid-off ones are kept for the "Paid off" section.
  const activeDebts = debts.filter(d => !isPaidOff(d))
  const paidOffDebts = debts.filter(d => isPaidOff(d))

  // Wellbeing score (shared between home mini card and insights tab)
  const overdueCount = activeDebts.filter(d => daysUntil(d.due_date) < 0).length
  const dueSoon3Count = activeDebts.filter(d => { const days = daysUntil(d.due_date); return days >= 0 && days <= 3 }).length
  const timelinessScore = Math.max(0, 100 - overdueCount * 40 - dueSoon3Count * 10)
  const debtLoadScore = Math.max(0, 100 - activeDebts.length * 10)
  const repaymentScore = debts.length > 0
    ? Math.round(debts.reduce((s, d) => s + progress(d), 0) / debts.length)
    : 100
  const wellbeingScore = Math.round((timelinessScore + debtLoadScore + repaymentScore) / 3)
  const wellbeingColor = wellbeingScore >= 70 ? '#16A34A' : wellbeingScore >= 40 ? '#D97706' : '#DC2626'
  const wellbeingLabel = wellbeingScore >= 70 ? 'Looking good' : wellbeingScore >= 40 ? 'Doing okay' : 'Needs attention'

  // Risk banner
  const atRiskDebts = activeDebts
    .map(d => ({ ...d, days: daysUntil(d.due_date) }))
    .filter(d => d.days <= 3)
    .sort((a, b) => a.days - b.days)

  const userInitial = session?.user?.email?.[0]?.toUpperCase() || 'A'

  if (showSplash) return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: document.documentElement.classList.contains('dark')
          ? '#0F172A'
          : 'linear-gradient(160deg, #f0efff 0%, #f8f7ff 40%, #ffffff 100%)',
        opacity: splashFading ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      <p style={{ fontSize: 48, fontWeight: 700, color: '#4F46E5', letterSpacing: '-1px', lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
        DERA
      </p>
      <div
        className="mt-6 rounded-full overflow-hidden"
        style={{ width: 80, height: 3, background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#e0e7ff' }}
      >
        <div className="h-full rounded-full splash-bar" style={{ background: '#4F46E5' }} />
      </div>
    </div>
  )

  if (recovering && session) {
    return (
      <ResetPassword
        onDone={() => {
          setRecovering(false)
          window.history.replaceState({}, '', window.location.pathname)
        }}
      />
    )
  }

  if (!session) return <Auth />

  if (showOnboarding) {
    const obSlides = [
      {
        graphic: (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-600" />
              <span className="text-5xl font-bold text-indigo-600 tracking-tight">DERA</span>
            </div>
            <div className="flex gap-2 mt-2">
              {['Klarna', 'Clearpay', 'Zilch'].map(p => (
                <span key={p} className="text-xs px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 shadow-sm border border-gray-100 dark:border-slate-700">{p}</span>
              ))}
            </div>
          </div>
        ),
        headline: 'Your BNPL debt,\nall in one place',
        sub: 'Track Klarna, Clearpay, PayPal and more — without the stress.',
      },
      {
        graphic: (
          <div className="w-24 h-24 rounded-3xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <svg width="44" height="44" fill="none" viewBox="0 0 24 24" className="text-indigo-600">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
        ),
        headline: "Know what's\ncoming",
        sub: 'See every payment due date in one calendar and get ahead of missed payments.',
      },
      {
        graphic: (
          <div className="w-24 h-24 rounded-3xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <svg width="44" height="44" fill="none" viewBox="0 0 24 24" className="text-indigo-600">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ),
        headline: 'Ready to take\ncontrol?',
        sub: 'Add your first debt in seconds and see your full picture instantly.',
      },
    ]

    return (
      <div className="min-h-screen app-bg flex flex-col">
        {/* Skip */}
        <div className="flex justify-end items-center px-6 pt-12 h-16 flex-shrink-0">
          {onboardingSlide < 2 && (
            <button
              onClick={completeOnboarding}
              className="text-sm text-gray-400 dark:text-slate-500 font-medium hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        {/* Slides */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${onboardingSlide * 100}%)` }}
            onTouchStart={e => { onboardingTouchStart.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              if (onboardingTouchStart.current === null) return
              const delta = onboardingTouchStart.current - e.changedTouches[0].clientX
              if (delta > 50 && onboardingSlide < 2) setOnboardingSlide(s => s + 1)
              if (delta < -50 && onboardingSlide > 0) setOnboardingSlide(s => s - 1)
              onboardingTouchStart.current = null
            }}
          >
            {obSlides.map((slide, i) => (
              <div key={i} className="min-w-full h-full flex flex-col items-center justify-center px-10 text-center">
                <div className="mb-10">{slide.graphic}</div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight whitespace-pre-line mb-4">
                  {slide.headline}
                </h1>
                <p className="text-base text-gray-500 dark:text-slate-400 leading-relaxed max-w-xs">
                  {slide.sub}
                </p>
                {i === 2 && (
                  <button
                    onClick={completeOnboarding}
                    className="mt-12 w-full max-w-xs py-4 bg-indigo-600 text-white rounded-2xl text-base font-semibold hover:bg-indigo-700 transition-colors"
                    style={{ boxShadow: '0 4px 24px rgba(99,102,241,0.4)' }}
                  >
                    Get started
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dots + Next */}
        <div className="flex-shrink-0 flex flex-col items-center gap-5 py-10">
          <div className="flex items-center gap-2">
            {obSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setOnboardingSlide(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === onboardingSlide
                    ? 'w-6 h-2 bg-indigo-600'
                    : 'w-2 h-2 bg-gray-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
          {onboardingSlide < 2 && (
            <button
              onClick={() => setOnboardingSlide(s => s + 1)}
              className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md"
            >
              Next
            </button>
          )}
        </div>
      </div>
    )
  }

  const firstName = (session?.user?.user_metadata?.full_name || '').trim().split(/\s+/)[0]

  return (
    <div className="min-h-screen pb-32 app-bg">

      {/* Top header */}
      <header className="max-w-lg mx-auto px-5 pt-12 pb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-3">{getGreeting()}</p>
          <p className="text-2xl font-semibold text-ink tracking-tight">{firstName || 'Welcome'}</p>
        </div>
        <button
          onClick={() => setActiveTab('settings')}
          aria-label="Account and settings"
          className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold transition-shadow ${
            activeTab === 'settings' ? 'bg-inverse text-on-inverse ring-4 ring-accent-soft' : 'bg-inverse text-on-inverse'
          }`}
        >
          {userInitial}
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4">

        {activeTab === 'home' && (
          <Home
            activeDebts={activeDebts}
            paidOffDebts={paidOffDebts}
            loading={loading}
            fetchError={fetchError}
            onRetry={fetchDebts}
            onAdd={() => setShowAddDebt(true)}
            onEdit={debt => setEditingDebt(debt)}
            onDelete={debt => setConfirmDelete({ show: true, debtId: debt.id, debtName: `${debt.provider} — ${debt.item}` })}
            onMarkPaid={markPaid}
            payingId={payingId}
            wellbeing={{ score: wellbeingScore, color: wellbeingColor, label: wellbeingLabel }}
            onNavigate={tab => { setActiveTab(tab); window.scrollTo(0, 0) }}
          />
        )}

        {/* ── CALENDAR ─────────────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <div className="mt-2">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Payments</h2>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">
                Next {activeDebts.length} payment{activeDebts.length !== 1 ? 's' : ''} · {formatGBP(activeDebts.reduce((s, d) => s + instalmentAmount(d), 0))}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-slate-600 border-t-indigo-600 animate-spin" />
              </div>
            ) : activeDebts.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-slate-700">
                <p className="text-gray-400 dark:text-slate-500 text-sm">No upcoming payments</p>
                <p className="text-gray-300 dark:text-slate-600 text-xs mt-1">Add a debt to see your schedule</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[...activeDebts].sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date)).map(debt => {
                  const color = providerColors[debt.provider] || '#9AA0B5'
                  const days = daysUntil(debt.due_date)
                  const urgency = days < 0 ? 'overdue' : days <= 3 ? 'due-soon' : days <= 14 ? 'upcoming' : 'on-track'

                  const dateBlockColors = {
                    'overdue':  { bg: '#FEE2E2', text: '#DC2626' },
                    'due-soon': { bg: '#FEE2E2', text: '#DC2626' },
                    'upcoming': { bg: '#FEF3C7', text: '#D97706' },
                    'on-track': { bg: '#DCFCE7', text: '#16A34A' },
                  }[urgency]

                  const darkDateBlockColors = {
                    'overdue':  'bg-red-900/30 text-red-400',
                    'due-soon': 'bg-red-900/30 text-red-400',
                    'upcoming': 'bg-amber-900/30 text-amber-400',
                    'on-track': 'bg-green-900/30 text-green-400',
                  }[urgency]

                  const dueText = dueLabel(days)

                  const dueLabelColor = days <= 0 ? '#EF4444' : days <= 3 ? '#EF4444' : days <= 14 ? '#F59E0B' : '#9AA0B5'

                  const due = parseDate(debt.due_date)
                  const month = due.toLocaleString('en-GB', { month: 'short' }).toUpperCase()
                  const day = due.getDate()

                  return (
                    <div key={debt.id} className="flex gap-3 items-stretch">
                      {/* Date block */}
                      <div
                        className={`w-[54px] flex-shrink-0 rounded-2xl flex flex-col items-center justify-center dark:hidden`}
                        style={{ backgroundColor: dateBlockColors.bg }}
                      >
                        <span className="text-[10px] font-bold tracking-widest" style={{ color: dateBlockColors.text }}>{month}</span>
                        <span className="text-2xl font-bold leading-tight" style={{ color: dateBlockColors.text }}>{day}</span>
                      </div>
                      <div className={`w-[54px] flex-shrink-0 rounded-2xl flex-col items-center justify-center hidden dark:flex ${darkDateBlockColors}`}>
                        <span className="text-[10px] font-bold tracking-widest">{month}</span>
                        <span className="text-2xl font-bold leading-tight">{day}</span>
                      </div>

                      {/* Payment card */}
                      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm px-4 py-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{debt.provider}</p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{formatGBP(instalmentAmount(debt))}</p>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-slate-500 pl-4 mb-2 truncate">{debt.item} · payment {paidCount(debt) + 1} of {debt.instalments}</p>
                        <p className="text-xs font-semibold pl-4" style={{ color: dueLabelColor }}>{dueText}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── INSIGHTS ─────────────────────────────────────────── */}
        {activeTab === 'insights' && (
          <div className="mt-2 flex flex-col gap-4 pb-2">

            {/* Risk alert banner */}
            <div className={`rounded-2xl p-4 flex items-center gap-4 ${atRiskDebts.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold ${atRiskDebts.length > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'}`}>
                {atRiskDebts.length > 0 ? '!' : '✓'}
              </div>
              <div>
                <p className={`text-sm font-bold ${atRiskDebts.length > 0 ? 'text-red-800 dark:text-red-300' : 'text-green-800 dark:text-green-300'}`}>
                  {atRiskDebts.length > 0
                    ? `${atRiskDebts.length} payment${atRiskDebts.length > 1 ? 's' : ''} need${atRiskDebts.length === 1 ? 's' : ''} attention`
                    : "You're on track"}
                </p>
                <p className={`text-xs mt-0.5 ${atRiskDebts.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {atRiskDebts.length > 0
                    ? (() => { const d = atRiskDebts[0]; const dl = d.days < 0 ? `${Math.abs(d.days)}d overdue` : d.days === 0 ? 'due today' : `${d.days} day${d.days === 1 ? '' : 's'} left`; return `${d.provider} — ${d.item}: ${dl}` })()
                    : 'No payments due in the next 3 days.'}
                </p>
              </div>
            </div>

            {/* Wellbeing score ring */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Wellbeing score</p>
              <div className="relative" style={{ width: 160, height: 160 }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" className="score-track" strokeWidth="10" />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke={wellbeingColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="440"
                    className="score-ring-animate"
                    style={{ '--score-dashoffset': 440 * (1 - wellbeingScore / 100) }}
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{wellbeingScore}</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">out of 100</span>
                </div>
              </div>
              <p className="text-sm font-semibold mt-4" style={{ color: wellbeingColor }}>{wellbeingLabel}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 text-center mt-1.5 max-w-[260px] leading-relaxed">
                Based on payment timing, debt load and repayment progress.
              </p>
            </div>

            {/* Factor breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Score breakdown</p>
              {[
                { label: 'Payment timeliness', score: timelinessScore },
                { label: 'Debt load', score: debtLoadScore },
                { label: 'Repayment progress', score: repaymentScore },
              ].map(({ label, score }) => {
                const fc = score >= 70 ? '#16A34A' : score >= 40 ? '#D97706' : '#DC2626'
                return (
                  <div key={label} className="mb-4 last:mb-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-xs text-gray-600 dark:text-slate-400">{label}</p>
                      <p className="text-xs font-bold" style={{ color: fc }}>{score}</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: fc }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <PaymentPlan debts={activeDebts} providerColors={providerColors} />

            <Benchmarking debts={debts} />

          </div>
        )}

        {/* ── TOOLS ────────────────────────────────────────────── */}
        {activeTab === 'tools' && (
          <div className="mt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tools</h2>

            {/* Segmented pill switcher */}
            <div className="p-1 bg-gray-100 dark:bg-slate-700 rounded-[14px] flex mb-5">
              {[{ id: 'letter', label: 'Letter writer' }, { id: 'email', label: 'Email parser' }, { id: 'banking', label: 'Open Banking' }].map(t => (
                <button
                  key={t.id}
                  onClick={() => setToolsTab(t.id)}
                  className={`flex-1 py-2 text-sm font-medium rounded-[10px] transition-all duration-200 ${
                    toolsTab === t.id
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {toolsTab === 'letter' && <LetterWriter debts={debts} />}
            {toolsTab === 'email' && <EmailParser onDebtParsed={handleParsedDebt} onEditParsed={debt => setEditingDebt(debt)} />}
            {toolsTab === 'banking' && <OpenBanking />}
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="mt-2 flex flex-col gap-5 pb-2">

            {/* Profile card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 flex items-center gap-4">
              <div className="w-[54px] h-[54px] rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate" style={{ fontSize: 17, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {session?.user?.user_metadata?.full_name || 'Your account'}
                </p>
                <p className="text-sm text-gray-400 dark:text-slate-400 mt-0.5 truncate">{session?.user?.email}</p>
              </div>
            </div>

            {/* Appearance */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">Appearance</p>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Appearance</p>
                    <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                      {theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System default'}
                    </p>
                  </div>
                  <button
                    onClick={() => setTheme(t => t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light')}
                    className="relative w-24 h-8 rounded-full transition-colors duration-300 flex items-center px-1"
                    style={{ background: theme === 'light' ? '#f3f4f6' : theme === 'dark' ? '#312e81' : '#1e293b' }}
                    aria-label="Toggle theme"
                  >
                    {[
                      { icon: <svg width="11" height="11" fill="none" viewBox="0 0 24 24" className="text-amber-400"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>, pos: '16px' },
                      { icon: <svg width="11" height="11" fill="none" viewBox="0 0 24 24" className="text-indigo-400"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/></svg>, pos: '50%' },
                      { icon: <svg width="11" height="11" fill="none" viewBox="0 0 24 24" className="text-slate-400"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>, pos: 'calc(100% - 16px)' },
                    ].map(({ icon, pos }, i) => (
                      <span key={i} className="absolute pointer-events-none select-none flex items-center justify-center opacity-50" style={{ left: pos, transform: 'translateX(-50%)' }}>
                        {icon}
                      </span>
                    ))}
                    <span
                      className="relative z-10 w-6 h-6 rounded-full shadow-md flex items-center justify-center transition-transform duration-300 bg-white"
                      style={{ transform: theme === 'light' ? 'translateX(0px)' : theme === 'dark' ? 'translateX(32px)' : 'translateX(64px)' }}
                    >
                      {theme === 'light' && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="text-amber-500"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
                      {theme === 'dark' && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="text-indigo-500"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/></svg>}
                      {theme === 'system' && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="text-slate-500"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">Preferences</p>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm divide-y divide-gray-50 dark:divide-slate-700">
                {[
                  { label: 'Notifications', value: 'On' },
                  { label: 'Currency', value: 'GBP £' },
                  { label: 'Linked providers', value: '4' },
                  { label: 'Privacy and data', value: null },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3.5 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                    <div className="flex items-center gap-1.5">
                      {value && <span className="text-sm text-gray-400 dark:text-slate-500">{value}</span>}
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" className="text-gray-300 dark:text-slate-600">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign out + caption */}
            <div className="flex flex-col items-center gap-3 pt-2 pb-4">
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
              >
                Sign out
              </button>
              <p className="text-xs text-gray-300 dark:text-slate-600">DERA v1.0 · Built with care for students</p>
            </div>

          </div>
        )}

      </main>

      <BottomNav
        active={activeTab}
        onNavigate={tab => { setActiveTab(tab); window.scrollTo(0, 0) }}
        onAdd={() => setShowAddDebt(true)}
      />

      {/* Confirm delete modal */}
      {confirmDelete.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={closeDeleteModal}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-red-500">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center">Remove debt?</h2>

            <p className="text-sm text-gray-400 dark:text-slate-400 text-center mt-2 leading-relaxed">
              This will remove <span className="text-gray-600 dark:text-slate-300 font-medium">{confirmDelete.debtName}</span> from your DERA
            </p>

            {deleteError && (
              <p className="text-xs text-red-500 text-center mt-3">{deleteError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeDeleteModal}
                className="flex-1 py-2.5 rounded-2xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteDebt}
                className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment recorded toast with Undo */}
      {paymentToast && (
        <div className="fixed top-4 left-0 right-0 z-[70] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-sm w-full bg-inverse text-on-inverse rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 sheet-backdrop" role="status">
            <p className={`flex-1 text-sm ${paymentToast.error ? 'text-danger' : ''}`}>
              {paymentToast.error || paymentToast.message}
            </p>
            {paymentToast.debt && (
              <button onClick={undoPayment} className="text-sm font-semibold underline underline-offset-4">
                Undo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add / edit debt modal */}
      {(showAddDebt || editingDebt) && (
        <AddDebt
          onDebtAdded={fetchDebts}
          onClose={() => { setShowAddDebt(false); setEditingDebt(null) }}
          existingDebt={editingDebt}
        />
      )}
    </div>
  )
}

export default App
