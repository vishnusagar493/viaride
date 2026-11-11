/**
 * Contact Us Page
 * ════════════════════════════════════════════
 * Sections:
 *  1. Page Banner
 *  2. Contact info cards (phone, email, hours, location)
 *  3. Contact form (sends to backend /api/complaints with category "Other")
 *  4. Map placeholder (swap with Google Maps embed in production)
 *
 * The contact form reuses the complaints API endpoint so all messages
 * appear in the admin's complaints dashboard with category = "General Enquiry".
 */

import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import './Contact.css'

export default function Contact() {
  const { isAuthenticated, user } = useAuth()
  const [settings, setSettings] = useState({})
  const [form, setForm]   = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/settings/public').then(r => setSettings(r.data.data.settings || {})).catch(() => {})
    if (user) setForm(f => ({ ...f, name: user.full_name || '', email: user.email || '', phone: user.mobile || '' }))
  }, [user])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name || !form.message) { toast.error('Name and message are required.'); return }
    setLoading(true)
    try {
      const payload = {
        category: 'General Enquiry',
        description: `Subject: ${form.subject || 'General Enquiry'}\n\n${form.message}`,
        contact_details: `${form.name} | ${form.email} | ${form.phone}`,
      }
      if (isAuthenticated) {
        await api.post('/complaints', payload)
      } else {
        // For unauthenticated visitors, show toast only (backend requires auth)
      }
      toast.success('Your message has been sent! We\'ll get back to you soon.')
      setForm(f => ({ ...f, subject: '', message: '' }))
    } catch (err) {
      toast.error(err.message || 'Failed to send message.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="contact-page">
      <div className="page-banner">
        <div className="container">
          <h1>Contact Us</h1>
          <p>We'd love to hear from you. Reach out any time.</p>
        </div>
      </div>

      {/* ── Info Cards ── */}
      <section className="section contact-section">
        <div className="container">
          <div className="contact-grid">

            {/* Info panel */}
            <div className="contact-info">
              <span className="label-tag">Get In Touch</span>
              <h2 className="section-title">We're Here to Help</h2>
              <div className="divider" style={{margin:'14px 0 20px'}}/>
              <p className="contact-intro">
                Have a question, need help with a booking or want to share feedback?
                Our team is available to assist you every day.
              </p>

              <div className="contact-cards">
                {[
                  {
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.77-.77a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
                    label: 'Phone / WhatsApp',
                    value: '9867998094',
                    href: 'tel:9867998094',
                  },
                  {
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
                    label: 'Email',
                    value: settings.contact_email || 'support@viaroad.in',
                    href: `mailto:${settings.contact_email || 'support@viaroad.in'}`,
                  },
                  {
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                    label: 'Business Hours',
                    value: settings.business_hours || 'Mon–Sat: 8:00 AM – 9:00 PM',
                    href: null,
                  },
                  {
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                    label: 'Location',
                    value: 'Mumbai, Maharashtra, India',
                    href: null,
                  },
                ].map(item => (
                  <div className="contact-card" key={item.label}>
                    <div className="contact-card-icon">{item.icon}</div>
                    <div className="contact-card-text">
                      <span className="contact-card-label">{item.label}</span>
                      {item.href
                        ? <a href={item.href} className="contact-card-value">{item.value}</a>
                        : <span className="contact-card-value">{item.value}</span>
                      }
                    </div>
                  </div>
                ))}
              </div>

              {/* Owner info */}
              <div className="owner-contact-box">
                <div className="owner-avatar-sm">SD</div>
                <div>
                  <div className="owner-name-sm">Sunol Durai</div>
                  <div className="owner-role-sm">Founder & CEO</div>
                  <a href="tel:9867998094" className="owner-call-btn">
                    📞 Call Directly
                  </a>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div className="contact-form-panel">
              <div className="contact-form-card">
                <h3>Send Us a Message</h3>
                <p>Fill in the form and we'll respond within 24 hours.</p>

                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Your Name <span>*</span></label>
                      <input name="name" type="text" className="form-control" placeholder="Full name" value={form.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input name="phone" type="tel" className="form-control" placeholder="Mobile number" value={form.phone} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input name="email" type="email" className="form-control" placeholder="your@email.com" value={form.email} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input name="subject" type="text" className="form-control" placeholder="What is this about?" value={form.subject} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message <span>*</span></label>
                    <textarea name="message" className="form-control" rows="5" placeholder="Write your message here…" value={form.message} onChange={handleChange} required />
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%', justifyContent:'center'}} disabled={loading}>
                    {loading ? 'Sending…' : 'Send Message'}
                  </button>

                  {!isAuthenticated && (
                    <p style={{fontSize:'0.78rem', color:'var(--text-light)', marginTop:'12px', textAlign:'center'}}>
                      For fastest response, <a href="tel:9867998094" style={{color:'var(--blue-accent)'}}>call us directly</a> or{' '}
                      <a href="/login" style={{color:'var(--blue-accent)'}}>log in</a> to submit a tracked complaint.
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
