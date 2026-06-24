import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import AddDebt from './AddDebt'
import PaymentCalendar from './PaymentCalendar'
import RepaymentPlanner from './RepaymentPlanner'
import RiskPredictor from './RiskPredictor'
import WellbeingScore from './WellbeingScore'
import LetterWriter from './LetterWriter'
import EmailParser from './EmailParser'

const providerColors = {
  'Klarna': '#FF6B8A',
  'Clearpay': '#00D4AA',
  'PayPal Pay in 3': '#0070E0',
  'Zilch': '#F59E0B',
  'Other': '#8B5CF6',
}

const providerInitial = {
  'Klarna': { letter: 'K', style: 'bg-pink-100 text-pink-600' },
  'Clearpay': { letter: 'C', style: 'bg-green-100 text-green-600' },
  'PayPal Pay in 3': { letter: 'P', style: 'bg-blue-100 text-blue-600' },
  'Zilch': { letter: 'Z', style: 'bg-amber-100 text-amber-600' },
  'Other': { letter: 'O', style: 'bg-gray-100 text-gray-600' },
}

const statusStyles = {
  'due-soon': 'bg-red-100 text-red-700',
  'upcoming': 'bg-amber-100 text-amber-700',
  'on-track': 'bg-green-100 text-green-700',
}

const statusLabels = {
  'due-soon': 'Due soon',
  'upcoming': 'Upcoming',
  'on-track': 'On track',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 18) return 'Good afternoon,'
  return 'Good evening,'
}

