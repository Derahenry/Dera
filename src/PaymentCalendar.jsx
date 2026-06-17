import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function PaymentCalendar() {
  const [debts, setDebts] = useState([])

  useEffect(() => {
    async function fetchDebts() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true })
      if (data) setDebts(data)
    }
    fetchDebts()
  }, [])

  function getUrgency(dueDate) {
    const today = new Date()
    const due = new Date(dueDate)
    const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { label: "Overdue", color: "bg-red-500", days: daysLeft }
    if (daysLeft <= 3) return { label: "Due soon", color: "bg-orange-400", days: daysLeft }
    if (daysLeft <= 7) return { label: "This week", color: "bg-yellow-400", days: daysLeft }
    return { label: "Upcoming", color: "bg-green-400", days: daysLeft }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Payment Calendar</h2>

      {debts.length === 0 ? (
        <p className="text-gray-400">No upcoming payments. Add some debts to get started.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {debts.map((debt) => {
            const urgency = getUrgency(debt.due_date)
            return (
              <div key={debt.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{debt.item_name}</p>
                  <p className="text-gray-400 text-sm">{debt.provider}</p>
                  <p className="text-gray-400 text-sm">Due: {new Date(debt.due_date).toLocaleDateString("en-GB")}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-white font-bold">£{parseFloat(debt.amount).toFixed(2)}</p>
                  <span className={`text-xs text-white font-semibold px-3 py-1 rounded-full ${urgency.color}`}>
                    {urgency.label}
                  </span>
                  <p className="text-gray-400 text-xs">
                    {urgency.days < 0
                      ? `${Math.abs(urgency.days)} days overdue`
                      : urgency.days === 0
                      ? "Due today"
                      : `${urgency.days} days left`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PaymentCalendar