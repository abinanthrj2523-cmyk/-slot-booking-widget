import { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { createSupabaseClient } from '../lib/supabase.js'
import './Admin.css'

export default function AdminLayout() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  const resolvedSupabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
  const resolvedSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

  const supabaseClient = useMemo(
    () =>
      createSupabaseClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      }),
    [resolvedSupabaseUrl, resolvedSupabaseAnonKey],
  )

  useEffect(() => {
    if (!supabaseClient) {
      setLoading(false)
      return
    }

    supabaseClient.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      setLoading(false)
      if (!currentSession) {
        navigate('/admin/login')
      }
    })

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (!currentSession) {
        navigate('/admin/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabaseClient, navigate])

  async function handleLogout() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut()
      navigate('/admin/login')
    }
  }

  if (loading) {
    return (
      <div className="admin-shell">
        <p>Loading admin portal...</p>
      </div>
    )
  }

  if (!session) {
    // If not authenticated, we should have already navigated, but render nothing or Outlet
    // However we should probably only render the login if not authenticated.
    // Actually, AdminLayout wraps the protected routes. Login will NOT be wrapped by AdminLayout.
    return null
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1>Admin Portal</h1>
        <div className="admin-user-info">
          <span>{session.user.email}</span>
          <button type="button" className="admin-logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main className="admin-content">
        <Outlet context={{ supabaseClient, session }} />
      </main>
    </div>
  )
}
