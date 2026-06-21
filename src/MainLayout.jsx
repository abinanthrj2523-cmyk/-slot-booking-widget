import { Outlet, Link, useLocation } from 'react-router-dom'
import './App.css' // We can keep using App.css for the global navbar styles or move them here.

export default function MainLayout() {
  const location = useLocation()

  return (
    <div className="app-shell">
      <nav className="top-navbar">
        <div className="navbar-brand">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Beyond Grad
          </Link>
        </div>
        <div className="navbar-links">
          <Link 
            to="/booking" 
            className={`navbar-link ${location.pathname === '/booking' ? 'active' : ''}`}
          >
            Booking
          </Link>
          <Link 
            to="/admin/login" 
            className="admin-login-link"
          >
            Admin Login
          </Link>
        </div>
      </nav>

      <Outlet />
    </div>
  )
}
