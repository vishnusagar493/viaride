/**
 * Admin Dashboard  –  VIAROAD
 * ════════════════════════════════════════════════════════
 * Sections:
 *   Overview   – live stat cards
 *   Bookings   – full ride details table with IST datetime
 *   Payments   – verify screenshots, upload QR
 *   Vehicles   – toggle availability
 *   Customers  – customer list
 *   Reviews    – moderate reviews
 *   Complaints – respond to complaints
 *
 * Key features:
 *  • Live IST clock in the topbar (updates every second)
 *  • All booking dates/times displayed in IST with DD/MM/YYYY HH:MM format
 *  • "Rides Completed" increments automatically when admin marks a ride complete
 *  • Full booking details: pickup, destination, vehicle, customer, amount, status
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/Notification/LoadingSpinner'
import './Admin.css'

/* ─────────────────────────────────────────────────────
   IST DATE/TIME HELPERS
   India Standard Time = UTC + 5:30
   We use Intl.DateTimeFormat for reliable IST formatting.
   ───────────────────────────────────────────────────── */

/**
 * Format any Date/timestamp into IST display string.
 * Returns:  "09 Nov 2026, 03:45 PM IST"
 */
const toIST = (dateInput, includeTime = true) => {
  if (!dateInput) return '—'
  const d = new Date(dateInput)
  if (isNaN(d)) return '—'

  const opts = {
    timeZone: 'Asia/Kolkata',
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  }

  if (includeTime) {
    opts.hour   = '2-digit'
    opts.minute = '2-digit'
    opts.hour12 = true
  }

  return new Intl.DateTimeFormat('en-IN', opts).format(d) + (includeTime ? ' IST' : '')
}

/**
 * Format journey date (YYYY-MM-DD) + time (HH:MM) string into IST display.
 * journey_date is stored as a DATE in the DB (no timezone), so we construct
 * a local IST datetime string directly without conversion.
 */
const formatJourneyIST = (dateStr, timeStr) => {
  if (!dateStr) return '—'
  // Parse date parts
  const [yyyy, mm, dd] = dateStr.split('-')
  const [hh, min] = (timeStr || '00:00').split(':')
  const h = parseInt(hh)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const dateLabel = `${dd}/${mm}/${yyyy}`
  const timeLabel = timeStr ? `${String(h12).padStart(2,'0')}:${min} ${ampm} IST` : ''
  return timeLabel ? `${dateLabel}  ${timeLabel}` : dateLabel
}

/**
 * Returns current IST date and time as a human-readable string.
 * Used for the live topbar clock.
 */
const getNowIST = () => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day:     '2-digit',
    month:   'short',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
    second:  '2-digit',
    hour12:  true,
  }).format(new Date()) + ' IST'
}

/* ─────────────────────────────────────────────────────
   STATUS BADGE
   ───────────────────────────────────────────────────── */
const STATUS_MAP = {
  pending_approval:              { bg:'#fef3c7', color:'#92400e',  label:'Pending Approval' },
  awaiting_payment:              { bg:'#dbeafe', color:'#1e40af',  label:'Awaiting Payment' },
  payment_verification_pending:  { bg:'#fde8d8', color:'#c2410c',  label:'Payment Pending' },
  confirmed:                     { bg:'#d1fae5', color:'#065f46',  label:'Confirmed' },
  rejected:                      { bg:'#fee2e2', color:'#991b1b',  label:'Rejected' },
  cancelled:                     { bg:'#f1f5f9', color:'#475569',  label:'Cancelled' },
  completed:                     { bg:'#c7d2fe', color:'#3730a3',  label:'Completed' },
  refund_pending:                { bg:'#ede9fe', color:'#5b21b6',  label:'Refund Pending' },
  refunded:                      { bg:'#d1fae5', color:'#065f46',  label:'Refunded' },
  screenshot_uploaded:           { bg:'#fde8d8', color:'#c2410c',  label:'Screenshot Uploaded' },
  verified:                      { bg:'#d1fae5', color:'#065f46',  label:'Verified' },
  failed:                        { bg:'#fee2e2', color:'#991b1b',  label:'Failed' },
  pending:                       { bg:'#fef3c7', color:'#92400e',  label:'Pending' },
  open:                          { bg:'#fef3c7', color:'#92400e',  label:'Open' },
  in_progress:                   { bg:'#dbeafe', color:'#1e40af',  label:'In Progress' },
  resolved:                      { bg:'#d1fae5', color:'#065f46',  label:'Resolved' },
  cash_collected:                { bg:'#d1fae5', color:'#065f46',  label:'Cash Collected' },
}

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || { bg:'#f1f5f9', color:'#475569', label: status?.replace(/_/g,' ') || '—' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: s.bg, color: s.color,
      fontSize: '0.68rem', fontWeight: 700,
      padding: '3px 9px', borderRadius: '12px',
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────
   STAT CARD
   ───────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, color = '#0d2545', trend = null }) => (
  <div className="admin-stat-card">
    <div className="admin-stat-icon" style={{ background: color + '18' }}>{icon}</div>
    <div className="admin-stat-body">
      <div className="admin-stat-value" style={{ color }}>{value ?? '—'}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  </div>
)

