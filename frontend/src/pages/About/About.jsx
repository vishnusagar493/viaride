/**
 * About Us Page – VIAROAD
 * ════════════════════════════════════════════
 * Sections:
 *  1. Page Banner      – title + breadcrumb
 *  2. Company Intro    – text + image split layout
 *  3. Mission & Vision – side-by-side cards
 *  4. Our Values       – 3-column icon tiles
 *  5. Why Us Stats     – number highlights
 *  6. Commitment       – commitment statement block
 *
 * Responsive: 2-col split → stacked on mobile.
 */

import React from 'react'
import './About.css'

export default function About() {
  return (
    <div className="about-page">

      {/* ── Banner ── */}
      <div className="page-banner">
        <div className="container">
          <h1>About VIAROAD</h1>
          <p>Your Journey. Our Responsibility.</p>
        </div>
      </div>

      {/* ── Company Intro ── */}
      <section className="section about-intro">
        <div className="container about-intro-grid">
          <div className="about-intro-text">
            <span className="label-tag">Who We Are</span>
            <h2 className="section-title">VIAROAD – Redefining Travel in India</h2>
            <div className="divider" style={{margin:'16px 0'}}/>
            <p>
              VIAROAD is a transportation and vehicle booking startup based in India.
              Founded with a simple goal — make travelling easier and more reliable for
              everyone — we connect passengers with professional drivers and well-maintained
              vehicles at fair, transparent prices.
            </p>
            <p>
              Whether you need a comfortable car for an airport transfer, a quick bike ride
              across the city, or a self-drive scooter for the weekend, VIAROAD has you covered.
              Every ride is backed by our commitment to safety, punctuality and customer satisfaction.
            </p>
            <p>
              We are a team of passionate individuals who believe that transportation should be
              simple, affordable and trustworthy. With VIAROAD, you don't just book a ride —
              you start a journey with peace of mind.
            </p>
            <div className="about-owner-card">
              <div className="owner-avatar">SD</div>
              <div>
                <div className="owner-name">Sunol Durai</div>
                <div className="owner-role">Founder & CEO, VIAROAD</div>
                <a href="tel:9867998094" className="owner-phone">📞 9867998094</a>
              </div>
            </div>
          </div>

          <div className="about-intro-visual">
            <div className="about-visual-box">
              <div className="about-visual-main">
                <span className="about-big-icon">🚗</span>
                <h3>VIAROAD</h3>
                <p className="slogan-text">Your Journey. Our Responsibility.</p>
              </div>
              <div className="about-visual-stats">
                {[
                  { v:'500+', l:'Happy Customers' },
                  { v:'3',    l:'Services' },
                  { v:'100%', l:'Safe Rides' },
                ].map(s => (
                  <div className="about-stat" key={s.l}>
                    <strong>{s.v}</strong>
                    <span>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="section" style={{background:'var(--off-white)'}}>
        <div className="container">
          <div className="section-header">
            <span className="label-tag">Purpose & Direction</span>
            <h2 className="section-title">Our Mission & Vision</h2>
            <div className="divider"/>
          </div>

          <div className="mv-grid">
            <div className="mv-card mv-mission">
              <div className="mv-icon">🎯</div>
              <h3>Our Mission</h3>
              <p>
                To provide every Indian traveller with a safe, affordable and comfortable
                transportation experience through professional drivers, reliable vehicles and
                seamless online booking. We aim to make travel stress-free for everyone —
                from daily commuters to long-distance travellers.
              </p>
            </div>

            <div className="mv-card mv-vision">
              <div className="mv-icon">🔭</div>
              <h3>Our Vision</h3>
              <p>
                To become India's most trusted transportation service brand — known for
                safety, reliability and customer care. We envision a future where every
                journey booked through VIAROAD is a journey worth remembering, with
                transparent pricing and zero compromise on quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="section about-values">
        <div className="container">
          <div className="section-header">
            <span className="label-tag">What Drives Us</span>
            <h2 className="section-title">Our Core Values</h2>
            <div className="divider"/>
          </div>

          <div className="values-grid">
            {[
              { icon:'🛡️', title:'Safety',        desc:'Every driver is verified. Every vehicle is inspected. Your safety is our highest priority on every journey.' },
              { icon:'💎', title:'Quality',        desc:'We refuse to compromise. From the vehicle condition to driver behaviour, we maintain the highest standards.' },
              { icon:'🤝', title:'Trust',          desc:'Honest pricing, transparent policies and open communication. We build relationships, not just bookings.' },
              { icon:'⚡', title:'Convenience',    desc:'Simple booking, multiple payment options and instant notifications. We make it easy for you.' },
              { icon:'🌱', title:'Responsibility', desc:'Responsible business practices, customer data protection and environmental consciousness guide every decision.' },
              { icon:'💬', title:'Customer First', desc:'Every policy, feature and update is designed with one person in mind — you, our valued customer.' },
            ].map(v => (
              <div className="value-card" key={v.title}>
                <span className="value-icon">{v.icon}</span>
                <h4>{v.title}</h4>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commitment ── */}
      <section className="about-commitment">
        <div className="container">
          <div className="commitment-inner">
            <div className="commitment-text">
              <span className="label-tag" style={{color:'#c9a84c'}}>Our Promise</span>
              <h2>Our Commitment to You</h2>
              <p>
                At VIAROAD, we take our responsibility seriously. We are committed to delivering
                a service that you can rely on — every single time. From the moment you book to
                the moment you reach your destination, your satisfaction is our priority.
              </p>
              <ul className="commitment-list">
                {[
                  'Verified, professional drivers on every ride',
                  'Well-maintained, clean vehicles always',
                  'Transparent pricing with no hidden charges',
                  'Prompt customer support when you need it',
                  'Safe handling of your personal information',
                  'Fair refund policy for eligible cancellations',
                ].map(item => (
                  <li key={item}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="commitment-badge">
              <div className="commitment-circle">
                <span className="commitment-num">100%</span>
                <span className="commitment-label">Committed to<br/>Your Satisfaction</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
