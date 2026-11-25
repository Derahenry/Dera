import { useState } from 'react'
import { supabase } from './supabase'
import PasswordInput from './PasswordInput'
import { AuthShell } from './ui'
import { fieldClass } from './styles'

const COPY = {
  login: { title: 'Welcome back.', sub: "Log in to see what you owe and what's next.", button: 'Log in' },
  signup: { title: 'Get on top of it.', sub: 'Create your account and track every BNPL plan in one place.', button: 'Create account' },
  forgot: { title: 'Reset your password.', sub: "Enter your email and we'll send you a link to set a new one.", button: 'Send reset link' },
}

function Auth({ onDemo }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const show = (text, error = false) => {
    setMessage(text)
    setIsError(error)
  }

  const switchMode = (next) => {
    setMode(next)
    show('')
    setPassword('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    show('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        show(error.message === 'Invalid login credentials'
          ? 'Wrong email or password. Forgot your password? Reset it below.'
          : error.message, true)
      }
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      if (error) {
        show(error.message, true)
      } else if (data.user && data.user.identities?.length === 0) {
        // Supabase reports success for an email that's already registered, but sends nothing.
        show('An account with this email already exists. Log in, or reset your password if you forgot it.', true)
      } else {
        show('Check your email to confirm your account!')
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) show(error.message, true)
      // Same message whether or not the account exists, so the form can't be used to check emails.
      else show("If an account exists for this email, we've sent a link to reset your password. Check your inbox and spam folder.")
    }

    setLoading(false)
  }

  const copy = COPY[mode]

  return (
    <AuthShell title={copy.title} sub={copy.sub}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="auth-email" className="text-xs font-medium text-ink-3 mb-1.5 block">Email</label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="amara@example.com"
            className={fieldClass}
          />
        </div>

        {mode === 'signup' && (
          <div>
            <label htmlFor="auth-name" className="text-xs font-medium text-ink-3 mb-1.5 block">Full name</label>
            <input
              id="auth-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amara Johnson"
              className={fieldClass}
            />
          </div>
        )}

        {mode !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-password" className="text-xs font-medium text-ink-3 block">Password</label>
              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-semibold text-ink">
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordInput
              id="auth-password"
              required
              minLength={mode === 'signup' ? 6 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldClass}
            />
          </div>
        )}

        {message && (
          <p role={isError ? 'alert' : 'status'} className={`text-sm ${isError ? 'text-danger' : 'text-ink-2'}`}>{message}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="press mt-2 w-full py-4 rounded-full bg-inverse text-on-inverse text-[15px] font-semibold disabled:opacity-50"
        >
          {loading ? 'Please wait…' : copy.button}
        </button>

        <p className="text-center text-sm text-ink-3 mt-2">
          {mode === 'login' && "Don't have an account? "}
          {mode === 'signup' && 'Already have an account? '}
          {mode === 'forgot' && 'Remembered it? '}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="font-semibold text-ink"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </form>

      {mode !== 'forgot' && onDemo && (
        <div className="mt-8">
          <div className="flex items-center gap-3 text-xs text-ink-3">
            <span className="flex-1 h-px bg-line" /> or <span className="flex-1 h-px bg-line" />
          </div>
          <button
            type="button"
            onClick={onDemo}
            className="press mt-5 w-full py-4 rounded-full bg-surface-2 text-ink text-[15px] font-semibold"
          >
            Try the demo
          </button>
          <p className="text-center text-xs text-ink-3 mt-2">No sign-up. Sample data, nothing is saved.</p>
        </div>
      )}

      <p className="text-center text-xs text-ink-3 mt-8">
        <a href="/privacy.html" className="underline underline-offset-4">Privacy</a>
      </p>
    </AuthShell>
  )
}

export default Auth
