import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import './Navbar.css'

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()
  const [menuOpen, setMenuOpen]       = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const [dropdownOpen, setDropdown]   = useState(false)
  const dropdownRef = useRef(null)

  /* Close everything on route change */
  useEffect(() => {
    setMenuOpen(false)
    setDropdown(false)
  }, [location.pathname])

  /* Detect scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Close dropdown on outside click */
  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdown(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  /* Prevent background scroll when mobile drawer is open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully.')
      navigate('/')
    } catch {
      toast.error('Logout failed.')
    }
  }

  /* Navbar is always solid — scrolled adds the stronger shadow */
  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container navbar-inner">

          {/* ── Logo ── */}
          <Link to="/" className="navbar-logo" aria-label="VIAROAD Home">
            <div className="logo-mark">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="#c9a84c" fillOpacity="0.18"/>
                <path d="M6 22L10 10L16 18L22 10L26 22" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="16" cy="7" r="2.5" fill="#c9a84c"/>
              </svg>
            </div>
            <span className="logo-text">
              <span className="logo-via">VIA</span><span className="logo-road">ROAD</span>
            </span>
          </Link>

          {/* ── Desktop nav links ── */}
          <ul className="navbar-links" role="menubar">
            {[
              { to: '/',        label: 'Home',     end: true },
              { to: '/about',   label: 'About',    end: false },
              { to: '/services',label: 'Services', end: false },
              { to: '/reviews', label: 'Reviews',  end: false },
              { to: '/contact', label: 'Contact',  end: false },
            ].map(({ to, label, end }) => (
              <li key={to} role="none">
                <NavLink
                  to={to}
                  end={end}
                  role="menuitem"
                  className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* ── Desktop actions ── */}
          <div className="navbar-actions">
            {isAuthenticated ? (
              <div className="user-menu" ref={dropdownRef}>
                <button
                  className="user-btn"
                  onClick={() => setDropdown(d => !d)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-label="Account menu"
                >
                  <span className="user-avatar-circle">
                    {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <span className="user-btn-name">{user?.full_name?.split(' ')[0]}</span>
                  <svg
                    className={`chevron-icon ${dropdownOpen ? 'rotated' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="dropdown-panel" role="menu">
                    <div className="dropdown-header">
                      <span className="dropdown-user-name">{user?.full_name}</span>
                      <span className="dropdown-user-email">{user?.email}</span>
                    </div>
                    <div className="dropdown-divider"/>
                    <Link to="/my-account" className="dropdown-item" role="menuitem">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      My Account
                    </Link>
                    <Link to="/book" className="dropdown-item" role="menuitem">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      Book a Ride
                    </Link>
                    <Link to="/bike-rental" className="dropdown-item" role="menuitem">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-1l-3 11-3-5H5"/><path d="M18.5 6H17l-1.5 5"/></svg>
                      Bike Rental
                    </Link>
                    <Link to="/complaints" className="dropdown-item" role="menuitem">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      My Complaints
                    </Link>
                    <div className="dropdown-divider"/>
                    <button onClick={handleLogout} className="dropdown-item dropdown-item-danger" role="menuitem">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-btns">
                <Link to="/login"    className="btn-nav-login">Login</Link>
                <Link to="/register" className="btn-nav-register">Register Free</Link>
              </div>
            )}
          </div>

          {/* ── Hamburger ── */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
          >
            <span className={`bar ${menuOpen ? 'bar-open-1' : ''}`}/>
            <span className={`bar ${menuOpen ? 'bar-open-2' : ''}`}/>
            <span className={`bar ${menuOpen ? 'bar-open-3' : ''}`}/>
          </button>
        </div>
      </nav>

      {/* ── Mobile backdrop ── */}
      {menuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        id="mobile-drawer"
        className={`mobile-drawer ${menuOpen ? 'drawer-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer top */}
        <div className="drawer-top">
          <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
            <div className="logo-mark">
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#c9a84c" fillOpacity="0.18"/>
                <path d="M6 22L10 10L16 18L22 10L26 22" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="16" cy="7" r="2.5" fill="#c9a84c"/>
              </svg>
            </div>
            <span className="logo-text">
              <span className="logo-via">VIA</span><span className="logo-road">ROAD</span>
            </span>
          </Link>
          <button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* User info if logged in */}
        {isAuthenticated && (
          <div className="drawer-user">
            <div className="drawer-user-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="drawer-user-info">
              <span className="drawer-user-name">{user?.full_name}</span>
              <span className="drawer-user-email">{user?.email}</span>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="drawer-nav">
          <span className="drawer-nav-label">Navigation</span>
          <NavLink to="/"         end onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </NavLink>
          <NavLink to="/about"    onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            About Us
          </NavLink>
          <NavLink to="/services" onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Services
          </NavLink>
          <NavLink to="/reviews"  onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Reviews
          </NavLink>
          <NavLink to="/contact"  onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.77-.77a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Contact
          </NavLink>

          {isAuthenticated && (
            <>
              <div className="drawer-section-divider">
                <span>My Account</span>
              </div>
              <NavLink to="/my-account"  onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                My Account
              </NavLink>
              <NavLink to="/book"       onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                Book a Ride
              </NavLink>
              <NavLink to="/bike-rental" onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-1l-3 11-3-5H5"/></svg>
                Bike Rental
              </NavLink>
              <NavLink to="/complaints" onClick={() => setMenuOpen(false)} className={({isActive}) => isActive ? 'drawer-link drawer-link-active' : 'drawer-link'}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                My Complaints
              </NavLink>
            </>
          )}
        </nav>

        {/* Drawer footer */}
        <div className="drawer-footer">
          {isAuthenticated ? (
            <button className="drawer-logout-btn" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          ) : (
            <div className="drawer-auth-btns">
              <Link to="/login"    className="drawer-btn-login"    onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="drawer-btn-register" onClick={() => setMenuOpen(false)}>Register Free</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Navbar
