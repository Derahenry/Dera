import { useState } from 'react'
import { supabase } from './supabase'
import PasswordInput from './PasswordInput'

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400'

const COPY = {
  login: { title: 'Welcome back', sub: 'Log in to see your BNPL overview', button: 'Log in' },
  signup: { title: 'Create your account', sub: 'Start tracking your BNPL debt in one place', button: 'Sign up' },
  forgot: { title: 'Reset your password', sub: "Enter your email and we'll send you a link to set a new password", button: 'Send reset link' },
}

function Auth() {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-2 h-2 rounded-full bg-purple-600"></div>
          <span className="font-medium text-gray-900 text-lg">DERA</span>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6">
          <h1 className="text-xl font-medium text-gray-900 mb-1">{copy.title}</h1>
          <p className="text-sm text-gray-400 mb-6">{copy.sub}</p>

          {/* Email */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="amara@example.com"
              className={inputClass}
            />
          </div>

          {/* Full Name */}
          {mode === 'signup' && (
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Amara Johnson"
                className={inputClass}
              />
            </div>
          )}

          {/* Password */}
          {mode !== 'forgot' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400 block">Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-purple-600 font-medium">
                    Forgot password?
                  </button>
                )}
              </div>
              <PasswordInput
                required
                minLength={mode === 'signup' ? 6 : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
          )}

          {mode === 'forgot' && <div className="mb-2" />}

          {/* Message */}
          {message && (
            <p className={`text-xs text-center mb-4 ${isError ? 'text-red-500' : 'text-purple-600'}`}>{message}</p>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : copy.button}
          </button>

          {/* Toggle */}
          <p className="text-center text-xs text-gray-400 mt-4">
            {mode === 'login' && "Don't have an account? "}
            {mode === 'signup' && 'Already have an account? '}
            {mode === 'forgot' && 'Remembered it? '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="text-purple-600 font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>

        </form>
      </div>
    </div>
  )
}

export default Auth
