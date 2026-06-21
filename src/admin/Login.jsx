import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSupabaseClient } from '../lib/supabase.js'
import './Admin.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resolvedSupabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
  const resolvedSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

  const supabaseClient = useMemo(
    () =>
      createSupabaseClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      }),
    [resolvedSupabaseUrl, resolvedSupabaseAnonKey],
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!supabaseClient) {
      setError('Supabase not configured.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-shell admin-login-container">
      <div className="admin-login-card">
        <h2>Admin Sign In</h2>
        <p className="admin-login-subtitle">Sign in with your Supabase admin credentials to access bookings.</p>
        
        <form onSubmit={handleSubmit} className="admin-login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </label>
          
          {error && <p className="error-text">{error}</p>}
          
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
