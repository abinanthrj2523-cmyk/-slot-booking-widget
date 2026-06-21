import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { loadAllBookingsForAdmin, updateBookingStatus } from '../lib/supabase.js'
import './Admin.css'

export default function Dashboard() {
  const { supabaseClient } = useOutletContext()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    async function fetchBookings() {
      if (!supabaseClient) return

      try {
        setLoading(true)
        const data = await loadAllBookingsForAdmin(supabaseClient)
        setBookings(data)
      } catch (err) {
        setError(err.message || 'Failed to load bookings')
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [supabaseClient])

  function formatDateTime(date, time) {
    const parsedDate = new Date(date)
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsedDate)
    
    // time is usually HH:MM:SS or HH:MM
    const formattedTime = String(time).slice(0, 5)
    return `${formattedDate} ${formattedTime}`
  }

  async function handleStatusChange(bookingId, newStatus) {
    if (!supabaseClient) return
    
    setActionLoading(bookingId)
    setError('')
    
    try {
      await updateBookingStatus(supabaseClient, bookingId, newStatus)
      // Optimistically update the UI
      setBookings((current) => 
        current.map(b => b.id === bookingId ? { ...b, status: newStatus } : b)
      )
    } catch (err) {
      setError(`Failed to update status: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <div className="admin-dashboard-header">
        <h2>Bookings</h2>
        <button 
          className="primary-button" 
          onClick={() => window.location.reload()}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          Refresh
        </button>
      </div>

      {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

      <div className="bookings-table-container">
        {loading ? (
          <div className="empty-state">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">No bookings found.</div>
        ) : (
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Attendee</th>
                <th>Date & Time</th>
                <th>Meeting Type</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id || `${booking.slot_date}-${booking.start_time}-${booking.email}`}>
                  <td style={{ fontFamily: 'monospace' }}>{booking.reference_code || '-'}</td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{booking.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{booking.email}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatDateTime(booking.slot_date, booking.start_time)}
                  </td>
                  <td>{booking.meeting_type || booking.booking_type}</td>
                  <td>{booking.phone || '-'}</td>
                  <td>
                    <span className={`status-badge ${booking.status?.toLowerCase() || 'pending'}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td>
                    {booking.status === 'pending' ? (
                      <div className="actions-cell">
                        <button
                          className="action-btn btn-accept"
                          disabled={actionLoading === booking.id}
                          onClick={() => handleStatusChange(booking.id, 'confirmed')}
                        >
                          {actionLoading === booking.id ? '...' : 'Accept'}
                        </button>
                        <button
                          className="action-btn btn-reject"
                          disabled={actionLoading === booking.id}
                          onClick={() => handleStatusChange(booking.id, 'cancelled')}
                        >
                          {actionLoading === booking.id ? '...' : 'Reject'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
