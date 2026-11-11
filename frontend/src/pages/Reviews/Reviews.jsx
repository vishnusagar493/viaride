/**
 * Reviews Page
 * ═══════════════════════════════════════════
 * Shows all admin-approved customer reviews.
 * Authenticated customers who have completed bookings
 * can submit new reviews directly from this page.
 *
 * State:
 *   reviews        – fetched from GET /api/reviews
 *   myBookings     – completed bookings eligible for review
 *   showForm       – toggles the submit review form
 */

import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/Notification/LoadingSpinner'
import './Reviews.css'

const Stars = ({ n, interactive = false, onRate }) => (
  <div className="stars" aria-label={`${n} stars`}>
    {[1,2,3,4,5].map(i => (
      <svg
        key={i}
        className={`star ${i <= n ? 'star-filled' : 'star-empty'} ${interactive ? 'star-interactive' : ''}`}
        width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
        onClick={() => interactive && onRate && onRate(i)}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `Rate ${i} stars` : undefined}
        onKeyDown={interactive ? e => e.key === 'Enter' && onRate(i) : undefined}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ))}
  </div>
)

export default function Reviews() {
  const { isAuthenticated } = useAuth()
  const [reviews, setReviews]       = useState([])
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ booking_id: '', rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/reviews'),
      isAuthenticated ? api.get('/bookings/my') : Promise.resolve(null),
    ]).then(([revRes, bookRes]) => {
      setReviews(revRes.data.data.reviews || [])
      if (bookRes) {
        const completed = (bookRes.data.data.bookings || []).filter(b => b.status === 'completed')
        setBookings(completed)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [isAuthenticated])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.booking_id) { toast.error('Please select a booking.'); return }
    if (form.rating < 1)  { toast.error('Please select a rating.'); return }
    setSubmitting(true)
    try {
      await api.post('/reviews', form)
      toast.success('Review submitted! Thank you.')
      setShowForm(false)
      setForm({ booking_id: '', rating: 5, comment: '' })
      // Refresh reviews
      const r = await api.get('/reviews')
      setReviews(r.data.data.reviews || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0

  return (
    <div className="reviews-page">
      <div className="page-banner">
        <div className="container">
          <h1>Customer Reviews</h1>
          <p>Real experiences from real VIAROAD customers</p>
        </div>
      </div>

      <section className="section">
        <div className="container">

          {/* ── Summary header ── */}
          <div className="reviews-summary">
            <div className="reviews-avg">
              <span className="avg-num">{avgRating}</span>
              <Stars n={Math.round(avgRating)} />
              <span className="avg-total">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            </div>
            {isAuthenticated && bookings.length > 0 && (
              <button className="btn btn-gold" onClick={() => setShowForm(s => !s)}>
                {showForm ? 'Cancel' : '✍️ Write a Review'}
              </button>
            )}
            {!isAuthenticated && (
              <p className="reviews-auth-note">
                <a href="/login" style={{color:'var(--blue-accent)', fontWeight:600}}>Log in</a> after completing a ride to leave a review.
              </p>
            )}
          </div>

          {/* ── Submit review form ── */}
          {showForm && (
            <div className="review-form-card">
              <h3>Share Your Experience</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Select Booking <span>*</span></label>
                  <select className="form-control" value={form.booking_id} onChange={e => setForm(f => ({ ...f, booking_id: e.target.value }))} required>
                    <option value="">-- Select completed booking --</option>
                    {bookings.map(b => (
                      <option key={b.id} value={b.id}>
                        #{b.booking_number} — {b.service_type?.replace(/_/g,' ')} — {b.journey_date}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Your Rating <span>*</span></label>
                  <Stars n={form.rating} interactive onRate={r => setForm(f => ({ ...f, rating: r }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Your Review</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Share your experience with other customers…"
                    value={form.comment}
                    onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}

          {/* ── Reviews grid ── */}
          {loading ? (
            <LoadingSpinner />
          ) : reviews.length === 0 ? (
            <div className="reviews-empty">
              <span>⭐</span>
              <p>No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="reviews-grid">
              {reviews.map((r, i) => (
                <div className="review-card" key={r.id || i}>
                  <div className="review-card-header">
                    <div className="reviewer-avatar">
                      {(r.customer_name || r.name || 'C').charAt(0)}
                    </div>
                    <div>
                      <div className="reviewer-name">{r.customer_name || r.name}</div>
                      <div className="reviewer-service">{r.service_type?.replace(/_/g,' ')}</div>
                    </div>
                    <div className="review-date">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : ''}</div>
                  </div>
                  <Stars n={r.rating} />
                  <p className="review-comment">"{r.comment || r.text}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
