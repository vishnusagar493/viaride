/**
 * BikeRental Page (Protected)
 * ════════════════════════════
 * Self-Drive Bike Rental booking flow:
 *  Step 1 – Pick rental dates & times
 *  Step 2 – Upload documents (Aadhaar, DL, PAN)
 *  Step 3 – Pay security deposit + rental via UPI QR
 *  Step 4 – Confirmation
 *
 * Security deposit (₹2,000) is kept separate from rental amount.
 * Admin must physically verify documents before key handover.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { addDays } from 'date-fns'
import api from '../../services/api'
import VehicleCard from '../../components/VehicleCard/VehicleCard'
import LoadingSpinner from '../../components/Notification/LoadingSpinner'
import toast from 'react-hot-toast'
import './BikeRental.css'
import '../BookRide/BookRide.css'

const SECURITY_DEPOSIT = 2000

export default function BikeRental() {
  const navigate = useNavigate()

  const [step, setStep]             = useState(1)
  const [vehicles, setVehicles]     = useState([])
  const [selectedVehicle, setSelected] = useState(null)
  const [startDate, setStartDate]   = useState(null)
  const [endDate, setEndDate]       = useState(null)
  const [paymentMethod, setPayment] = useState('online_upi')
  const [booking, setBooking]       = useState(null)
  const [qrUrl, setQrUrl]           = useState('')
  const [files, setFiles]           = useState({ aadhaar: null, driving_licence: null, pan_card: null })
  const [txnRef, setTxnRef]         = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [docUploading, setDocUploading] = useState(false)
  const [vehicleLoading, setVehicleLoading] = useState(true)

  const today  = new Date()
  const maxDate = addDays(today, 90)

  // Calculate rental days and total
  const rentalDays = startDate && endDate
    ? Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
    : 0
  const dailyRate    = selectedVehicle?.daily_rate || selectedVehicle?.base_price || 300
  const rentalAmount = rentalDays * dailyRate
  const totalAmount  = rentalAmount + SECURITY_DEPOSIT

  useEffect(() => {
    api.get('/vehicles?category=self_drive_bike&available=true')
      .then(r => setVehicles(r.data.data.vehicles || []))
      .catch(() => {})
      .finally(() => setVehicleLoading(false))

    api.get('/payments/qr')
      .then(r => setQrUrl(r.data.data.qr_url || ''))
      .catch(() => {})
  }, [])

  const handleFileChange = (name, file) => setFiles(f => ({ ...f, [name]: file }))

  // Step 1 → Create booking
  const handleCreateBooking = async () => {
    if (!selectedVehicle || !startDate || !endDate) {
      toast.error('Please select a vehicle and rental dates.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        vehicle_id: selectedVehicle.id,
        service_type: 'self_drive_bike',
        pickup_location: 'VIAROAD Office (Admin will provide address)',
        journey_date: startDate.toISOString().split('T')[0],
        pickup_time: '10:00',
        return_date: endDate.toISOString().split('T')[0],
        return_time: '18:00',
        estimated_amount: rentalAmount,
        payment_method: paymentMethod,
      }
      const res = await api.post('/bookings', payload)
      setBooking(res.data.data.booking)
      setStep(2)
      toast.success('Rental booking created. Please upload your documents.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 2 → Upload documents
  const handleUploadDocs = async () => {
    if (!files.aadhaar || !files.driving_licence || !files.pan_card) {
      toast.error('Please upload all three required documents.')
      return
    }
    setDocUploading(true)
    const fd = new FormData()
    fd.append('aadhaar', files.aadhaar)
    fd.append('driving_licence', files.driving_licence)
    fd.append('pan_card', files.pan_card)
    try {
      await api.post(`/rentals/${booking.id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Documents uploaded successfully!')
      setStep(3)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDocUploading(false)
    }
  }

  // Step 3 → Upload payment
  const handlePayment = async () => {
    if (!screenshot) { toast.error('Please upload your payment screenshot.'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('screenshot', screenshot)
    fd.append('booking_id', booking.id)
    fd.append('transaction_ref', txnRef)
    fd.append('payment_type', 'booking_payment')
    try {
      await api.post('/payments', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Payment submitted! Admin will verify and confirm.')
      setStep(4)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bikerental-page">
      <div className="page-banner">
        <div className="container">
          <h1>Self-Drive Bike Rental</h1>
          <p>Rent a bike • Ride on your schedule • Return hassle-free</p>
        </div>
      </div>

      <section className="section">
        <div className="container">

          {/* Progress */}
          {step < 4 && (
            <div className="booking-steps" aria-label="Rental booking progress">
              {['Select & Dates','Documents','Payment','Done'].map((label, i) => (
                <div key={label} className={`booking-step ${step > i + 1 ? 'step-done' : ''} ${step === i + 1 ? 'step-active' : ''}`}>
                  <div className="step-circle">{step > i + 1 ? '✓' : i + 1}</div>
                  <span className="step-label">{label}</span>
                  {i < 3 && <div className="step-line"/>}
                </div>
              ))}
            </div>
          )}

          <div className="booking-content">

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div className="booking-step-panel">
                <h2>Choose Bike & Dates</h2>

                {/* Vehicles */}
                <div style={{marginBottom:'28px'}}>
                  <h4 style={{color:'var(--navy)',marginBottom:'14px'}}>Available Bikes</h4>
                  {vehicleLoading ? <LoadingSpinner /> : (
                    vehicles.length === 0 ? (
                      <p style={{color:'var(--text-light)'}}>No bikes available right now.</p>
                    ) : (
                      <div className="vehicle-select-grid">
                        {vehicles.map(v => (
                          <VehicleCard key={v.id} vehicle={v} onSelect={setSelected} selected={selectedVehicle?.id === v.id} />
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* Dates */}
                <div className="rental-date-grid">
                  <div className="form-group">
                    <label className="form-label">Rental Start Date <span>*</span></label>
                    <DatePicker
                      selected={startDate}
                      onChange={d => { setStartDate(d); if (endDate && d >= endDate) setEndDate(null) }}
                      minDate={today}
                      maxDate={maxDate}
                      placeholderText="Pick start date"
                      className="form-control"
                      dateFormat="dd/MM/yyyy"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rental End Date <span>*</span></label>
                    <DatePicker
                      selected={endDate}
                      onChange={d => setEndDate(d)}
                      minDate={startDate ? addDays(startDate, 1) : addDays(today, 1)}
                      maxDate={maxDate}
                      placeholderText="Pick end date"
                      className="form-control"
                      dateFormat="dd/MM/yyyy"
                      disabled={!startDate}
                    />
                  </div>
                </div>

                {/* Pricing summary */}
                {startDate && endDate && selectedVehicle && (
                  <div className="rental-summary">
                    <div className="summary-item"><span>Rental Duration</span><strong>{rentalDays} day{rentalDays > 1 ? 's' : ''}</strong></div>
                    <div className="summary-item"><span>Daily Rate</span><strong>₹{dailyRate}/day</strong></div>
                    <div className="summary-item"><span>Rental Amount</span><strong>₹{rentalAmount}</strong></div>
                    <div className="summary-item"><span>Security Deposit</span><strong>₹{SECURITY_DEPOSIT} (refundable)</strong></div>
                    <div className="summary-divider"/>
                    <div className="summary-item summary-total"><span>Total Payable</span><strong>₹{totalAmount}</strong></div>
                  </div>
                )}

                {/* Deposit notice */}
                <div className="deposit-alert">
                  <strong>⚠️ Security Deposit Notice:</strong> A refundable deposit of ₹2,000 is required. It is returned after bike inspection on return, minus any applicable late/damage charges.
                </div>

                <div className="step-actions">
                  <button className="btn btn-primary btn-lg" onClick={handleCreateBooking} disabled={!selectedVehicle || !startDate || !endDate || loading}>
                    {loading ? 'Creating…' : 'Continue to Documents →'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div className="booking-step-panel">
                <h2>Upload Documents</h2>
                <p>All three documents are mandatory for identity verification. Files are stored securely and only accessible by admin.</p>

                <div className="doc-upload-grid">
                  {[
                    { key:'aadhaar',         label:'Aadhaar Card',    hint:'Front & back on one image' },
                    { key:'driving_licence', label:'Driving Licence', hint:'Valid licence – front side' },
                    { key:'pan_card',        label:'PAN Card',        hint:'Clear, readable scan' },
                  ].map(doc => (
                    <div className="doc-upload-card" key={doc.key}>
                      <div className="doc-upload-icon">{files[doc.key] ? '✅' : '📄'}</div>
                      <h4>{doc.label} <span style={{color:'var(--danger)'}}>*</span></h4>
                      <p>{doc.hint}</p>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        id={doc.key}
                        style={{display:'none'}}
                        onChange={e => handleFileChange(doc.key, e.target.files[0])}
                      />
                      <label htmlFor={doc.key} className="btn btn-outline btn-sm" style={{cursor:'pointer',marginTop:'10px'}}>
                        {files[doc.key] ? `✓ ${files[doc.key].name.substring(0,20)}…` : 'Upload File'}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="privacy-note">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Your documents are encrypted and stored securely. They are only accessed by authorised admin for verification and are not shared with any third party.
                </div>

                <div className="step-actions">
                  <button className="btn btn-primary btn-lg" onClick={handleUploadDocs} disabled={docUploading || !files.aadhaar || !files.driving_licence || !files.pan_card}>
                    {docUploading ? 'Uploading…' : 'Upload & Continue →'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <div className="booking-step-panel">
                <h2>Pay Security Deposit + Rental</h2>
                <div className="qr-payment-section">
                  <p>Scan the QR code and pay the total amount of <strong>₹{totalAmount}</strong>.</p>
                  <div className="payment-breakdown">
                    <span>Rental: ₹{rentalAmount}</span>
                    <span>+</span>
                    <span>Deposit: ₹{SECURITY_DEPOSIT}</span>
                    <span>=</span>
                    <strong>₹{totalAmount}</strong>
                  </div>
                  {qrUrl
                    ? <img src={qrUrl} alt="UPI QR Code" className="qr-image" />
                    : <div className="qr-placeholder">QR code will be displayed here once uploaded by admin</div>
                  }
                  <div className="form-group" style={{maxWidth:'400px',margin:'0 auto 16px'}}>
                    <label className="form-label">Transaction Reference / UTR</label>
                    <input type="text" className="form-control" placeholder="Enter UTR / Transaction ID" value={txnRef} onChange={e => setTxnRef(e.target.value)} />
                  </div>
                  <div className="form-group" style={{maxWidth:'400px',margin:'0 auto 16px'}}>
                    <label className="form-label">Payment Screenshot <span>*</span></label>
                    <input type="file" className="form-control" accept="image/*" onChange={e => setScreenshot(e.target.files[0])} />
                  </div>
                  <button className="btn btn-primary btn-lg" onClick={handlePayment} disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Submit Payment Proof'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4 ── */}
            {step === 4 && (
              <div className="booking-step-panel booking-success">
                <div className="success-icon">🛵</div>
                <h2>Rental Request Submitted!</h2>
                <p>Booking ID: <strong>#{booking?.booking_number}</strong></p>
                <div className="rental-next-steps">
                  <h4>What happens next?</h4>
                  <ol>
                    <li>Admin verifies your documents and payment.</li>
                    <li>You receive a confirmation notification.</li>
                    <li>Visit our office with <strong>original</strong> Aadhaar + Licence + PAN for physical verification.</li>
                    <li>Admin hands over the bike key after all checks pass.</li>
                    <li>Enjoy your ride! Return the bike by the agreed time.</li>
                  </ol>
                </div>
                <button className="btn btn-primary btn-lg" style={{marginTop:'24px'}} onClick={() => navigate('/my-account')}>
                  View My Bookings
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
