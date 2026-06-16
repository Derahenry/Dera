function App() {

  const debts = [
    {
      id: 1,
      provider: "Klarna",
      item: "Nike trainers",
      total: 320.00,
      paid: 1,
      instalments: 3,
      dueDate: "13 Jun",
      status: "due-soon",
      color: "purple"
    },
    {
      id: 2,
      provider: "Clearpay",
      item: "ASOS order",
      total: 312.50,
      paid: 2,
      instalments: 4,
      dueDate: "22 Jun",
      status: "upcoming",
      color: "green"
    },
    {
      id: 3,
      provider: "PayPal Pay in 3",
      item: "Boots order",
      total: 215.00,
      paid: 1,
      instalments: 3,
      dueDate: "30 Jun",
      status: "on-track",
      color: "blue"
    },
  ]

  const statusStyles = {
    "due-soon": "bg-red-100 text-red-700",
    "upcoming": "bg-amber-100 text-amber-700",
    "on-track": "bg-green-100 text-green-700",
  }

  const statusLabels = {
    "due-soon": "Due soon",
    "upcoming": "Upcoming",
    "on-track": "On track",
  }

  const providerInitial = {
    "Klarna": { letter: "K", style: "bg-purple-100 text-purple-600" },
    "Clearpay": { letter: "C", style: "bg-green-100 text-green-600" },
    "PayPal Pay in 3": { letter: "P", style: "bg-blue-100 text-blue-600" },
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-600"></div>
          <span className="font-medium text-gray-900">DERA</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-medium">
          A
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-medium text-gray-900">Good morning, Amara</h1>
        <p className="text-gray-500 mt-1">Here's where your money stands today.</p>

        {/* Total debt card */}
        <div className="mt-6 bg-purple-600 rounded-2xl p-6 text-white">
          <p className="text-purple-200 text-sm">Total BNPL debt</p>
          <p className="text-4xl font-medium mt-1">£847.50</p>
          <p className="text-purple-200 text-sm mt-1">Across 3 providers · Next payment in 4 days</p>
          <div className="flex gap-6 mt-6 pt-6 border-t border-purple-500">
            <div>
              <p className="text-purple-200 text-xs">Klarna</p>
              <p className="text-white font-medium mt-1">£320.00</p>
            </div>
            <div>
              <p className="text-purple-200 text-xs">Clearpay</p>
              <p className="text-white font-medium mt-1">£312.50</p>
            </div>
            <div>
              <p className="text-purple-200 text-xs">PayPal Pay in 3</p>
              <p className="text-white font-medium mt-1">£215.00</p>
            </div>
          </div>
        </div>

        {/* Debt cards */}
        <div className="mt-6">
          <p className="text-sm text-gray-400 uppercase tracking-wide mb-3">Your debts</p>
          <div className="flex flex-col gap-3">
            {debts.map((debt) => {
              const progress = (debt.paid / debt.instalments) * 100
              const provider = providerInitial[debt.provider]
              return (
                <div key={debt.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                  
                  {/* Provider initial */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium text-sm flex-shrink-0 ${provider.style}`}>
                    {provider.letter}
                  </div>

                  {/* Debt info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{debt.provider} — {debt.item}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Payment {debt.paid} of {debt.instalments} · due {debt.dueDate}</p>
                    {/* Progress bar */}
                    <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  {/* Amount + status */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">£{debt.total.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${statusStyles[debt.status]}`}>
                      {statusLabels[debt.status]}
                    </span>
                  </div>

                </div>
              )
            })}
          </div>
        </div>

      </main>
    </div>
  )
}

export default App