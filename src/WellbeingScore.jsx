import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function WellbeingScore() {
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDebts() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
      if (data) setDebts(data)
      setLoading(false)
    }
    fetchDebts()
  }, [])

  function calculateScore(debts) {
    if (debts.length === 0) return 100

    let score = 100

    debts.forEach(debt => {
      const today = new Date()
      const due = new Date(debt.due_date)
      const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24))

      // Overdue debts hurt the most
      if (daysLeft < 0) score -= 20
      // Critical debts hurt a lot
      else if (daysLeft <= 3) score -= 10
      // At risk debts hurt a little
      else if (daysLeft <= 7) score -= 5

      // High debt amounts reduce score
      if (Number(debt.total) > 200) score -= 5
      if (Number(debt.total) > 500) score -= 5

      // Progress through instalments helps score
      const progress = debt.paid / debt.instalments
      if (progress >= 0.5) score += 3
      if (progress >= 0.75) score += 3
    })

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  function getScoreDetails(score) {
    if (score >= 80) return {
      label: "Great shape",
      description: "Your BNPL debt is well managed. Keep it up!",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      ring: "stroke-green-500"
    }
    if (score >= 60) return {
      label: "Doing okay",
      description: "A few payments need attention soon.",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      ring: "stroke-yellow-500"
    }
    if (score >= 40) return {
      label: "Needs attention",
      description: "Some debts are overdue or at risk. Act soon.",
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      ring: "stroke-orange-500"
    }
    return {
      label: "At risk",
      description: "Multiple payments are overdue. Prioritise these now.",
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      ring: "stroke-red-500"
    }
  }

  const score = calculateScore(debts)
  const details = getScoreDetails(score)

  // For the circular progress ring
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-indigo-600 animate-spin" />
    </div>
  )

  return (
    <div>
      <h2 className="text-2xl font-medium text-gray-900 mb-1">Wellbeing Score</h2>
      <p className="text-gray-500 text-sm mb-6">Your personal BNPL financial health score.</p>

      {/* Score circle */}
      <div className={`rounded-2xl border p-8 flex flex-col items-center ${details.bg} ${details.border} mb-6`}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          {/* Background ring */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          {/* Score ring */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            className={details.ring}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 90 90)"
          />
          {/* Score number */}
          <text
            x="90" y="90"
            textAnchor="middle"
            dominantBaseline="central"
            className="font-bold"
            fontSize="36"
            fill="currentColor"
          >
            {score}
          </text>
        </svg>

        <p className={`text-xl font-semibold mt-2 ${details.color}`}>{details.label}</p>
        <p className="text-gray-500 text-sm mt-1 text-center">{details.description}</p>
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-medium text-gray-900 mb-3">Score breakdown</p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total debts</span>
            <span className="text-gray-900 font-medium">{debts.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Overdue</span>
            <span className="text-red-600 font-medium">
              {debts.filter(d => Math.ceil((new Date(d.due_date) - new Date()) / 86400000) < 0).length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Due within 7 days</span>
            <span className="text-orange-500 font-medium">
              {debts.filter(d => {
                const days = Math.ceil((new Date(d.due_date) - new Date()) / 86400000)
                return days >= 0 && days <= 7
              }).length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">On track</span>
            <span className="text-green-600 font-medium">
              {debts.filter(d => Math.ceil((new Date(d.due_date) - new Date()) / 86400000) > 7).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WellbeingScore