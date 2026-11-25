import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import ResetPassword from './ResetPassword'
import AddDebt from './AddDebt'
import MessageProvider from './screens/MessageProvider'
import EmailParser from './EmailParser'
import OpenBanking from './OpenBanking'
import Home from './screens/Home'
import Calendar from './screens/Calendar'
import Insights from './screens/Insights'
import Splash from './screens/Splash'
import Onboarding from './screens/Onboarding'
import Settings from './screens/Settings'
import { BottomNav, Sheet } from './ui'
import {
  daysUntil, formatGBP, instalmentAmount, isPaidOff, nextDueDate,
  paidCount, progress, validateDebt,
} from './debtMath'
import {
  fetchPending, findDuplicateDebt, matches, savePending, setPendingStatus, toDebtDraft,
} from './pendingPurchases'

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
  const [toolsTab, setToolsTab] = useState('message')
  // Which debt the Message provider screen should start on (set from Home).
  const [messageDebtId, setMessageDebtId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({ show: false, debtId: null, debtName: '' })
  const [editingDebt, setEditingDebt] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [paymentToast, setPaymentToast] = useState(null) // { message, error, onUndo }
  const paymentToastTimer = useRef(null)
  const [payingId, setPayingId] = useState(null)
  // Purchases DERA detected that wait for Add / Edit / Ignore.
  const [pending, setPending] = useState([])
  const [pendingBusyId, setPendingBusyId] = useState(null)
  // Detections made in this tab, so the live update doesn't announce them twice.
  const localPendingIds = useRef(new Set())
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
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('dera-onboarded') } catch { return true }
  })
  const [showSplash, setShowSplash] = useState(true)

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

    // Only remind people who have already said yes; asking happens in Settings
    // after a tap, never as a surprise pop-up when the app opens.
    if (Notification.permission !== 'granted') return

    const today = new Date().toISOString().slice(0, 10)
    try { if (localStorage.getItem('dera-last-notif-check') === today) return } catch { /* check anyway */ }

    navigator.serviceWorker.register('/sw.js').catch(() => {})

    {
      try { localStorage.setItem('dera-last-notif-check', today) } catch { /* may remind again today */ }

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
    }
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

  const showPaymentToast = (toast) => {
    clearTimeout(paymentToastTimer.current)
    setPaymentToast(toast)
    paymentToastTimer.current = setTimeout(() => setPaymentToast(null), 6000)
  }

  const loadPending = async () => {
    const { data, error } = await fetchPending()
    if (!error) setPending(data)
  }

  useEffect(() => {
    // Loading data from Supabase when the user signs in is the job of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) { fetchDebts(); loadPending() }
  }, [session])

  // Live updates: a purchase detected elsewhere (another device, or forwarded
  // email later) appears on Home without a refresh.
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`pending-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pending_purchases', filter: `user_id=eq.${userId}`,
      }, (change) => {
        loadPending()
        const row = change.new
        if (change.eventType !== 'INSERT' || row?.status !== 'pending' || localPendingIds.current.has(row.id)) return
        const text = `New ${row.provider || 'BNPL'} purchase detected`
        showPaymentToast({ message: text })
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          new Notification(text, { body: row.item || 'Open DERA to add it', icon: '/icon-192.png' })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

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
      onUndo: () => undoPayment(debt),
      message: finished
        ? `${debt.item} is paid off 🎉`
        : `Payment recorded · ${newPaid}/${debt.instalments} paid`,
    })
  }

  const runToastUndo = () => {
    const undo = paymentToast?.onUndo
    clearTimeout(paymentToastTimer.current)
    setPaymentToast(null)
    undo?.()
  }

  const undoPayment = async (before) => {
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
    try { localStorage.setItem('dera-onboarded', 'true') } catch { /* shows again next time */ }
    setShowOnboarding(false)
  }

  // The email parser hands over what it read. It joins the Detected list,
  // unless the same purchase is already waiting there. Returns { id } or { error }.
  const detectPurchase = async (raw) => {
    const existing = pending.find(p => matches(p, raw))
    if (existing) return { id: existing.id }
    const { data, error } = await savePending(raw, 'email_paste')
    if (error) return { error: 'Could not save what was found. Please try again.' }
    localPendingIds.current.add(data.id)
    setPending(list => [data, ...list.filter(p => p.id !== data.id)])
    return { id: data.id }
  }

  // Add a detected purchase straight to the debts. Incomplete ones open the sheet instead.
  const addPending = async (purchase) => {
    const { debt, errors } = validateDebt(purchase)
    if (errors.length > 0) return editPending(purchase)
    setPendingBusyId(purchase.id)
    const { data, error } = await supabase
      .from('debts')
      .insert({ ...debt, status: 'on-track', user_id: session.user.id })
      .select('id')
      .single()
    if (error) {
      setPendingBusyId(null)
      showPaymentToast({ error: 'Could not add this purchase. Please try again.' })
      return
    }
    await setPendingStatus(purchase.id, 'added', data.id)
    setPendingBusyId(null)
    setPending(list => list.filter(p => p.id !== purchase.id))
    await fetchDebts()
    showPaymentToast({ message: `${debt.item} added to DERA` })
    return true
  }

  const editPending = (purchase) => setEditingDebt(toDebtDraft(purchase))

  const ignorePending = async (purchase) => {
    setPending(list => list.filter(p => p.id !== purchase.id))
    const { error } = await setPendingStatus(purchase.id, 'ignored')
    if (error) {
      loadPending()
      showPaymentToast({ error: 'Could not ignore this. Please try again.' })
      return
    }
    showPaymentToast({
      message: 'Purchase ignored',
      onUndo: async () => {
        await setPendingStatus(purchase.id, 'pending')
        loadPending()
      },
    })
  }

  // Called by the add sheet after a debt is saved from a detected purchase.
  const linkPendingToDebt = async (pendingId, debtId) => {
    await setPendingStatus(pendingId, 'added', debtId)
    setPending(list => list.filter(p => p.id !== pendingId))
  }

  const pendingActions = {
    busyId: pendingBusyId,
    onAdd: addPending,
    onEdit: editPending,
    onIgnore: ignorePending,
    isDuplicate: (p) => Boolean(findDuplicateDebt(p, debts)),
  }

  const goTo = (tab) => {
    setActiveTab(tab)
    window.scrollTo(0, 0)
  }

  // Open Tools > Message provider, optionally starting on a particular debt.
  const openMessage = (debtId) => {
    setMessageDebtId(debtId)
    setToolsTab('message')
    goTo('tools')
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
  const wellbeingColor = wellbeingScore >= 70 ? 'var(--success)' : wellbeingScore >= 40 ? 'var(--ink)' : 'var(--danger)'
  const wellbeingLabel = wellbeingScore >= 70 ? 'Looking good' : wellbeingScore >= 40 ? 'Doing okay' : 'Needs attention'

  // Risk banner
  const atRiskDebts = activeDebts
    .map(d => ({ ...d, days: daysUntil(d.due_date) }))
    .filter(d => d.days <= 3)
    .sort((a, b) => a.days - b.days)

  const userInitial = (session?.user?.user_metadata?.full_name?.trim() || session?.user?.email || 'D')[0].toUpperCase()

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />

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

  if (showOnboarding) return <Onboarding onDone={completeOnboarding} />

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

      <main key={activeTab} className="max-w-lg mx-auto px-4 screen-in">

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
            onNavigate={tab => (tab === 'tools' ? openMessage(null) : goTo(tab))}
            onMessage={debt => openMessage(debt.id)}
            pending={pending}
            pendingActions={pendingActions}
          />
        )}

        {activeTab === 'calendar' && (
          <Calendar debts={activeDebts} loading={loading} onAdd={() => setShowAddDebt(true)} />
        )}

        {activeTab === 'insights' && (
          <Insights
            activeDebts={activeDebts}
            allDebts={debts}
            wellbeing={{
              score: wellbeingScore,
              label: wellbeingLabel,
              timeliness: timelinessScore,
              load: debtLoadScore,
              progress: repaymentScore,
            }}
            atRisk={atRiskDebts}
            onAdd={() => setShowAddDebt(true)}
          />
        )}

        {/* ── TOOLS ────────────────────────────────────────────── */}
        {activeTab === 'tools' && (
          <div className="pb-4">
            {/* Pill switcher */}
            <div className="flex bg-surface-2 rounded-full p-1 mb-6" role="tablist" aria-label="Tools">
              {[{ id: 'message', label: 'Message' }, { id: 'email', label: 'Email parser' }, { id: 'banking', label: 'Open banking' }].map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={toolsTab === t.id}
                  onClick={() => setToolsTab(t.id)}
                  className={`flex-1 py-2 text-[13px] font-medium rounded-full whitespace-nowrap transition-colors ${
                    toolsTab === t.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {toolsTab === 'message' && (
              <MessageProvider
                key={messageDebtId ?? 'none'}
                debts={activeDebts}
                userName={session?.user?.user_metadata?.full_name || ''}
                initialDebtId={messageDebtId}
                onAddDebt={() => setShowAddDebt(true)}
              />
            )}
            {toolsTab === 'email' && (
              <EmailParser
                onDetected={detectPurchase}
                pending={pending}
                actions={pendingActions}
                onDone={() => goTo('home')}
              />
            )}
            {toolsTab === 'banking' && <OpenBanking />}
          </div>
        )}

        {activeTab === 'settings' && (
          <Settings session={session} theme={theme} onThemeChange={setTheme} />
        )}

      </main>

      <BottomNav
        active={activeTab}
        onNavigate={goTo}
        onAdd={() => setShowAddDebt(true)}
      />

      {/* Confirm delete */}
      <Sheet open={confirmDelete.show} onClose={closeDeleteModal} title="Remove this debt?">
        <p className="text-[15px] text-ink-2 leading-relaxed">
          <span className="font-semibold text-ink">{confirmDelete.debtName}</span> will be removed from DERA, with its payment history. This can't be undone.
        </p>
        {deleteError && <p role="alert" className="text-sm text-danger mt-3">{deleteError}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={closeDeleteModal} className="press flex-1 py-3.5 rounded-full bg-surface-2 text-ink text-[15px] font-semibold">
            Cancel
          </button>
          <button onClick={deleteDebt} className="press flex-1 py-3.5 rounded-full bg-danger text-white text-[15px] font-semibold">
            Remove
          </button>
        </div>
      </Sheet>

      {/* Payment recorded toast with Undo */}
      {paymentToast && (
        <div className="fixed top-4 left-0 right-0 z-[70] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-sm w-full bg-inverse text-on-inverse rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 sheet-backdrop" role="status">
            <p className={`flex-1 text-sm ${paymentToast.error ? 'text-danger' : ''}`}>
              {paymentToast.error || paymentToast.message}
            </p>
            {paymentToast.onUndo && (
              <button onClick={runToastUndo} className="text-sm font-semibold underline underline-offset-4">
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
          onLinkPending={linkPendingToDebt}
          onClose={() => { setShowAddDebt(false); setEditingDebt(null) }}
          existingDebt={editingDebt}
        />
      )}
    </div>
  )
}

export default App
