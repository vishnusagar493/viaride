/**
 * Services Page – VIAROAD
 * ════════════════════════════════════════════
 * Displays the three VIAROAD services in detail:
 *  1. Car with Driver
 *  2. Bike with Driver
 *  3. Self-Drive Bike Rental
 *
 * Each service section includes:
 *  - Description, features list, pricing note
 *  - Booking details / what to expect
 *  - CTA button linking to the booking page
 *
 * Also shows live vehicle fleet fetched from API.
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import VehicleCard from '../../components/VehicleCard/VehicleCard'
import LoadingSpinner from '../../components/Notification/LoadingSpinner'
import './Services.css'

const SERVICES = [
  {
    id: 'car_with_driver',
    icon: '🚗',
    title: 'Car with Driver',
    tagline: 'Comfortable & Professional',
    description:
      'Book a clean, air-conditioned car with a verified, professional driver. Perfect for airport transfers, corporate travel, outstation trips, family journeys and more. Our drivers are trained for safety and punctuality.',
    features: [
      'AC Sedan / SUV',
      'Verified Professional Driver',
      'City & Outstation Rides',
      'Airport Pick-up & Drop',
      'Flexible Booking — Up to 3 Months Ahead',
      'UPI or Cash Payment',
    ],
    bookingFields: ['Pickup Location', 'Destination', 'Journey Date', 'Pickup Time', 'Number of Passengers', 'Special Instructions'],
    link: '/book',
    color: '#0f2a4e',
  },
  {
    id: 'bike_with_driver',
    icon: '🏍️',
    title: 'Bike with Driver',
    tagline: 'Fast, Affordable City Rides',
    description:
      'Need to get somewhere quickly without dealing with traffic? Book a motorbike with a professional rider. Ideal for solo city commutes, quick errands and short-distance trips. Affordable, fast and safe.',
    features: [
      'Helmets Provided',
      'City Rides — All Areas',
      'Quick Pickup',
      'Affordable Fares',
      'Professional Rider',
      'UPI or Cash Payment',
    ],
    bookingFields: ['Pickup Location', 'Destination', 'Journey Date', 'Pickup Time', 'Passenger Details'],
    link: '/book',
    color: '#1e5fad',
  },
  {
    id: 'self_drive_bike',
    icon: '🛵',
    title: 'Self-Drive Bike Rental',
    tagline: 'Ride on Your Own Schedule',
    description:
      'Rent a well-maintained scooter or motorbike and drive at your own pace. No driver needed — just a valid licence, your identity documents and a refundable security deposit. Hourly, half-day and daily rates available.',
    features: [
      'Hourly, Half-Day & Daily Rentals',
      'Well-Maintained Bikes',
      'Aadhaar + Licence Verified',
      '₹2,000 Refundable Security Deposit',
      'Flexible Return Time',
      'Physical Key Handover',
    ],
    bookingFields: ['Rental Start Date & Time', 'Rental End Date & Time', 'Aadhaar Card (upload)', 'Driving Licence (upload)', 'PAN Card (upload)', '₹2,000 Security Deposit'],
    link: '/bike-rental',
    color: '#c9a84c',
  },
]

export default function Services() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/vehicles?available=true')
      .then(r => setVehicles(r.data.data.vehicles || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="services-page">

      {/* ── Banner ── */}
      <div className="page-banner">
        <div className="container">
          <h1>Our Services</h1>
          <p>Three flexible travel options for every need and budget</p>
        </div>
      </div>

      {/* ── Service Details ── */}
      {SERVICES.map((svc, i) => (
        <section
          key={svc.id}
          className={`section service-detail ${i % 2 !== 0 ? 'service-detail-alt' : ''}`}
          id={svc.id}
        >
          <div className="container service-detail-grid">

            {/* Text side */}
            <div className="service-detail-text">
              <span className="label-tag">{svc.tagline}</span>
              <div className="service-detail-title-row">
                <span className="service-detail-icon">{svc.icon}</span>
                <h2 className="section-title">{svc.title}</h2>
              </div>
              <div className="divider" style={{margin:'16px 0 20px'}}/>
              <p className="service-detail-desc">{svc.description}</p>

              {/* Features */}
              <div className="service-detail-features">
                <h4>What's Included</h4>
                <ul>
                  {svc.features.map(f => (
                    <li key={f}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{color: svc.color}}><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <Link to={svc.link} className="btn btn-primary btn-lg" style={{marginTop:'28px', display:'inline-flex'}}>
                Book {svc.title} →
              </Link>
            </div>

            {/* Booking info side */}
            <div className="service-detail-info">
              <div className="booking-info-card" style={{borderTop: `4px solid ${svc.color}`}}>
                <h3>📋 Booking Requirements</h3>
                <p>When booking this service, you'll need to provide:</p>
                <ul className="booking-fields-list">
                  {svc.bookingFields.map(f => (
                    <li key={f}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {svc.id === 'self_drive_bike' && (
                  <div className="deposit-notice">
                    <strong>⚠️ Security Deposit Notice</strong>
                    <p>A refundable deposit of <strong>₹2,000</strong> is required for self-drive rentals. This is separate from the rental charge and is refunded after vehicle inspection at return.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── Available Fleet ── */}
      <section className="section" style={{background:'var(--off-white)'}}>
        <div className="container">
          <div className="section-header">
            <span className="label-tag">Ready to Ride</span>
            <h2 className="section-title">Available Vehicles</h2>
            <div className="divider"/>
            <p className="section-subtitle" style={{marginTop:'14px'}}>
              Our current fleet — all verified, maintained and ready to go.
            </p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : vehicles.length === 0 ? (
            <p style={{textAlign:'center', color:'var(--text-light)', padding:'40px 0'}}>
              No vehicles available right now. Please check back soon.
            </p>
          ) : (
            <div className="services-fleet-grid">
              {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Pricing Note ── */}
      <section className="section pricing-note-section">
        <div className="container">
          <div className="pricing-note-box">
            <h3>💰 Transparent Pricing Policy</h3>
            <p>
              All prices shown are base fares. Final fare depends on distance, duration and any additional charges
              that may apply. You will see the estimated total <strong>before confirming your booking</strong>.
              No hidden charges. No surprises.
            </p>
            <p style={{marginTop:'10px'}}>
              For outstation trips or special requirements, contact us at{' '}
              <a href="tel:9867998094"><strong>9867998094</strong></a>.
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