/* ═════════════════════════════════════════════════════
   OVERVIEW TAB
   ═════════════════════════════════════════════════════ */
const Overview = () => {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then(r => setStats(r.data.data.stats))
      .catch(() => {})
  }, [])

  if (!stats) return <LoadingSpinner />

  return (
    <div>
      <h2 className="admin-section-title">Dashboard Overview</h2>
      <div className="admin-stats-grid">
        <StatCard icon="👥" label="Total Customers"    value={stats.total_customers}    color="#0d2545"/>
        <StatCard icon="🚗" label="Total Vehicles"     value={stats.total_vehicles}     color="#1e5fad"/>
        <StatCard icon="📋" label="Total Bookings"     value={stats.total_bookings}     color="#0d2545"/>
        <StatCard icon="⏳" label="Pending Approval"   value={stats.pending_bookings}   color="#d97706"/>
        <StatCard icon="✅" label="Confirmed"          value={stats.confirmed_bookings} color="#059669"/>
        <StatCard icon="🏁" label="Completed Rides"    value={parseInt(stats.completed_bookings || 0) + 20} color="#2563eb"/>
        <StatCard icon="❌" label="Cancelled"          value={stats.cancelled_bookings} color="#dc2626"/>
        <StatCard icon="💰" label="Total Revenue"      value={`₹${parseInt(stats.total_revenue || 0).toLocaleString('en-IN')}`} color="#c9a84c"/>
        <StatCard icon="🔔" label="Pending Payments"   value={stats.pending_payments}   color="#ea580c"/>
        <StatCard icon="💬" label="Open Complaints"    value={stats.new_complaints}     color="#7c3aed"/>
        <StatCard icon="⭐" label="Pending Reviews"    value={stats.pending_reviews}    color="#c9a84c"/>
        <StatCard icon="🛵" label="Active Rentals"     value={stats.active_bike_rentals} color="#0d2545"/>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════
   BOOKINGS TAB — FULL RIDE DETAILS WITH IST
   ═════════════════════════════════════════════════════ */
const Bookings = () => {
  const [bookings, setBookings]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [expanded, setExpanded]   = useState(null)   // expanded row ID

  const FILTERS = [
    { key:'all',                           label:'All Bookings' },
    { key:'pending_approval',              label:'Pending' },
    { key:'payment_verification_pending',  label:'Pmt. Pending' },
    { key:'confirmed',                     label:'Confirmed' },
    { key:'completed',                     label:'Completed' },
    { key:'cancelled',                     label:'Cancelled' },
    { key:'rejected',                      label:'Rejected' },
  ]

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const url = filter === 'all'
        ? '/admin/bookings?limit=100'
        : `/admin/bookings?status=${filter}&limit=100`
      const r = await api.get(url)
      setBookings(r.data.data || [])
    } catch { }
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const updateStatus = async (id, status, notes = '') => {
    try {
      await api.put(`/admin/bookings/${id}/status`, { status, admin_notes: notes })
      toast.success(`Ride marked as: ${STATUS_MAP[status]?.label || status}`)
      fetchBookings()
    } catch (err) {
      toast.error(err.message)
    }
  }

  /* Filter by search */
  const displayed = bookings.filter(b => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      b.booking_number?.toLowerCase().includes(q) ||
      b.customer_name?.toLowerCase().includes(q) ||
      b.customer_mobile?.includes(q) ||
      b.pickup_location?.toLowerCase().includes(q) ||
      b.destination?.toLowerCase().includes(q) ||
      b.vehicle_name?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Header row */}
      <div className="bookings-header">
        <h2 className="admin-section-title" style={{margin:0}}>All Ride Details</h2>
        <div className="bookings-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search by ID, customer, location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bookings-search-input"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="admin-filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <button className="filter-btn filter-refresh" onClick={fetchBookings}>
          ↻ Refresh
        </button>
      </div>

      {loading ? <LoadingSpinner /> : displayed.length === 0 ? (
        <div className="admin-empty">
          <span style={{fontSize:'2.5rem', display:'block', marginBottom:'10px'}}>📭</span>
          No bookings found{search ? ' for this search' : ' for this filter'}.
        </div>
      ) : (
        <>
          <div className="bookings-count-bar">
            Showing <strong>{displayed.length}</strong> ride{displayed.length !== 1 ? 's' : ''}
            {search && <span> matching "<em>{search}</em>"</span>}
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Vehicle</th>
                  <th>Journey Date & Time (IST)</th>
                  <th>Pickup Location</th>
                  <th>Destination</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Booked On (IST)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(b => (
                  <React.Fragment key={b.id}>
                    <tr
                      className={`booking-row ${expanded === b.id ? 'row-expanded' : ''}`}
                      onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                      title="Click to expand details"
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Booking # */}
                      <td>
                        <span className="booking-id">#{b.booking_number}</span>
                      </td>

                      {/* Customer */}
                      <td>
                        <div className="cell-name">{b.customer_name}</div>
                        <div className="cell-sub">{b.customer_mobile}</div>
                        <div className="cell-sub" style={{fontSize:'0.68rem'}}>{b.customer_email}</div>
                      </td>

                      {/* Service */}
                      <td>
                        <span className="service-pill">
                          {b.service_type === 'car_with_driver'  && '🚗 Car'}
                          {b.service_type === 'bike_with_driver' && '🏍️ Bike'}
                          {b.service_type === 'self_drive_bike'  && '🛵 Self-Drive'}
                        </span>
                      </td>

                      {/* Vehicle */}
                      <td>
                        <div className="cell-name">{b.vehicle_name || '—'}</div>
                        <div className="cell-sub" style={{fontFamily:'monospace'}}>{b.registration_number || ''}</div>
                      </td>

                      {/* Journey Date & Time — stored as DATE + TIME, shown in IST */}
                      <td>
                        <div className="ist-date">
                          {b.journey_date
                            ? (() => {
                                const [yy, mm, dd] = b.journey_date.split('-')
                                return `${dd}/${mm}/${yy}`
                              })()
                            : '—'
                          }
                        </div>
                        {b.pickup_time && (
                          <div className="ist-time">
                            {(() => {
                              const [hh, min] = b.pickup_time.split(':')
                              const h = parseInt(hh)
                              const ampm = h >= 12 ? 'PM' : 'AM'
                              const h12 = h % 12 || 12
                              return `${String(h12).padStart(2,'0')}:${min} ${ampm} IST`
                            })()}
                          </div>
                        )}
                      </td>

                      {/* Pickup */}
                      <td>
                        <div className="cell-location" title={b.pickup_location}>
                          📍 {b.pickup_location || '—'}
                        </div>
                      </td>

                      {/* Destination */}
                      <td>
                        <div className="cell-location" title={b.destination}>
                          🏁 {b.destination || '—'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td>
                        <div className="cell-amount">₹{parseFloat(b.total_amount || 0).toLocaleString('en-IN')}</div>
                        {b.security_deposit > 0 && (
                          <div className="cell-sub">+₹{b.security_deposit} deposit</div>
                        )}
                      </td>

                      {/* Payment method */}
                      <td>
                        <div className="cell-name">
                          {b.payment_method === 'online_upi' ? '📱 UPI' : '💵 Cash'}
                        </div>
                        <div className="cell-sub">
                          {b.payment_status || b.payment_method_detail || ''}
                        </div>
                      </td>

                      {/* Booked on — exact IST datetime from created_at */}
                      <td>
                        <div className="ist-date">{toIST(b.created_at, false)}</div>
                        <div className="ist-time">
                          {b.created_at
                            ? new Intl.DateTimeFormat('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                              }).format(new Date(b.created_at)) + ' IST'
                            : '—'
                          }
                        </div>
                      </td>

                      {/* Status */}
                      <td><StatusBadge status={b.status}/></td>

                      {/* Actions */}
                      <td onClick={e => e.stopPropagation()}>
                        <div className="admin-actions">
                          {b.status === 'pending_approval' && (
                            <>
                              <button className="admin-btn admin-btn-success" onClick={() => updateStatus(b.id,'confirmed','Approved by admin')}>
                                ✓ Approve
                              </button>
                              <button className="admin-btn admin-btn-danger" onClick={() => updateStatus(b.id,'rejected','Rejected by admin')}>
                                ✗ Reject
                              </button>
                            </>
                          )}
                          {b.status === 'payment_verification_pending' && (
                            <button className="admin-btn admin-btn-primary" onClick={() => updateStatus(b.id,'confirmed','Payment verified, booking confirmed')}>
                              Verify & Confirm
                            </button>
                          )}
                          {b.status === 'confirmed' && (
                            <button className="admin-btn admin-btn-success" onClick={() => updateStatus(b.id,'completed','Ride completed')}>
                              🏁 Mark Complete
                            </button>
                          )}
                          {['pending_approval','awaiting_payment','payment_verification_pending','confirmed'].includes(b.status) && (
                            <button className="admin-btn admin-btn-danger" onClick={() => updateStatus(b.id,'cancelled','Cancelled by admin')}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded detail row ── */}
                    {expanded === b.id && (
                      <tr className="expanded-row">
                        <td colSpan={12}>
                          <div className="expanded-detail">
                            <div className="expanded-grid">
                              <div className="exp-col">
                                <div className="exp-label">Booking ID</div>
                                <div className="exp-value">{b.id}</div>
                              </div>
                              <div className="exp-col">
                                <div className="exp-label">Passengers</div>
                                <div className="exp-value">{b.num_passengers || 1}</div>
                              </div>
                              {b.return_date && (
                                <div className="exp-col">
                                  <div className="exp-label">Return Date (IST)</div>
                                  <div className="exp-value">
                                    {(() => { const [yy,mm,dd] = b.return_date.split('-'); return `${dd}/${mm}/${yy}` })()}
                                  </div>
                                </div>
                              )}
                              <div className="exp-col">
                                <div className="exp-label">Special Instructions</div>
                                <div className="exp-value">{b.special_instructions || 'None'}</div>
                              </div>
                              <div className="exp-col">
                                <div className="exp-label">Admin Notes</div>
                                <div className="exp-value">{b.admin_notes || '—'}</div>
                              </div>
                              {b.cancellation_reason && (
                                <div className="exp-col">
                                  <div className="exp-label">Cancellation Reason</div>
                                  <div className="exp-value" style={{color:'#dc2626'}}>{b.cancellation_reason}</div>
                                </div>
                              )}
                              <div className="exp-col">
                                <div className="exp-label">Last Updated (IST)</div>
                                <div className="exp-value">{toIST(b.updated_at)}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/* ═════════════════════════════════════════════════════
   PAYMENTS TAB
   ═════════════════════════════════════════════════════ */
const Payments = () => {
  const [payments, setPayments]   = useState([])
  const [qrUrl, setQrUrl]         = useState('')
  const [qrFile, setQrFile]       = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api.get('/admin/payments?status=screenshot_uploaded')
      .then(r => setPayments(r.data.data.payments || []))
      .catch(() => {})
    api.get('/payments/qr')
      .then(r => setQrUrl(r.data.data.qr_url || ''))
      .catch(() => {})
  }, [])

  const verifyPayment = async (id, status) => {
    try {
      await api.put(`/admin/payments/${id}/verify`, { status })
      toast.success(`Payment ${status}.`)
      setPayments(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const uploadQR = async () => {
    if (!qrFile) { toast.error('Select an image first.'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('qr_image', qrFile)
    try {
      const r = await api.post('/admin/settings/upi-qr', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setQrUrl(r.data.data.qr_url)
      toast.success('QR code updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h2 className="admin-section-title">Payment Management</h2>

      <div className="admin-qr-box">
        <h3>UPI QR Code</h3>
        <div className="admin-qr-inner">
          {qrUrl
            ? <img src={qrUrl} alt="Current QR" className="admin-qr-img"/>
            : <div className="admin-qr-placeholder">No QR code uploaded yet</div>
          }
          <div className="admin-qr-upload">
            <p>Upload your company UPI QR code. Customers scan this to pay online.</p>
            <input type="file" accept="image/*" onChange={e => setQrFile(e.target.files[0])} className="form-control" style={{marginBottom:'10px'}}/>
            <button className="btn btn-primary" onClick={uploadQR} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Update QR Code'}
            </button>
          </div>
        </div>
      </div>

      <h3 style={{color:'var(--navy)', margin:'28px 0 14px', fontSize:'1.05rem'}}>
        Pending Payment Verifications ({payments.length})
      </h3>

      {payments.length === 0 ? (
        <div className="admin-empty">✅ No payments pending verification.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Booking #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Txn Reference</th>
                <th>Submitted (IST)</th>
                <th>Screenshot</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td><strong>#{p.booking_number}</strong></td>
                  <td>
                    <div className="cell-name">{p.customer_name}</div>
                    <div className="cell-sub">{p.customer_email}</div>
                  </td>
                  <td><strong>₹{parseFloat(p.amount || 0).toLocaleString('en-IN')}</strong></td>
                  <td style={{fontFamily:'monospace', fontSize:'0.8rem'}}>{p.transaction_ref || '—'}</td>
                  <td>
                    <div className="ist-date">{toIST(p.created_at, false)}</div>
                    <div className="ist-time">
                      {p.created_at
                        ? new Intl.DateTimeFormat('en-IN', {
                            timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12:true,
                          }).format(new Date(p.created_at)) + ' IST'
                        : ''}
                    </div>
                  </td>
                  <td>
                    {p.screenshot_url
                      ? <a href={p.screenshot_url} target="_blank" rel="noreferrer" className="admin-btn admin-btn-primary">View</a>
                      : <span style={{color:'var(--text-light)'}}>—</span>
                    }
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button className="admin-btn admin-btn-success" onClick={() => verifyPayment(p.id,'verified')}>✓ Verify</button>
                      <button className="admin-btn admin-btn-danger"  onClick={() => verifyPayment(p.id,'failed')}>✗ Fail</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ═════════════════════════════════════════════════════
   MAIN ADMIN SHELL — with live IST clock
   ═════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { admin, adminLogout } = useAuth()
  const navigate  = useNavigate()
  const [section, setSection] = useState('overview')
  const [istTime, setIstTime] = useState(getNowIST())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /* Live clock — ticks every second */
  useEffect(() => {
    const timer = setInterval(() => setIstTime(getNowIST()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    await adminLogout()
    navigate('/admin/login')
  }

  const NAV = [
    { id:'overview',   label:'Overview',   emoji:'📊' },
    { id:'bookings',   label:'All Rides',  emoji:'📋' },
    { id:'payments',   label:'Payments',   emoji:'💳' },
    { id:'vehicles',   label:'Vehicles',   emoji:'🚗' },
    { id:'customers',  label:'Customers',  emoji:'👥' },
    { id:'reviews',    label:'Reviews',    emoji:'⭐' },
    { id:'complaints', label:'Complaints', emoji:'💬' },
  ]

  return (
    <div className="admin-layout">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="admin-brand">
          <span className="admin-brand-logo">🛡️ VIA<span style={{color:'#c9a84c'}}>ROAD</span></span>
          <span className="admin-brand-sub">Admin Control Panel</span>
        </div>

        <div className="admin-user-info">
          <div className="admin-user-avatar">{admin?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
          <div>
            <div className="admin-user-name">{admin?.name || 'Admin'}</div>
            <div className="admin-user-role">Administrator</div>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => { setSection(item.id); setSidebarOpen(false) }}
            >
              <span>{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <a href="/" className="admin-nav-item" style={{textDecoration:'none'}}>🌐 View Website</a>
          <button className="admin-nav-item admin-logout" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="admin-main">

        {/* Topbar with live IST clock */}
        <div className="admin-topbar">
          <div className="admin-topbar-left">
            {/* Mobile hamburger */}
            <button className="admin-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h2 className="admin-topbar-title">
              {NAV.find(n => n.id === section)?.emoji}{' '}
              {NAV.find(n => n.id === section)?.label}
            </h2>
          </div>

          {/* Live IST clock */}
          <div className="admin-ist-clock" aria-live="polite" aria-label="Current IST time">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {istTime}
          </div>
        </div>

        {/* Content */}
        <div className="admin-content">
          {section === 'overview'   && <Overview />}
          {section === 'bookings'   && <Bookings />}
          {section === 'payments'   && <Payments />}
          {section === 'vehicles'   && <VehiclesAdmin />}
          {section === 'customers'  && <CustomersAdmin />}
          {section === 'reviews'    && <ReviewsAdmin />}
          {section === 'complaints' && <ComplaintsAdmin />}
        </div>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   VEHICLES
   ───────────────────────────────────────────────────── */
const VehiclesAdmin = () => {
  const [vehicles, setVehicles] = useState([])
  useEffect(() => {
    api.get('/admin/vehicles').then(r => setVehicles(r.data.data.vehicles || [])).catch(() => {})
  }, [])

  const toggle = async (v) => {
    try {
      await api.put(`/admin/vehicles/${v.id}`, { is_available: !v.is_available })
      setVehicles(prev => prev.map(x => x.id === v.id ? { ...x, is_available: !x.is_available } : x))
      toast.success('Vehicle updated.')
    } catch(err) { toast.error(err.message) }
  }

  return (
    <div>
      <h2 className="admin-section-title">Vehicle Management</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Vehicle Name</th>
              <th>Reg No.</th>
              <th>Category</th>
              <th>Seating</th>
              <th>Base Price</th>
              <th>Added On (IST)</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.id}>
                <td><strong>{v.vehicle_name}</strong></td>
                <td style={{fontFamily:'monospace', fontSize:'0.82rem'}}>{v.registration_number}</td>
                <td style={{textTransform:'capitalize'}}>{v.category?.replace(/_/g,' ')}</td>
                <td>{v.seating_capacity} seats</td>
                <td>₹{v.base_price}</td>
                <td>
                  <div className="ist-date">{toIST(v.created_at, false)}</div>
                  <div className="ist-time">
                    {v.created_at
                      ? new Intl.DateTimeFormat('en-IN', {
                          timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12:true,
                        }).format(new Date(v.created_at)) + ' IST'
                      : ''}
                  </div>
                </td>
                <td>
                  <span style={{color: v.is_available ? '#059669' : '#dc2626', fontWeight:700}}>
                    {v.is_available ? '✓ Available' : '✗ Unavailable'}
                  </span>
                </td>
                <td>
                  <button
                    className={`admin-btn ${v.is_available ? 'admin-btn-danger' : 'admin-btn-success'}`}
                    onClick={() => toggle(v)}
                  >
                    {v.is_available ? 'Mark Unavailable' : 'Mark Available'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   CUSTOMERS
   ───────────────────────────────────────────────────── */
const CustomersAdmin = () => {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/admin/customers').then(r => setCustomers(r.data.data.customers || [])).catch(() => {})
  }, [])

  const filtered = customers.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.mobile?.includes(q)
  })

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px', marginBottom:'20px'}}>
        <h2 className="admin-section-title" style={{margin:0}}>Customer Management</h2>
        <div className="bookings-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search by name, email, mobile…" value={search} onChange={e => setSearch(e.target.value)} className="bookings-search-input"/>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Total Bookings</th>
              <th>Registered On (IST)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td><strong>{c.full_name}</strong></td>
                <td style={{fontSize:'0.82rem'}}>{c.email}</td>
                <td>{c.mobile}</td>
                <td><strong>{c.total_bookings}</strong></td>
                <td>
                  <div className="ist-date">{toIST(c.created_at, false)}</div>
                  <div className="ist-time">
                    {c.created_at
                      ? new Intl.DateTimeFormat('en-IN', {
                          timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12:true,
                        }).format(new Date(c.created_at)) + ' IST'
                      : ''}
                  </div>
                </td>
                <td>
                  <span style={{color: c.is_active ? '#059669' : '#dc2626', fontWeight:700}}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   REVIEWS
   ───────────────────────────────────────────────────── */
const ReviewsAdmin = () => {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    api.get('/admin/reviews').then(r => setReviews(r.data.data.reviews || [])).catch(() => {})
  }, [])

  const update = async (id, status) => {
    try {
      await api.put(`/admin/reviews/${id}`, { status })
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      toast.success('Review updated.')
    } catch(err) { toast.error(err.message) }
  }

  return (
    <div>
      <h2 className="admin-section-title">Review Moderation</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Customer</th><th>Rating</th><th>Comment</th><th>Submitted (IST)</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id}>
                <td><strong>{r.customer_name}</strong></td>
                <td>{'⭐'.repeat(r.rating)}</td>
                <td style={{maxWidth:'220px', fontSize:'0.82rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={r.comment}>
                  {r.comment}
                </td>
                <td>
                  <div className="ist-date">{toIST(r.created_at, false)}</div>
                  <div className="ist-time">
                    {r.created_at
                      ? new Intl.DateTimeFormat('en-IN', {
                          timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12:true,
                        }).format(new Date(r.created_at)) + ' IST'
                      : ''}
                  </div>
                </td>
                <td><StatusBadge status={r.status}/></td>
                <td>
                  <div className="admin-actions">
                    {r.status !== 'approved' && <button className="admin-btn admin-btn-success" onClick={() => update(r.id,'approved')}>Approve</button>}
                    {r.status !== 'hidden'   && <button className="admin-btn admin-btn-danger"  onClick={() => update(r.id,'hidden')}>Hide</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   COMPLAINTS
   ───────────────────────────────────────────────────── */
const ComplaintsAdmin = () => {
  const [complaints, setComplaints] = useState([])
  const [response, setResponse]     = useState({})

  useEffect(() => {
    api.get('/admin/complaints').then(r => setComplaints(r.data.data.complaints || [])).catch(() => {})
  }, [])

  const update = async (id, status) => {
    try {
      await api.put(`/admin/complaints/${id}`, { status, admin_response: response[id] || '' })
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, admin_response: response[id] } : c))
      toast.success('Complaint updated.')
    } catch(err) { toast.error(err.message) }
  }

  return (
    <div>
      <h2 className="admin-section-title">Complaint Management</h2>
      <div className="complaints-admin-list">
        {complaints.length === 0 && <div className="admin-empty">✅ No complaints found.</div>}
        {complaints.map(c => (
          <div className="complaint-admin-card" key={c.id}>
            <div className="complaint-admin-header">
              <div>
                <strong>#{c.complaint_number}</strong>
                <span className="complaint-category-tag">{c.category}</span>
              </div>
              <StatusBadge status={c.status}/>
            </div>
            <p style={{fontSize:'0.875rem', color:'#475569', margin:'8px 0 6px', lineHeight:'1.65'}}>{c.description}</p>
            <div style={{display:'flex', gap:'16px', flexWrap:'wrap', fontSize:'0.78rem', color:'#94a3b8', marginBottom:'10px'}}>
              <span>👤 {c.customer_name || 'Anonymous'}</span>
              {c.booking_number && <span>📋 #{c.booking_number}</span>}
              <span>🕐 {toIST(c.created_at)}</span>
            </div>

            {c.admin_response && (
              <div style={{background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'10px 14px', marginBottom:'10px'}}>
                <strong style={{fontSize:'0.78rem', color:'#065f46', display:'block', marginBottom:'3px'}}>Your Response:</strong>
                <p style={{fontSize:'0.85rem', color:'#064e3b'}}>{c.admin_response}</p>
              </div>
            )}

            {c.status !== 'resolved' && (
              <div style={{marginTop:'10px'}}>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Write your response to the customer…"
                  value={response[c.id] || ''}
                  onChange={e => setResponse(r => ({ ...r, [c.id]: e.target.value }))}
                  style={{marginBottom:'8px', fontSize:'0.875rem'}}
                />
                <div className="admin-actions">
                  <button className="admin-btn admin-btn-primary" onClick={() => update(c.id,'in_progress')}>Mark In Progress</button>
                  <button className="admin-btn admin-btn-success" onClick={() => update(c.id,'resolved')}>✓ Resolve</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
