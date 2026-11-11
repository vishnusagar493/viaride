/**
 * Login Page
 * ═══════════════════════════════════════════
 * Features:
 *  - Email or mobile login (backend accepts both)
 *  - Password visibility toggle
 *  - "Remember me" checkbox (UX hint — cookie is already persistent)
 *  - Redirects to original page if user was sent here from a protected route
 *  - Already-authenticated users are redirected away immediately
 */

import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import './Login.css'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname || '/'

  const [form, setForm]     = useState({ identifier: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  /* Redirect if already logged in */
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.identifier || !form.password) {
      setError('Please enter your email/mobile and password.')
      return
    }
    setLoading(true)
    try {
      await login(form.identifier.trim(), form.password)
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-split">

        {/* Left: branding panel (hidden on mobile) */}
        <div className="auth-brand hide-mobile">
          <div className="auth-brand-inner">
            <div className="auth-brand-logo">
              <span>VIA</span><span style={{color:'#c9a84c'}}>ROAD</span>
            </div>
            <h2>Welcome Back!</h2>
            <p>Log in to manage your bookings, track your rides and access exclusive member benefits.</p>
            <div className="auth-brand-features">
              {['Easy booking management','Real-time status updates','Payment history','24/7 support'].map(f => (
                <div className="auth-feature" key={f}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-form-header">
              <Link to="/" className="auth-logo-sm">🚗 VIAROAD</Link>
              <h1>Sign In</h1>
              <p>Don't have an account? <Link to="/register" className="auth-link">Register free</Link></p>
            </div>

            {error && (
              <div className="alert alert-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="identifier">
                  Email or Mobile Number <span>*</span>
                </label>
                <div className="input-icon-wrap">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    className="form-control input-with-icon"
                    placeholder="Enter email or 10-digit mobile"
                    value={form.identifier}
                    onChange={handleChange}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password <span>*</span>
                </label>
                <div className="input-icon-wrap">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    className="form-control input-with-icon input-with-btn"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw(s => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{width:'100%', justifyContent:'center', marginTop:'8px'}}
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner spinner-sm" style={{borderTopColor:'#fff'}}></span> Signing In…</>
                ) : 'Sign In to VIAROAD'}
              </button>
            </form>

            <p className="auth-footer-note">
              By signing in, you agree to our{' '}
              <a href="#">Terms of Service</a> and{' '}
              <a href="#">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
