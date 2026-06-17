import { useState } from 'react'
import { supabase } from './supabase'

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async () => {
    setLoading(true)
    setMessage('')

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Check your email to confirm your account!')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-2 h-2 rounded-full bg-purple-600"></div>
          <span className="font-medium text-gray-900 text-lg">DERA</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h1 className="text-xl font-medium text-gray-900 mb-1">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            {isLogin ? 'Log in to see your BNPL overview' : 'Start tracking your BNPL debt in one place'}
          </p>

          {/* Email */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="amara@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="text-xs text-gray-400 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-purple-400"
            />
          </div>

          {/* Message */}
          {message && (
            <p className="text-xs text-center mb-4 text-purple-600">{message}</p>
          )}

          {/* Button */}
          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
          </button>

          {/* Toggle */}
          <p className="text-center text-xs text-gray-400 mt-4">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-600 font-medium"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}

export default Auth