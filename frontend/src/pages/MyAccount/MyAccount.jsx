/**
 * My Account Page (Protected)
 * ════════════════════════════
 * Tabbed dashboard for logged-in customers:
 *  - Profile
 *  - My Bookings
 *  - Notifications
 *  - My Reviews
 */

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/Notification/LoadingSpinner'
import './MyAccount.css'

const TABS = ['Profile', 'My Bookings', 'Notifications', 'My Reviews']

const STATUS_COLORS = {
  pending_approval:            { bg:'#fef3c7', color:'#92400e', label:'Pending Approval' },
  awaiting_payment:            { bg:'#dbeafe', color:'#1e40af', label:'Awaiting Payment' },
  payment_verification_pending:{ bg:'#fde8d8', color:'#c2410c', label:'Payment Verification' },
  confirmed:                   { bg:'#d1fae5', color:'#065f46', label:'Confirmed' },
  rejected:                    { bg:'#fee2e2', color:'#991b1b', label:'Rejected' },
  cancelled:                   { bg:'#f1f5f9', color:'#475569', label:'Cancelled' },
  completed:                   { bg:'#dbeafe', color:'#1e40af', label:'Completed' },
  refund_pending:              { bg:'#ede9fe', color:'#5b21b6', label:'Refund Pending' },
  refunded:                    { bg:'#d1fae5', color:'#065f46', label:'Refunded' },
}

