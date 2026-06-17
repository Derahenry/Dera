import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function RepaymentPlanner() {
  const [debts, setDebts] = useState([])
  const [strategy, setStrategy] = useState("avalanche")
  const [monthlyBudget, setMonthlyBudget] = useState("")

  useEffect(() => {
    async function fetchDebts() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
      if (data) setDebts(data)
    }
    fetchDebts()
  }, [])

  const sortedDebts = [...debts].sort((a, b) => {
    if (strategy === "avalanche") {
      return Number(b.total) - Number(a.total)
    } else {
      return Number(a.total) - Number(b.total)
    }
  })

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.total), 0)
  const budget = parseFloat(monthlyBudget) || 0
  const monthsToPayoff = budget > 0 ? Math.ceil(totalDebt / budget) : null

  return (
    <div className="p-6">
      <h2 className="text-2xl font-medium text-gray-900 mb-1">Repayment Planner</h2>
      <p className="text-gray-500 text-sm mb-6">Choose a strategy and see which debts to tackle first.</p>

      {/* Strategy toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <p className="text-sm text-gray-500 mb-3">Repayment strategy</p>
        <div className="flex gap-2">
          <button
            onClick={() => setStrategy("avalanche")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              strategy === "avalanche"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            Avalanche
          </button>
          <button
            onClick={() => setStrategy("snowball")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              strategy === "snowball"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            Snowball
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {strategy === "avalanche"
            ? "Avalanche: pay off your largest debts first to save the most money."
            : "Snowball: pay off your smallest debts first for quick wins and momentum."}
        </p>
      </div>

      {/* Monthly budget input */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <p className="text-sm text-gray-500 mb-2">How much can you pay monthly?</p>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-medium">£</span>
          <input
            type="number"
            placeholder="e.g. 50"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            className="flex-1 outline-none text-gray-900 text-sm"
          />
        </div>
        {monthsToPayoff && (
          <p className="text-xs text-purple-600 font-medium mt-2">
            At £{budget}/month you could be debt-free in {monthsToPayoff} {monthsToPayoff === 1 ? "month" : "months"} 🎯
          </p>
        )}
      </div>

      {/* Ordered debt list */}
      {debts.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No debts added yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedDebts.map((debt, index) => (
            <div key={debt.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{debt.provider} — {debt.item}</p>
                <p className="text-xs text-gray-400 mt-0.5">Due {debt.due_date}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">£{Number(debt.total).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RepaymentPlanner