import { useState } from 'react'
import { supabase } from './supabase'
import PasswordInput from './PasswordInput'

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400'

// Shown after the user opens a password-reset link from their email.
function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Use at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError("The passwords don't match.")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    onDone()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-2 h-2 rounded-full bg-purple-600"></div>
          <span className="font-medium text-gray-900 text-lg">DERA</span>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6">
          <h1 className="text-xl font-medium text-gray-900 mb-1">Set a new password</h1>
          <p className="text-sm text-gray-400 mb-6">Choose a new password for your DERA account.</p>

          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">New password</label>
            <PasswordInput
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <div className="mb-6">
            <label className="text-xs text-gray-400 mb-1 block">Confirm new password</label>
            <PasswordInput
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          {error && <p className="text-xs text-center mb-4 text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
