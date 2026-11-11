/**
 * Register Page
 * ═══════════════════════════════════════════
 * Features:
 *  - Full client-side validation before API call
 *  - Password strength indicator
 *  - Password / confirm-password match check
 *  - WhatsApp notification consent checkbox
 *  - Terms & Conditions acceptance
 *  - Redirects to home after successful registration
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import '../Login/Login.css'
import './Register.css'

/* Password strength scorer */
const getStrength = pw => {
  let score = 0
  if (pw.length >= 8)  score++
  if (/[A-Z]/.test(pw)) score++
  if (/[a-z]/.test(pw)) score++
  if (/\d/.test(pw))    score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#16a34a']

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '', email: '', mobile: '',
    password: '', confirm_password: '',
    whatsapp_consent: false, terms: false,
  })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})

  const strength = getStrength(form.password)

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setErrors(er => ({ ...er, [name]: '' }))
  }

  /* Client-side validation */
  const validate = () => {
    const e = {}
    if (!form.full_name.trim())           e.full_name        = 'Full name is required.'
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email            = 'Valid email is required.'
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile          = 'Enter a valid 10-digit Indian mobile number.'
    if (form.password.length < 8)          e.password         = 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(form.password))      e.password         = 'Password must contain at least one uppercase letter.'
    if (!/\d/.test(form.password))         e.password         = 'Password must contain at least one number.'
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match.'
    if (!form.terms)                       e.terms            = 'You must accept the Terms & Conditions.'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        whatsapp_consent: form.whatsapp_consent,
      })
      toast.success('Account created! Welcome to VIAROAD.')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-split">

        {/* Brand panel */}
        <div className="auth-brand hide-mobile">
          <div className="auth-brand-inner">
            <div className="auth-brand-logo">VIA<span style={{color:'#c9a84c'}}>ROAD</span></div>
            <h2>Join VIAROAD Today!</h2>
            <p>Create your free account and enjoy seamless travel booking, real-time tracking and exclusive benefits.</p>
            <div className="auth-brand-features">
              {['Free account creation','Instant booking confirmation','Secure UPI & Cash payments','WhatsApp booking alerts'].map(f => (
                <div className="auth-feature" key={f}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-form-header">
              <Link to="/" className="auth-logo-sm">🚗 VIAROAD</Link>
              <h1>Create Account</h1>
              <p>Already registered? <Link to="/login" className="auth-link">Sign In</Link></p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="full_name">Full Name <span>*</span></label>
                <input id="full_name" name="full_name" type="text" className={`form-control ${errors.full_name ? 'error' : ''}`} placeholder="Your full name" value={form.full_name} onChange={handleChange} autoComplete="name" />
                {errors.full_name && <p className="form-error">{errors.full_name}</p>}
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email Address <span>*</span></label>
                <input id="reg-email" name="email" type="email" className={`form-control ${errors.email ? 'error' : ''}`} placeholder="your@email.com" value={form.email} onChange={handleChange} autoComplete="email" />
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              {/* Mobile */}
              <div className="form-group">
                <label className="form-label" htmlFor="mobile">Mobile Number <span>*</span></label>
                <div className="mobile-input-wrap">
                  <span className="mobile-prefix">+91</span>
                  <input id="mobile" name="mobile" type="tel" className={`form-control ${errors.mobile ? 'error' : ''}`} placeholder="10-digit mobile number" value={form.mobile} onChange={handleChange} maxLength={10} autoComplete="tel" />
                </div>
                {errors.mobile && <p className="form-error">{errors.mobile}</p>}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password <span>*</span></label>
                <div className="input-icon-wrap">
                  <input id="reg-password" name="password" type={showPw ? 'text' : 'password'} className={`form-control input-with-btn ${errors.password ? 'error' : ''}`} placeholder="Min. 8 chars, uppercase & number" value={form.password} onChange={handleChange} autoComplete="new-password" />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)} aria-label="Toggle password">
                    {showPw
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                {/* Strength bar */}
                {form.password && (
                  <div className="strength-bar-wrap">
                    <div className="strength-bar">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="strength-seg" style={{ background: i <= strength ? STRENGTH_COLORS[strength] : '#e2e8f0' }}/>
                      ))}
                    </div>
                    <span className="strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
                      {STRENGTH_LABELS[strength]}
                    </span>
                  </div>
                )}
                {errors.password && <p className="form-error">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="confirm_password">Confirm Password <span>*</span></label>
                <input id="confirm_password" name="confirm_password" type={showPw ? 'text' : 'password'} className={`form-control ${errors.confirm_password ? 'error' : ''}`} placeholder="Re-enter your password" value={form.confirm_password} onChange={handleChange} autoComplete="new-password" />
                {errors.confirm_password && <p className="form-error">{errors.confirm_password}</p>}
              </div>

              {/* WhatsApp consent */}
              <div className="checkbox-group" style={{marginBottom:'12px'}}>
                <input id="wa_consent" name="whatsapp_consent" type="checkbox" checked={form.whatsapp_consent} onChange={handleChange} />
                <label htmlFor="wa_consent">
                  📱 Send me booking updates on WhatsApp (optional but recommended)
                </label>
              </div>

              {/* Terms */}
              <div className="checkbox-group">
                <input id="terms" name="terms" type="checkbox" checked={form.terms} onChange={handleChange} />
                <label htmlFor="terms">
                  I agree to VIAROAD's <a href="#" className="auth-link">Terms of Service</a> and <a href="#" className="auth-link">Privacy Policy</a> <span style={{color:'var(--danger)'}}>*</span>
                </label>
              </div>
              {errors.terms && <p className="form-error" style={{marginTop:'-8px', marginBottom:'12px'}}>{errors.terms}</p>}

              <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%', justifyContent:'center', marginTop:'8px'}} disabled={loading}>
                {loading ? (
                  <><span className="spinner spinner-sm" style={{borderTopColor:'#fff'}}></span> Creating Account…</>
                ) : 'Create My VIAROAD Account'}
              </button>
            </form>

            <p className="auth-footer-note" style={{marginTop:'16px'}}>
              Your personal information is encrypted and protected. We never share your data with third parties without consent.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
