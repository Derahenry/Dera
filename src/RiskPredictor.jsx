import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function RiskPredictor() {
  const [debts, setDebts] = useState([])

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

  function getRisk(dueDate) {
    const today = new Date()
    const due = new Date(dueDate)
    const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) return {
      level: "Overdue",
      message: `${Math.abs(daysLeft)} days overdue`,
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100 text-red-700",
      dot: "bg-red-500"
    }
    if (daysLeft <= 3) return {
      level: "Critical",
      message: `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      bg: "bg-orange-50",
      border: "border-orange-200",
      badge: "bg-orange-100 text-orange-700",
      dot: "bg-orange-500"
    }
    if (daysLeft <= 7) return {
      level: "At risk",
      message: `Due in ${daysLeft} days`,
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      badge: "bg-yellow-100 text-yellow-700",
      dot: "bg-yellow-400"
    }
    return {
      level: "On track",
      message: `${daysLeft} days left`,
      bg: "bg-green-50",
      border: "border-green-200",
      badge: "bg-green-100 text-green-700",
      dot: "bg-green-500"
    }
  }

  const overdueCount = debts.filter(d => {
    const daysLeft = Math.ceil((new Date(d.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    return daysLeft < 0
  }).length

  const criticalCount = debts.filter(d => {
    const daysLeft = Math.ceil((new Date(d.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    return daysLeft >= 0 && daysLeft <= 3
  }).length

  return (
    <div>
      <h2 className="text-2xl font-medium text-gray-900 mb-1">Risk Predictor</h2>
      <p className="text-gray-500 text-sm mb-6">
        Automatically flags payments that need your attention.
      </p>

      {/* Summary banner */}
      {(overdueCount > 0 || criticalCount > 0) ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <p className="text-red-700 font-medium text-sm">
            ⚠️ {overdueCount > 0 && `${overdueCount} overdue`}
            {overdueCount > 0 && criticalCount > 0 && " · "}
            {criticalCount > 0 && `${criticalCount} due very soon`}
          </p>
          <p className="text-red-500 text-xs mt-1">
            Act now to avoid missed payments affecting your BNPL access.
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
          <p className="text-green-700 font-medium text-sm">✅ All payments on track</p>
          <p className="text-green-500 text-xs mt-1">No immediate risks detected.</p>
        </div>
      )}

      {/* Debt risk list */}
      {debts.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No debts to analyse yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {debts
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .map((debt) => {
              const risk = getRisk(debt.due_date)
              return (
                <div key={debt.id} className={`rounded-2xl border p-4 flex items-center gap-4 ${risk.bg} ${risk.border}`}>
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${risk.dot}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{debt.provider} — {debt.item}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{risk.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-semibold text-gray-900">£{Number(debt.total).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${risk.badge}`}>
                      {risk.level}
                    </span>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default RiskPredictor