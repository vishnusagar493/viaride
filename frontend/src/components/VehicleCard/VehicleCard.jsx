/**
 * VehicleCard Component
 * ──────────────────────
 * Renders a single vehicle in a card layout.
 * Used on: Home (fleet preview), Services page, BookRide page.
 *
 * Props:
 *   vehicle  {object}  – vehicle DB row (name, category, base_price, image_url…)
 *   onSelect {fn}      – optional callback when "Book" is clicked
 *   selected {bool}    – highlights card when true (used on booking form)
 *
 * Accessibility:
 *   The card uses role="article" so screen readers announce it as a distinct item.
 *   The category label provides context without relying on colour alone.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import './VehicleCard.css'

/* Map DB category slug → human-readable label */
const CATEGORY_LABELS = {
  car_with_driver:  'Car with Driver',
  bike_with_driver: 'Bike with Driver',
  self_drive_bike:  'Self-Drive Rental',
}

/* Map category → emoji icon */
const CATEGORY_ICONS = {
  car_with_driver:  '🚗',
  bike_with_driver: '🏍️',
  self_drive_bike:  '🛵',
}

const VehicleCard = ({ vehicle, onSelect, selected = false }) => {
  const {
    id, vehicle_name, registration_number, category,
    seating_capacity, fuel_type, base_price, price_per_km,
    daily_rate, image_url, is_available, is_under_maintenance,
    features = [],
  } = vehicle

  const categoryLabel = CATEGORY_LABELS[category] || category
  const icon          = CATEGORY_ICONS[category]   || '🚗'
  const bookLink      = category === 'self_drive_bike' ? '/bike-rental' : '/book'

  /* Determine availability status badge */
  const statusBadge = is_under_maintenance
    ? { text: 'Under Maintenance', cls: 'vehicle-status-maintenance' }
    : is_available
      ? { text: 'Available',        cls: 'vehicle-status-available' }
      : { text: 'Unavailable',      cls: 'vehicle-status-unavailable' }

  return (
    <article
      className={`vehicle-card ${selected ? 'vehicle-card-selected' : ''} ${!is_available || is_under_maintenance ? 'vehicle-card-disabled' : ''}`}
      role="article"
      aria-label={`${vehicle_name} — ${categoryLabel}`}
    >
      {/* ── Image ── */}
      <div className="vehicle-img-wrap">
        {image_url ? (
          <img
            src={image_url}
            alt={vehicle_name}
            className="vehicle-img"
            loading="lazy"
          />
        ) : (
          <div className="vehicle-img-placeholder" aria-hidden="true">
            <span>{icon}</span>
          </div>
        )}
        <span className={`vehicle-status ${statusBadge.cls}`}>{statusBadge.text}</span>
        <span className="vehicle-category-tag">{icon} {categoryLabel}</span>
      </div>

      {/* ── Details ── */}
      <div className="vehicle-body">
        <h3 className="vehicle-name">{vehicle_name}</h3>
        <p className="vehicle-reg">{registration_number}</p>

        <div className="vehicle-specs">
          <span className="spec-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {seating_capacity} Seat{seating_capacity > 1 ? 's' : ''}
          </span>
          <span className="spec-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="16" r="1"/></svg>
            {fuel_type}
          </span>
        </div>

        {/* Pricing */}
        <div className="vehicle-pricing">
          {base_price > 0 && (
            <div className="price-item">
              <span className="price-value">₹{base_price}</span>
              <span className="price-label">Base Fare</span>
            </div>
          )}
          {price_per_km > 0 && (
            <div className="price-item">
              <span className="price-value">₹{price_per_km}/km</span>
              <span className="price-label">Per KM</span>
            </div>
          )}
          {daily_rate > 0 && (
            <div className="price-item">
              <span className="price-value">₹{daily_rate}/day</span>
              <span className="price-label">Daily Rate</span>
            </div>
          )}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <ul className="vehicle-features">
            {features.slice(0, 3).map(f => (
              <li key={f}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {f}
              </li>
            ))}
          </ul>
        )}

        {/* Action */}
        {onSelect ? (
          <button
            className={`btn ${selected ? 'btn-gold' : 'btn-primary'}`}
            onClick={() => onSelect(vehicle)}
            disabled={!is_available || is_under_maintenance}
            style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
          >
            {selected ? '✓ Selected' : 'Select This Vehicle'}
          </button>
        ) : (
          <Link
            to={bookLink}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
            aria-disabled={!is_available || is_under_maintenance}
          >
            {is_available && !is_under_maintenance ? 'Book Now' : 'Unavailable'}
          </Link>
        )}
      </div>
    </article>
  )
}

export default VehicleCard