export default function MyAccount() {
  const { user, logout, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState('Profile')
  const [bookings, setBookings]   = useState([])
  const [notifications, setNotifs]= useState([])
  const [reviews, setReviews]     = useState([])
  const [loading, setLoading]     = useState({})
  const [profile, setProfile]     = useState({ full_name: '', mobile: '' })
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (user) setProfile({ full_name: user.full_name, mobile: user.mobile })
  }, [user])

  useEffect(() => {
    if (activeTab === 'My Bookings' && bookings.length === 0) {
      setLoading(l => ({ ...l, bookings: true }))
      api.get('/bookings/my')
        .then(r => setBookings(r.data.data.bookings || []))
        .catch(() => {})
        .finally(() => setLoading(l => ({ ...l, bookings: false })))
    }
    if (activeTab === 'Notifications' && notifications.length === 0) {
      api.get('/notifications')
        .then(r => setNotifs(r.data.data.notifications || []))
        .catch(() => {})
    }
    if (activeTab === 'My Reviews' && reviews.length === 0) {
      api.get('/reviews/my')
        .then(r => setReviews(r.data.data.reviews || []))
        .catch(() => {})
    }
  }, [activeTab])

  const handleSaveProfile = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/auth/profile', profile)
      await refreshUser()
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    try {
      await api.post(`/bookings/${bookingId}/cancel`, { reason: 'Customer requested cancellation' })
      toast.success('Booking cancelled.')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const markAllRead = async () => {
    await api.put('/notifications/read-all').catch(() => {})
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="myaccount-page">
      <div className="page-banner">
        <div className="container">
          <h1>My Account</h1>
          <p>Manage your bookings, profile and notifications</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="account-layout">

            {/* ── Sidebar ── */}
            <aside className="account-sidebar">
              <div className="account-profile-mini">
                <div className="account-avatar">{user?.full_name?.charAt(0)?.toUpperCase()}</div>
                <div>
                  <div className="account-name">{user?.full_name}</div>
                  <div className="account-email">{user?.email}</div>
                </div>
              </div>

              <nav className="account-nav">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    className={`account-nav-item ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'Profile'       && '👤'}
                    {tab === 'My Bookings'   && '📋'}
                    {tab === 'Notifications' && '🔔'}
                    {tab === 'My Reviews'    && '⭐'}
                    {tab}
                    {tab === 'Notifications' && unreadCount > 0 && (
                      <span className="nav-badge">{unreadCount}</span>
                    )}
                  </button>
                ))}
                <hr style={{border:'none',borderTop:'1px solid var(--light-grey)',margin:'8px 0'}}/>
                <Link to="/complaints" className="account-nav-item">💬 My Complaints</Link>
                <Link to="/book"       className="account-nav-item">➕ New Booking</Link>
                <button className="account-nav-item nav-logout" onClick={async () => { await logout(); window.location.href = '/'; }}>
                  🚪 Logout
                </button>
              </nav>
            </aside>

            {/* ── Main Content ── */}
            <main className="account-main">

              {/* Profile Tab */}
              {activeTab === 'Profile' && (
                <div className="account-section">
                  <h2>My Profile</h2>
                  <form onSubmit={handleSaveProfile} className="profile-form">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input type="text" className="form-control" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input type="email" className="form-control" value={user?.email || ''} disabled style={{opacity:0.6}} />
                      <p style={{fontSize:'0.75rem',color:'var(--text-light)',marginTop:'4px'}}>Email cannot be changed. Contact support if needed.</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Number</label>
                      <input type="tel" className="form-control" value={profile.mobile} onChange={e => setProfile(p => ({ ...p, mobile: e.target.value }))} maxLength={10} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Member Since</label>
                      <input type="text" className="form-control" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : ''} disabled style={{opacity:0.6}} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              )}

              {/* My Bookings Tab */}
              {activeTab === 'My Bookings' && (
                <div className="account-section">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'24px'}}>
                    <h2>My Bookings</h2>
                    <Link to="/book" className="btn btn-primary btn-sm">+ New Booking</Link>
                  </div>

                  {loading.bookings ? <LoadingSpinner /> : bookings.length === 0 ? (
                    <div className="account-empty">
                      <span>📭</span>
                      <p>No bookings yet.</p>
                      <Link to="/book" className="btn btn-primary">Book Your First Ride</Link>
                    </div>
                  ) : (
                    <div className="bookings-list">
                      {bookings.map(b => {
                        const sc = STATUS_COLORS[b.status] || STATUS_COLORS.pending_approval
                        return (
                          <div className="booking-item" key={b.id}>
                            <div className="booking-item-header">
                              <div>
                                <span className="booking-num">#{b.booking_number}</span>
                                <span className="booking-service">{b.service_type?.replace(/_/g,' ')}</span>
                              </div>
                              <span className="badge" style={{ background: sc.bg, color: sc.color }}>
                                {sc.label}
                              </span>
                            </div>
                            <div className="booking-details-row">
                              <div className="booking-detail">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg>
                                <span>{b.pickup_location}</span>
                              </div>
                              {b.destination && (
                                <div className="booking-detail">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                  <span>{b.destination}</span>
                                </div>
                              )}
                              <div className="booking-detail">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                <span>{b.journey_date} at {b.pickup_time}</span>
                              </div>
                              <div className="booking-detail">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                <span>₹{b.total_amount}</span>
                              </div>
                            </div>

                            {/* Vehicle name if available */}
                            {b.vehicle_name && (
                              <p style={{fontSize:'0.8rem',color:'var(--text-light)',marginTop:'6px'}}>
                                Vehicle: {b.vehicle_name} ({b.registration_number})
                              </p>
                            )}

                            {/* Actions */}
                            {['pending_approval','awaiting_payment','payment_verification_pending'].includes(b.status) && b.payment_method === 'online_upi' && (
                              <div className="booking-actions">
                                <Link to={`/book`} className="btn btn-sm btn-outline">Upload Payment</Link>
                                <button className="btn btn-sm btn-danger" onClick={() => handleCancel(b.id)}>Cancel</button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'Notifications' && (
                <div className="account-section">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',marginBottom:'24px'}}>
                    <h2>Notifications {unreadCount > 0 && <span className="notif-count">{unreadCount} new</span>}</h2>
                    {unreadCount > 0 && <button className="btn btn-outline btn-sm" onClick={markAllRead}>Mark all read</button>}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="account-empty">
                      <span>🔔</span>
                      <p>No notifications yet.</p>
                    </div>
                  ) : (
                    <div className="notifications-list">
                      {notifications.map(n => (
                        <div className={`notif-item ${!n.is_read ? 'notif-unread' : ''}`} key={n.id}>
                          <div className="notif-dot" style={{background: n.is_read ? 'transparent' : 'var(--blue-accent)'}}/>
                          <div className="notif-content">
                            <div className="notif-title">{n.title}</div>
                            <div className="notif-message">{n.message}</div>
                            <div className="notif-time">{new Date(n.created_at).toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* My Reviews Tab */}
              {activeTab === 'My Reviews' && (
                <div className="account-section">
                  <h2>My Reviews</h2>
                  {reviews.length === 0 ? (
                    <div className="account-empty">
                      <span>⭐</span>
                      <p>No reviews submitted yet.</p>
                      <p style={{fontSize:'0.85rem',color:'var(--text-light)'}}>Complete a booking to leave a review.</p>
                    </div>
                  ) : (
                    <div className="reviews-list">
                      {reviews.map(r => (
                        <div className="review-item" key={r.id}>
                          <div className="review-item-header">
                            <span>#{r.booking_number} — {r.service_type?.replace(/_/g,' ')}</span>
                            <span className="badge" style={r.status === 'approved' ? {background:'#d1fae5',color:'#065f46'} : {background:'#fef3c7',color:'#856404'}}>
                              {r.status}
                            </span>
                          </div>
                          <div className="stars" style={{margin:'8px 0'}}>
                            {[1,2,3,4,5].map(i => (
                              <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i <= r.rating ? '#f59e0b' : '#d1d5db'}>
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                              </svg>
                            ))}
                          </div>
                          <p style={{fontSize:'0.9rem',color:'var(--text-medium)'}}>{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </main>
          </div>
        </div>
      </section>
    </div>
  )
}
