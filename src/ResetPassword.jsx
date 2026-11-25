import { useState } from 'react'
import { supabase } from './supabase'
import PasswordInput from './PasswordInput'
import { AuthShell } from './ui'
import { fieldClass } from './styles'

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
    <AuthShell title="Set a new password." sub="Choose a new password for your DERA account.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="new-password" className="text-xs font-medium text-ink-3 mb-1.5 block">New password</label>
          <PasswordInput
            id="new-password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="text-xs font-medium text-ink-3 mb-1.5 block">Confirm new password</label>
          <PasswordInput
            id="confirm-password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={fieldClass}
          />
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="press mt-2 w-full py-4 rounded-full bg-inverse text-on-inverse text-[15px] font-semibold disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
