/**
 * BookRide Page (Protected)
 * ════════════════════════════════════════════
 * 4-step booking wizard:
 *   Step 1 – Choose service type
 *   Step 2 – Select vehicle
 *   Step 3 – Enter journey details + date/time
 *   Step 4 – Choose payment method + confirm
 *
 * Uses date-fns to enforce:
 *   - No past dates
 *   - Max 90 days ahead (configurable)
 *
 * On submit: POST /api/bookings
 * If online_upi: prompts user to upload payment screenshot.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { addDays, isWeekend } from 'date-fns'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import VehicleCard from '../../components/VehicleCard/VehicleCard'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/Notification/LoadingSpinner'
import './BookRide.css'

const SERVICE_TYPES = [
  { id:'car_with_driver',  label:'Car with Driver',  icon:'🚗', desc:'Comfortable car ride with a verified professional driver.' },
  { id:'bike_with_driver', label:'Bike with Driver', icon:'🏍️', desc:'Quick, affordable city bike ride with a professional rider.' },
]

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 6
  const m = i % 2 === 0 ? '00' : '30'
  const label = `${h.toString().padStart(2,'0')}:${m}`
  return label
})

export default function BookRide() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]               = useState(1)
  const [serviceType, setServiceType] = useState('')
  const [vehicles, setVehicles]       = useState([])
  const [selectedVehicle, setSelected] = useState(null)
  const [journeyDate, setJourneyDate] = useState(null)
  const [pickupTime, setPickupTime]   = useState('')
  const [form, setForm]               = useState({ pickup_location:'', destination:'', num_passengers:1, special_instructions:'' })
  const [paymentMethod, setPayment]   = useState('')
  const [loading, setLoading]         = useState(false)
  const [qrUrl, setQrUrl]             = useState('')
  const [booking, setBooking]         = useState(null)
  const [screenshot, setScreenshot]   = useState(null)
  const [txnRef, setTxnRef]           = useState('')
  const [uploading, setUploading]     = useState(false)
  const [vehicleLoading, setVehicleLoading] = useState(false)

  const today = new Date()
  const maxDate = addDays(today, 90)

  /* Fetch QR code */
  useEffect(() => {
    api.get('/payments/qr').then(r => setQrUrl(r.data.data.qr_url || '')).catch(() => {})
  }, [])

  /* Fetch vehicles when service type changes */
  useEffect(() => {
    if (!serviceType) return
    setVehicleLoading(true)
    api.get(`/vehicles?category=${serviceType}&available=true`)
      .then(r => { setVehicles(r.data.data.vehicles || []); setSelected(null) })
      .catch(() => {})
      .finally(() => setVehicleLoading(false))
  }, [serviceType])

  const handleFormChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  /* Step 3 → 4: estimate price */
  const estimatedAmount = selectedVehicle
    ? (selectedVehicle.base_price || 0)
    : 0

  const handleBook = async () => {
    if (!form.pickup_location.trim() || !journeyDate || !pickupTime || !paymentMethod) {
      toast.error('Please fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        vehicle_id: selectedVehicle.id,
        service_type: serviceType,
        pickup_location: form.pickup_location,
        destination: form.destination,
        journey_date: journeyDate.toISOString().split('T')[0],
        pickup_time: pickupTime,
        num_passengers: form.num_passengers,
        special_instructions: form.special_instructions,
        payment_method: paymentMethod,
        estimated_amount: estimatedAmount,
      }
      const res = await api.post('/bookings', payload)
      setBooking(res.data.data.booking)
      setStep(5)
      toast.success('Booking submitted! Awaiting admin approval.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadPayment = async () => {
    if (!screenshot) { toast.error('Please select the payment screenshot.'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('screenshot', screenshot)
    fd.append('booking_id', booking.id)
    fd.append('transaction_ref', txnRef)
    fd.append('payment_type', 'booking_payment')
    try {
      await api.post('/payments', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Payment screenshot uploaded! Admin will verify soon.')
      navigate('/my-account')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bookride-page">
      <div className="page-banner">
        <div className="container">
          <h1>Book a Ride</h1>
          <p>Car with Driver • Bike with Driver</p>
        </div>
      </div>

      <section className="section">
        <div className="container">

          {/* Progress Steps */}
          {step < 5 && (
            <div className="booking-steps" aria-label="Booking progress">
              {['Service','Vehicle','Journey','Payment'].map((label, i) => (
                <div key={label} className={`booking-step ${step > i + 1 ? 'step-done' : ''} ${step === i + 1 ? 'step-active' : ''}`}>
                  <div className="step-circle">{step > i + 1 ? '✓' : i + 1}</div>
                  <span className="step-label">{label}</span>
                  {i < 3 && <div className="step-line"/>}
                </div>
              ))}
            </div>
          )}

          <div className="booking-content">

            {/* ── STEP 1: Service Type ── */}
            {step === 1 && (
              <div className="booking-step-panel">
                <h2>Select Your Service</h2>
                <p>Choose the type of ride you need.</p>
                <div className="service-select-grid">
                  {SERVICE_TYPES.map(s => (
                    <button
                      key={s.id}
                      className={`service-select-card ${serviceType === s.id ? 'selected' : ''}`}
                      onClick={() => setServiceType(s.id)}
                    >
                      <span className="service-select-icon">{s.icon}</span>
                      <strong>{s.label}</strong>
                      <p>{s.desc}</p>
                    </button>
                  ))}
                </div>
                <div className="step-actions">
                  <button className="btn btn-primary btn-lg" onClick={() => setStep(2)} disabled={!serviceType}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Select Vehicle ── */}
            {step === 2 && (
              <div className="booking-step-panel">
                <h2>Select a Vehicle</h2>
                <p>Choose from available vehicles for <strong>{SERVICE_TYPES.find(s => s.id === serviceType)?.label}</strong>.</p>
                {vehicleLoading ? <LoadingSpinner /> : (
                  vehicles.length === 0 ? (
                    <div className="no-vehicles">
                      <span>😔</span>
                      <p>No vehicles available for this service right now. Please try again later or contact us.</p>
                    </div>
                  ) : (
                    <div className="vehicle-select-grid">
                      {vehicles.map(v => (
                        <VehicleCard key={v.id} vehicle={v} onSelect={setSelected} selected={selectedVehicle?.id === v.id} />
                      ))}
                    </div>
                  )
                )}
                <div className="step-actions">
                  <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-primary btn-lg" onClick={() => setStep(3)} disabled={!selectedVehicle}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Journey Details ── */}
            {step === 3 && (
              <div className="booking-step-panel">
                <h2>Journey Details</h2>
                <div className="journey-form-grid">
                  <div className="journey-form">
                    <div className="form-group">
                      <label className="form-label">Pickup Location <span>*</span></label>
                      <input name="pickup_location" type="text" className="form-control" placeholder="Enter full pickup address or landmark" value={form.pickup_location} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Destination</label>
                      <input name="destination" type="text" className="form-control" placeholder="Where are you going?" value={form.destination} onChange={handleFormChange} />
                    </div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label">Journey Date <span>*</span></label>
                        <DatePicker
                          selected={journeyDate}
                          onChange={d => setJourneyDate(d)}
                          minDate={today}
                          maxDate={maxDate}
                          placeholderText="Select date"
                          className="form-control"
                          dateFormat="dd/MM/yyyy"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Pickup Time <span>*</span></label>
                        <select className="form-control" value={pickupTime} onChange={e => setPickupTime(e.target.value)} required>
                          <option value="">-- Select time --</option>
                          {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    {serviceType === 'car_with_driver' && (
                      <div className="form-group">
                        <label className="form-label">Number of Passengers</label>
                        <select className="form-control" name="num_passengers" value={form.num_passengers} onChange={handleFormChange}>
                          {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Special Instructions</label>
                      <textarea name="special_instructions" className="form-control" rows="3" placeholder="Any special requirements or notes for the driver?" value={form.special_instructions} onChange={handleFormChange} />
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="journey-summary">
                    <h4>Booking Summary</h4>
                    <div className="summary-item"><span>Service</span><strong>{SERVICE_TYPES.find(s => s.id === serviceType)?.label}</strong></div>
                    <div className="summary-item"><span>Vehicle</span><strong>{selectedVehicle?.vehicle_name}</strong></div>
                    <div className="summary-item"><span>Base Fare</span><strong>₹{estimatedAmount}</strong></div>
                    <div className="summary-divider"/>
                    <div className="summary-item summary-total"><span>Estimated Total</span><strong>₹{estimatedAmount}</strong></div>
                    <p className="summary-note">* Final amount may vary based on distance and additional charges.</p>
                  </div>
                </div>

                <div className="step-actions">
                  <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
                  <button className="btn btn-primary btn-lg" onClick={() => setStep(4)} disabled={!form.pickup_location || !journeyDate || !pickupTime}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Payment ── */}
            {step === 4 && (
              <div className="booking-step-panel">
                <h2>Select Payment Method</h2>
                <div className="payment-method-grid">
                  <button className={`payment-method-card ${paymentMethod === 'online_upi' ? 'selected' : ''}`} onClick={() => setPayment('online_upi')}>
                    <span className="payment-icon">📱</span>
                    <strong>Online UPI</strong>
                    <p>Scan QR code and upload payment screenshot</p>
                  </button>
                  <button className={`payment-method-card ${paymentMethod === 'cash' ? 'selected' : ''}`} onClick={() => setPayment('cash')}>
                    <span className="payment-icon">💵</span>
                    <strong>Cash</strong>
                    <p>Pay cash to the driver after your journey</p>
                  </button>
                </div>

                <div className="step-actions">
                  <button className="btn btn-outline" onClick={() => setStep(3)}>← Back</button>
                  <button className="btn btn-gold btn-lg" onClick={handleBook} disabled={!paymentMethod || loading}>
                    {loading ? 'Confirming…' : '✓ Confirm Booking'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 5: Post-booking ── */}
            {step === 5 && booking && (
              <div className="booking-step-panel booking-success">
                <div className="success-icon">🎉</div>
                <h2>Booking Submitted!</h2>
                <p>Your Booking ID: <strong>#{booking.booking_number}</strong></p>
                <p>Status: <strong>Pending Admin Approval</strong></p>

                {booking.payment_method === 'online_upi' && (
                  <div className="qr-payment-section">
                    <h3>Complete Your Payment</h3>
                    <p>Scan the QR code below and pay <strong>₹{booking.estimated_amount}</strong>. Then upload the screenshot.</p>
                    {qrUrl && <img src={qrUrl} alt="UPI QR Code" className="qr-image" />}
                    <div className="form-group" style={{maxWidth:'400px',margin:'0 auto 16px'}}>
                      <label className="form-label">Transaction Reference</label>
                      <input type="text" className="form-control" placeholder="UTR / Transaction ID" value={txnRef} onChange={e => setTxnRef(e.target.value)} />
                    </div>
                    <div className="form-group" style={{maxWidth:'400px',margin:'0 auto 16px'}}>
                      <label className="form-label">Payment Screenshot <span>*</span></label>
                      <input type="file" className="form-control" accept="image/*" onChange={e => setScreenshot(e.target.files[0])} />
                    </div>
                    <button className="btn btn-primary btn-lg" onClick={handleUploadPayment} disabled={uploading}>
                      {uploading ? 'Uploading…' : 'Upload Payment Proof'}
                    </button>
                  </div>
                )}

                {booking.payment_method === 'cash' && (
                  <div className="cash-info">
                    <p>✅ Cash payment selected. Pay your driver at the end of your journey.</p>
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/my-account')}>
                      View My Bookings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
