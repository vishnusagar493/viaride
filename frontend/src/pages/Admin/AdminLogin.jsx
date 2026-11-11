/**
 * AdminLogin Page
 * ════════════════
 * Separate login for administrators.
 * Uses /api/admin/auth/login endpoint.
 * Redirects to /admin/dashboard on success.
 * This page is NOT linked from the public navbar — admin accesses it directly at /admin/login.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import './Admin.css'

export default function AdminLogin() {
  const { adminLogin, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (isAdmin) navigate('/admin/dashboard', { replace: true })
  }, [isAdmin, navigate])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    try {
      await adminLogin(email, password)
      toast.success('Admin login successful!')
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <span>🛡️</span>
          <span className="logo-text"><span style={{color:'#fff'}}>VIA</span><span style={{color:'#c9a84c'}}>ROAD</span></span>
        </div>
        <h1>Admin Portal</h1>
        <p>Secure access for authorised administrators only.</p>

        {error && (
          <div className="alert alert-error" style={{marginBottom:'16px'}} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{color:'rgba(255,255,255,0.85)'}}>Admin Email</label>
            <input
              type="email"
              className="form-control admin-input"
              placeholder="admin@viaroad.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{color:'rgba(255,255,255,0.85)'}}>Password</label>
            <div style={{position:'relative'}}>
              <input
                type={showPw ? 'text' : 'password'}
                className="form-control admin-input"
                placeholder="Admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{paddingRight:'44px'}}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer'}}
                aria-label="Toggle password"
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-gold btn-lg"
            style={{width:'100%', justifyContent:'center', marginTop:'8px'}}
            disabled={loading}
          >
            {loading ? 'Signing In…' : '🔐 Sign In to Admin Panel'}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/" style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>← Back to Website</a>
        </div>
      </div>
    </div>
  )
}
