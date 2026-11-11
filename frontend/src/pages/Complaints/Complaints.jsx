/**
 * Complaints Page (Protected – requires login)
 * ════════════════════════════════════════════
 * Features:
 *  - Submit new complaint with category selection
 *  - View all previous complaints and their status
 *  - Admin responses displayed per complaint
 */

import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/Notification/LoadingSpinner'
import './Complaints.css'

const CATEGORIES = [
  'Driver Behaviour','Vehicle Condition','Payment Issue',
  'Booking Issue','Service Quality','Bike Rental Issue','Other',
]

const STATUS_COLORS = {
  open:        { bg:'#fef3c7', color:'#92400e' },
  in_progress: { bg:'#dbeafe', color:'#1e40af' },
  resolved:    { bg:'#d1fae5', color:'#065f46' },
}

export default function Complaints() {
  const [complaints, setComplaints] = useState([])
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ booking_id: '', category: '', description: '', contact_details: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [compRes, bookRes] = await Promise.all([
        api.get('/complaints/my'),
        api.get('/bookings/my'),
      ])
      setComplaints(compRes.data.data.complaints || [])
      setBookings(bookRes.data.data.bookings || [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.category || !form.description.trim()) {
      toast.error('Category and description are required.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/complaints', form)
      toast.success('Complaint submitted. We\'ll respond soon.')
      setShowForm(false)
      setForm({ booking_id: '', category: '', description: '', contact_details: '' })
      fetchData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="complaints-page">
      <div className="page-banner">
        <div className="container">
          <h1>My Complaints</h1>
          <p>Submit an issue or track your existing complaints</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="complaints-header">
            <div>
              <h2 style={{color:'var(--navy)', fontFamily:'var(--font-heading)'}}>Complaint Management</h2>
              <p style={{color:'var(--text-medium)', marginTop:'4px'}}>We take every complaint seriously and aim to resolve it within 48 hours.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
              {showForm ? 'Cancel' : '+ Submit New Complaint'}
            </button>
          </div>

          {/* ── Submit form ── */}
          {showForm && (
            <div className="complaint-form-card">
              <h3>New Complaint</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Category <span>*</span></label>
                    <select name="category" className="form-control" value={form.category} onChange={handleChange} required>
                      <option value="">-- Select category --</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Related Booking (optional)</label>
                    <select name="booking_id" className="form-control" value={form.booking_id} onChange={handleChange}>
                      <option value="">-- Select booking --</option>
                      {bookings.map(b => (
                        <option key={b.id} value={b.id}>
                          #{b.booking_number} — {b.service_type?.replace(/_/g,' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description <span>*</span></label>
                  <textarea
                    name="description"
                    className="form-control"
                    rows="5"
                    placeholder="Describe your issue in detail. The more detail, the faster we can help."
                    value={form.description}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Details (optional)</label>
                  <input
                    name="contact_details"
                    type="text"
                    className="form-control"
                    placeholder="Preferred contact — phone or email"
                    value={form.contact_details}
                    onChange={handleChange}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Complaint'}
                </button>
              </form>
            </div>
          )}

          {/* ── Complaints list ── */}
          {loading ? (
            <LoadingSpinner />
          ) : complaints.length === 0 ? (
            <div className="complaints-empty">
              <span>✅</span>
              <p>No complaints found. We're glad everything is going well!</p>
            </div>
          ) : (
            <div className="complaints-list">
              {complaints.map(c => {
                const sc = STATUS_COLORS[c.status] || STATUS_COLORS.open
                return (
                  <div className="complaint-item" key={c.id}>
                    <div className="complaint-item-header">
                      <div>
                        <span className="complaint-num">#{c.complaint_number}</span>
                        <span className="complaint-category">{c.category}</span>
                      </div>
                      <span className="badge" style={{ background: sc.bg, color: sc.color }}>
                        {c.status?.replace(/_/g,' ')}
                      </span>
                    </div>
                    {c.booking_number && (
                      <p className="complaint-booking">Booking: #{c.booking_number}</p>
                    )}
                    <p className="complaint-desc">{c.description}</p>
                    {c.admin_response && (
                      <div className="complaint-response">
                        <strong>Admin Response:</strong>
                        <p>{c.admin_response}</p>
                      </div>
                    )}
                    <p className="complaint-date">{new Date(c.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