function NavIcon({ tab, active }) {
  const icons = {
    home: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 10v11h14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    calendar: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    insights: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 1 0 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    tools: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    settings: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  }

  return (
    <div className={`transition-colors ${active ? 'text-purple-600' : 'text-gray-400'}`}>
      {icons[tab]}
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [debts, setDebts] = useState([])
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [toolsTab, setToolsTab] = useState('letter')
  const [insightsTab, setInsightsTab] = useState('wellbeing')
  const [confirmDelete, setConfirmDelete] = useState({ show: false, debtId: null, debtName: '' })
  const [editingDebt, setEditingDebt] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  useEffect(() => {
    if (session) fetchDebts()
  }, [session])

  const fetchDebts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('due_date', { ascending: true })
    if (!error) setDebts(data)
    setLoading(false)
  }

  const deleteDebt = async () => {
    await supabase.from('debts').delete().eq('id', confirmDelete.debtId)
    fetchDebts()
    setConfirmDelete({ show: false, debtId: null, debtName: '' })
  }

  const handleParsedDebt = async (parsedDebt) => {
    const { error } = await supabase.from('debts').insert([{
      provider: parsedDebt.provider,
      item: parsedDebt.item,
      total: parsedDebt.total,
      due_date: parsedDebt.due_date,
      instalments: parsedDebt.instalments,
      paid: parsedDebt.paid,
      status: 'on-track',
      user_id: session.user.id,
    }])
    if (!error) {
      fetchDebts()
      setActiveTab('home')
    }
  }

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.total), 0)

  const dueThisWeek = debts.filter(d => {
    const days = Math.ceil((new Date(d.due_date) - new Date()) / 86400000)
    return days >= 0 && days <= 7
  })

  const dueThisWeekTotal = dueThisWeek.reduce((sum, d) => sum + Number(d.total), 0)

  const userInitial = session?.user?.email?.[0]?.toUpperCase() || 'A'

  if (!session) return <Auth />

  const navTabs = [
    { id: 'home', label: 'Home' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'insights', label: 'Insights' },
    { id: 'tools', label: 'Tools' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen pb-24" style={{
      background: 'linear-gradient(160deg, #f0efff 0%, #f8f7ff 40%, #ffffff 100%)'
    }}>

      {/* Top header */}
      <div className="px-6 pt-12 pb-4 flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{getGreeting()}</p>
          <p className="text-2xl font-bold text-gray-900">
            {session?.user?.user_metadata?.full_name || 'Amara'}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
          {userInitial}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4">

        {/* ── HOME ────────────────────────────────────────────── */}
        {activeTab === 'home' && (
          <>
            {/* Total outstanding card */}
            <div className="rounded-3xl p-6 text-white relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, #5B4FE8 0%, #7B6FF0 60%, #9B8FF8 100%)'
            }}>
              {/* Decorative circle */}
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20" style={{ background: 'rgba(255,255,255,0.3)' }} />
              <div className="absolute -right-4 top-12 w-24 h-24 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,0.5)' }} />

              <p className="text-purple-200 text-sm font-medium">Total outstanding</p>
              <p className="text-4xl font-bold mt-1 tracking-tight">£{totalDebt.toFixed(2)}</p>

              <div className="flex gap-6 mt-5 pt-5 border-t border-white border-opacity-20">
                <div>
                  <p className="text-purple-200 text-xs">Active plans</p>
                  <p className="text-white font-bold text-lg mt-0.5">{debts.length}</p>
                </div>
                <div className="w-px bg-white opacity-20" />
                <div>
                  <p className="text-purple-200 text-xs">Due this week</p>
                  <p className="text-white font-bold text-lg mt-0.5">£{dueThisWeekTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Wellbeing score mini card */}
            {debts.length > 0 && (() => {
              const overdue = debts.filter(d => Math.ceil((new Date(d.due_date) - new Date()) / 86400000) < 0).length
              const dueSoon = debts.filter(d => { const days = Math.ceil((new Date(d.due_date) - new Date()) / 86400000); return days >= 0 && days <= 7 }).length
              const score = Math.max(0, Math.min(100, 100 - (overdue * 30) - (dueSoon * 10) - (debts.length * 2)))
              const label = score >= 70 ? 'Looking good' : score >= 40 ? 'Doing okay' : 'Needs attention'
              const color = score >= 70 ? '#16A34A' : score >= 40 ? '#D97706' : '#DC2626'
              return (
                <button
                  onClick={() => { setActiveTab('insights'); setInsightsTab('wellbeing') }}
                  className="w-full mt-3 bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100"
                >
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg width="48" height="48" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="18" fill="none" stroke="#F3F4F6" strokeWidth="6"/>
                      <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="6"
                        strokeDasharray={`${(score / 100) * 113} 113`}
                        strokeLinecap="round" transform="rotate(-90 24 24)"/>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>{score}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">Wellbeing score</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label} · tap for breakdown</p>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-gray-300">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )
            })()}

            {/* This week */}
            {dueThisWeek.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">This week</p>
                  <button onClick={() => setActiveTab('calendar')} className="text-xs text-indigo-600 font-medium">Calendar ›</button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {dueThisWeek.map(debt => {
                    const days = Math.ceil((new Date(debt.due_date) - new Date()) / 86400000)
                    const color = providerColors[debt.provider] || '#8B5CF6'
                    return (
                      <div key={debt.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-shrink-0 min-w-32">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <p className="text-xs text-gray-500">{debt.provider}</p>
                        </div>
                        <p className="text-lg font-bold text-gray-900">£{Number(debt.total).toFixed(2)}</p>
                        <p className="text-xs mt-1 font-medium" style={{ color: days <= 3 ? '#DC2626' : '#D97706' }}>
                          {days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} left`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* By provider */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">By provider</p>
              {loading ? (
                <div className="bg-white rounded-2xl p-8 flex justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-indigo-600 animate-spin" />
                </div>
              ) : debts.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                  <p className="text-gray-400 text-sm">No debts added yet</p>
                  <p className="text-gray-300 text-xs mt-1">Tap + to get started</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  {debts.map((debt) => {
                    const color = providerColors[debt.provider] || '#8B5CF6'
                    const progress = (debt.paid / debt.instalments) * 100
                    return (
                      <div key={debt.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <p className="text-sm font-medium text-gray-900">{debt.provider}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-semibold text-gray-900">£{Number(debt.total).toFixed(2)}</p>
                            <button
                              onClick={() => setEditingDebt(debt)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:bg-indigo-50 hover:text-indigo-500 transition-colors"
                              aria-label="Edit debt"
                            >
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ show: true, debtId: debt.id, debtName: `${debt.provider} — ${debt.item}` })}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              aria-label="Delete debt"
                            >
                              <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-2 ml-4">{debt.item}</p>
                        <div className="ml-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CALENDAR ─────────────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <div className="mt-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Calendar</h2>
            <PaymentCalendar />
          </div>
        )}

        {/* ── INSIGHTS ─────────────────────────────────────────── */}
        {activeTab === 'insights' && (
          <div className="mt-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Insights</h2>

            {/* Sub tabs */}
            <div className="flex gap-2 mb-5">
              {[{ id: 'wellbeing', label: 'Wellbeing' }, { id: 'risk', label: 'Risk' }, { id: 'planner', label: 'Repayment' }].map(t => (
                <button
                  key={t.id}
                  onClick={() => setInsightsTab(t.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    insightsTab === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {insightsTab === 'wellbeing' && <WellbeingScore debts={debts} />}
            {insightsTab === 'risk' && <RiskPredictor />}
            {insightsTab === 'planner' && <RepaymentPlanner />}
          </div>
        )}

        {/* ── TOOLS ────────────────────────────────────────────── */}
        {activeTab === 'tools' && (
          <div className="mt-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tools</h2>

            {/* Sub tabs */}
            <div className="flex gap-2 mb-5">
              {[{ id: 'letter', label: 'Letter Writer' }, { id: 'email', label: 'Email Parser' }].map(t => (
                <button
                  key={t.id}
                  onClick={() => setToolsTab(t.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    toolsTab === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {toolsTab === 'letter' && <LetterWriter debts={debts} />}
            {toolsTab === 'email' && <EmailParser onDebtParsed={handleParsedDebt} />}
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="mt-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Settings</h2>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Account</p>
                  <p className="text-xs text-gray-400 mt-0.5">{session?.user?.email}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                  {userInitial}
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Appearance</p>
                  <p className="text-xs text-gray-400 mt-0.5">Light mode</p>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-medium">Coming soon</span>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-400 mt-0.5">Payment reminders</p>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-medium">Coming soon</span>
              </div>

              <button
                onClick={() => supabase.auth.signOut()}
                className="w-full p-4 text-left text-sm font-medium text-red-500"
              >
                Sign out
              </button>
            </div>

            <p className="text-center text-xs text-gray-300 mt-6">DERA · Version 1.0</p>
          </div>
        )}

      </main>

      {/* Floating + button */}
      <button
        onClick={() => setShowAddDebt(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-indigo-700 transition-colors z-40"
        style={{ boxShadow: '0 4px 24px rgba(99, 102, 241, 0.4)' }}
      >
        +
      </button>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-lg px-4 pb-6 pt-2">
          <div className="rounded-2xl px-2 py-2 flex items-center justify-around"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 -1px 0 rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
          >
            {navTabs.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center gap-1 px-2 py-1 transition-all"
                >
                  <NavIcon tab={tab.id} active={active} />
                  {/* Glassy bubble label */}
                  <div className={`transition-all duration-200 ${
                    active
                      ? 'px-3 py-0.5 rounded-full text-indigo-600 font-semibold'
                      : 'text-gray-400'
                    }`}
                    style={active ? {
                      background: 'rgba(99, 102, 241, 0.12)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      fontSize: '11px',
                    } : { fontSize: '11px' }}
                  >
                    {tab.label}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDelete.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmDelete({ show: false, debtId: null, debtName: '' })}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Trash icon in red circle */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-red-500">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold text-gray-900 text-center">Remove debt?</h2>

            {/* Subtitle */}
            <p className="text-sm text-gray-400 text-center mt-2 leading-relaxed">
              This will remove <span className="text-gray-600 font-medium">{confirmDelete.debtName}</span> from your DERA
            </p>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete({ show: false, debtId: null, debtName: '' })}
                className="flex-1 py-2.5 rounded-2xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
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