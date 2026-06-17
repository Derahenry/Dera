import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import AddDebt from './AddDebt'
import PaymentCalendar from './PaymentCalendar'
import RepaymentPlanner from './RepaymentPlanner'
import RiskPredictor from './RiskPredictor'

function App() {
  const [session, setSession] = useState(null)
  const [debts, setDebts] = useState([])
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

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

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.total), 0)

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

  const providerInitial = {
    'Klarna': { letter: 'K', style: 'bg-purple-100 text-purple-600' },
    'Clearpay': { letter: 'C', style: 'bg-green-100 text-green-600' },
    'PayPal Pay in 3': { letter: 'P', style: 'bg-blue-100 text-blue-600' },
    'Zilch': { letter: 'Z', style: 'bg-amber-100 text-amber-600' },
    'Other': { letter: 'O', style: 'bg-gray-100 text-gray-600' },
  }

  if (!session) return <Auth />

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'planner', label: 'Repayment' },
    { id: 'risk', label: 'Risk' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-600"></div>
          <span className="font-medium text-gray-900">DERA</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Sign out
          </button>
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-medium">
            A
          </div>
        </div>
      </nav>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="max-w-2xl mx-auto flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-8">

        {/* Dashboard tab */}
        {activeTab === 'dashboard' && (
          <>
            <h1 className="text-2xl font-medium text-gray-900">Good morning, Amara</h1>
            <p className="text-gray-500 mt-1">Here's where your money stands today.</p>

            {/* Total debt card */}
            <div className="mt-6 bg-purple-600 rounded-2xl p-6 text-white">
              <p className="text-purple-200 text-sm">Total BNPL debt</p>
              <p className="text-4xl font-medium mt-1">£{totalDebt.toFixed(2)}</p>
              <p className="text-purple-200 text-sm mt-1">
                Across {debts.length} {debts.length === 1 ? 'provider' : 'providers'}
              </p>
              {debts.length > 0 && (
                <div className="flex gap-6 mt-6 pt-6 border-t border-purple-500 flex-wrap">
                  {debts.map(debt => (
                    <div key={debt.id}>
                      <p className="text-purple-200 text-xs">{debt.provider}</p>
                      <p className="text-white font-medium mt-1">£{Number(debt.total).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Debt cards */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400 uppercase tracking-wide">Your debts</p>
                <button
                  onClick={() => setShowAddDebt(true)}
                  className="text-sm text-purple-600 font-medium"
                >
                  + Add debt
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-gray-400 text-center py-8">Loading your debts...</p>
              ) : debts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                  <p className="text-gray-400 text-sm">No debts added yet</p>
                  <p className="text-gray-300 text-xs mt-1">Tap + Add debt to get started</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {debts.map((debt) => {
                    const progress = (debt.paid / debt.instalments) * 100
                    const provider = providerInitial[debt.provider] || { letter: debt.provider[0], style: 'bg-gray-100 text-gray-600' }
                    return (
                      <div key={debt.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium text-sm flex-shrink-0 ${provider.style}`}>
                          {provider.letter}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{debt.provider} — {debt.item}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Payment {debt.paid} of {debt.instalments} · due {debt.due_date}</p>
                          <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-gray-900">£{Number(debt.total).toFixed(2)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${statusStyles[debt.status]}`}>
                            {statusLabels[debt.status]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Calendar tab */}
        {activeTab === 'calendar' && <PaymentCalendar />}

        {/* Repayment planner tab */}
        {activeTab === 'planner' && <RepaymentPlanner />}

        {/* Risk predictor tab */}
        {activeTab === 'risk' && <RiskPredictor />}

      </main>

      {/* Add debt modal */}
      {showAddDebt && (
        <AddDebt
          onDebtAdded={fetchDebts}
          onClose={() => setShowAddDebt(false)}
        />
      )}

    </div>
  )
}

export default App