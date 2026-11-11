/**
 * Home Page  –  VIAROAD
 * Full redesign with:
 *  - Auto-sliding hero image carousel (Unsplash travel/car images)
 *  - Professional navy + white + gold colour system
 *  - Scroll-reveal animations on every section
 *  - Unique seat-features section with the owner's image
 *  - Services, Why Choose, How It Works, Stats, Testimonials, CTA
 */

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import VehicleCard from '../../components/VehicleCard/VehicleCard'
import ownerAndSeat from '../../assets/images/owner-and-seat.jpg'
import './Home.css'

/* ─────────────────────────────────────────
   HERO SLIDES  (high-quality Unsplash URLs)
   Each has its own overlay shade & text
   ───────────────────────────────────────── */
const SLIDES = [
  {
    img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=80&auto=format&fit=crop',
    eyebrow: 'Premium Car Service',
    headline: 'Book Your Ride.',
    sub: 'Travel Without Limits.',
    desc: 'Professional drivers. AC sedans. Luxury backseat amenities you will not find anywhere else.',
    cta: '/book',
    ctaLabel: 'Book a Car Now',
  },
  {
    img: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1600&q=80&auto=format&fit=crop',
    eyebrow: 'City Bike Rides',
    headline: 'Beat the Traffic.',
    sub: 'Arrive on Time, Every Time.',
    desc: 'Quick, affordable city bike rides with professional riders. Fast, safe and always on schedule.',
    cta: '/book',
    ctaLabel: 'Book a Bike Ride',
  },
  {
    img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80&auto=format&fit=crop',
    eyebrow: 'Travel in Comfort',
    headline: 'Your Journey.',
    sub: 'Our Responsibility.',
    desc: 'From city commutes to outstation trips — VIAROAD takes care of everything so you can just enjoy the ride.',
    cta: '/services',
    ctaLabel: 'See All Services',
  },
  {
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80&auto=format&fit=crop',
    eyebrow: 'Self-Drive Bike Rental',
    headline: 'Ride on Your',
    sub: 'Own Schedule.',
    desc: 'Rent a well-maintained scooter or bike. Flexible hours, transparent pricing, zero hassle.',
    cta: '/bike-rental',
    ctaLabel: 'Rent a Bike',
  },
  {
    img: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=1600&q=80&auto=format&fit=crop',
    eyebrow: 'Safe & Reliable',
    headline: 'Safety is Our',
    sub: 'First Promise.',
    desc: 'Verified drivers. Women safety kit. Feedback diary. Book library. Because comfort is not optional.',
    cta: '/about',
    ctaLabel: 'Learn About Us',
  },
]

/* ─────────────────────────────────────────
   UNIQUE SEAT FEATURES
   ───────────────────────────────────────── */
const SEAT_FEATURES = [
  { icon: '📚', title: 'In-Car Book Library',      desc: 'Curated books in the backseat — Atomic Habits, Psychology of Money and more. Read, relax and refresh.' },
  { icon: '💆', title: 'Passenger Seat Massager',  desc: 'Built-in backseat massager. Long drive? Let your muscles relax while we handle the road.' },
  { icon: '📝', title: 'Feedback & Complaint Diary', desc: 'Write your experience right inside the car. We read every note and act on it instantly.' },
  { icon: '🛡️', title: 'Women Safety Box',         desc: 'A dedicated safety kit in every car for women passengers. Because safety is non-negotiable.' },
  { icon: '☕', title: 'Snacks & Coffee Corner',    desc: 'Feeling sleepy on a long drive? Grab a Kopikot or a quick snack from the in-car corner.' },
  { icon: '🎵', title: 'Music & AUX / USB Port',   desc: 'Play your own playlist via AUX or USB. Your journey, your soundtrack.' },
]

/* ─── Star renderer ─── */
const Stars = ({ n }) => (
  <div className="stars" aria-label={`${n} of 5`}>
    {[1,2,3,4,5].map(i => (
      <svg key={i} className={i <= n ? 'star-on' : 'star-off'} width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ))}
  </div>
)

/* ─── Intersection-observer hook ─── */
const useInView = (threshold = 0.12) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

/* ─── Animated counter — accepts string "500" or number 20 ─── */
const Counter = ({ end, suffix = '' }) => {
  const [count, setCount] = useState(0)
  const [ref, inView] = useInView(0.3)
  useEffect(() => {
    if (!inView) return
    const target = parseInt(String(end))
    if (!target) return
    let current = 0
    const step = Math.max(1, Math.ceil(target / 60))
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(current)
    }, 25)
    return () => clearInterval(timer)
  }, [inView, end])
  return <span ref={ref}>{count}{suffix}</span>
}

/* ═══════════════════════════════════════════════
   HOME COMPONENT
   ═══════════════════════════════════════════════ */
export default function Home() {
  /* Slider state */
  const [slideIdx, setSlide]   = useState(0)
  const [animating, setAnim]   = useState(false)
  const timerRef               = useRef(null)

  /* Data */
  const [vehicles, setVehicles] = useState([])
  const [reviews,  setReviews]  = useState([
    { id:1, name:'Rahul Mehta',  rating:5, text:'The book library in the backseat is genius! Read half of Atomic Habits on the way to Pune. Best cab service ever.', service:'Car with Driver' },
    { id:2, name:'Priya Sharma', rating:5, text:'Professional driver, spotless car, on-time pickup. The massage chair was the cherry on top. VIAROAD is my go-to now.', service:'Car with Driver' },
    { id:3, name:'Amit Kumar',   rating:4, text:'Quick city bike ride, very affordable. The rider was polite and professional. Highly recommend.', service:'Bike with Driver' },
    { id:4, name:'Meera Singh',  rating:5, text:'As a solo woman traveller, the Women Safety Box gave me so much confidence. This company genuinely cares.', service:'Car with Driver' },
  ])
  const [reviewIdx, setReviewIdx] = useState(0)

  /* Scroll reveal refs */
  const [svcRef,   svcVis]   = useInView()
  const [uniqRef,  uniqVis]  = useInView()
  const [whyRef,   whyVis]   = useInView()
  const [howRef,   howVis]   = useInView()
  const [statsRef, statsVis] = useInView()
  const [ownerRef, ownerVis] = useInView()

  /*
   * Live "Rides Completed" counter.
   * Seed = 20 (pre-launch rides before the website was launched).
   * Every time a ride is marked "completed" in the admin dashboard,
   * the count increments automatically via the backend stats API.
   * Formula: displayed count = 20 (seed) + real completed bookings from DB
   */
  const [ridesCompleted, setRidesCompleted] = useState(20)

  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then(r => {
        const dbCompleted = parseInt(r.data?.data?.stats?.completed_bookings || 0)
        setRidesCompleted(20 + dbCompleted)
      })
      .catch(() => setRidesCompleted(20)) // fallback: show seed if API unavailable
  }, [])

  /* Slide advance */
  const nextSlide = useCallback(() => {
    if (animating) return
    setAnim(true)
    setTimeout(() => {
      setSlide(i => (i + 1) % SLIDES.length)
      setAnim(false)
    }, 600)
  }, [animating])

  const prevSlide = useCallback(() => {
    if (animating) return
    setAnim(true)
    setTimeout(() => {
      setSlide(i => (i - 1 + SLIDES.length) % SLIDES.length)
      setAnim(false)
    }, 600)
  }, [animating])

  const goToSlide = (i) => {
    if (animating || i === slideIdx) return
    setAnim(true)
    setTimeout(() => { setSlide(i); setAnim(false) }, 600)
  }

  /* Auto-advance slider every 5s */
  useEffect(() => {
    timerRef.current = setInterval(nextSlide, 5000)
    return () => clearInterval(timerRef.current)
  }, [nextSlide])

  /* Auto-advance reviews */
  useEffect(() => {
    const t = setInterval(() => setReviewIdx(i => (i + 1) % reviews.length), 5000)
    return () => clearInterval(t)
  }, [reviews.length])

  /* API data */
  useEffect(() => {
    api.get('/vehicles?available=true').then(r => setVehicles(r.data.data.vehicles || [])).catch(() => {})
    api.get('/reviews').then(r => { if (r.data.data.reviews?.length) setReviews(r.data.data.reviews) }).catch(() => {})
  }, [])

  const slide = SLIDES[slideIdx]

  return (
    <div className="home-page">

      {/* ══════════════════════════════════════════════
          SECTION 1 — HERO IMAGE SLIDER
         ══════════════════════════════════════════════ */}
      <section className="hero-slider" aria-label="Hero">

        {/* Background images — all preloaded, one shown */}
        <div className="slider-track">
          {SLIDES.map((s, i) => (
            <div
              key={i}
              className={`slider-slide ${i === slideIdx ? 'slide-active' : ''} ${animating && i === slideIdx ? 'slide-exit' : ''}`}
              aria-hidden={i !== slideIdx}
            >
              <img src={s.img} alt={s.eyebrow} className="slide-img" loading={i === 0 ? 'eager' : 'lazy'} />
              <div className="slide-overlay" />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="slider-content container">
          <div className={`slide-text ${animating ? 'text-exit' : 'text-enter'}`} key={slideIdx}>
            <span className="slide-eyebrow">
              <span className="eyebrow-line" />
              {slide.eyebrow}
            </span>
            <h1 className="slide-headline">
              {slide.headline}<br/>
              <span className="slide-headline-gold">{slide.sub}</span>
            </h1>
            <p className="slide-desc">{slide.desc}</p>
            <div className="slide-actions">
              <Link to={slide.cta} className="slide-btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {slide.ctaLabel}
              </Link>
              <a href="tel:9867998094" className="slide-btn-secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.77-.77a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Call Now
              </a>
            </div>
          </div>

          {/* Stats strip inside hero */}
          <div className="hero-stats-bar">
            {[
              { n:'500+', l:'Customers' },
              { n:'3',    l:'Services'  },
              { n:'24/7', l:'Support'   },
              { n:'100%', l:'Safe Rides'},
            ].map(s => (
              <div className="hstat" key={s.l}>
                <strong>{s.n}</strong>
                <span>{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow controls */}
        <button className="slider-arrow slider-prev" onClick={prevSlide} aria-label="Previous slide">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button className="slider-arrow slider-next" onClick={nextSlide} aria-label="Next slide">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Dot indicators */}
        <div className="slider-dots" role="tablist">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`sdot ${i === slideIdx ? 'sdot-active' : ''}`}
              onClick={() => goToSlide(i)}
              role="tab"
              aria-selected={i === slideIdx}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Slide counter */}
        <div className="slider-counter" aria-live="polite">
          <span>{String(slideIdx + 1).padStart(2,'0')}</span>
          <span className="sc-sep">/</span>
          <span className="sc-total">{String(SLIDES.length).padStart(2,'0')}</span>
        </div>

        {/* Progress bar */}
        <div className="slider-progress-track">
          <div className="slider-progress-bar" key={slideIdx} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 2 — SERVICES
         ══════════════════════════════════════════════ */}
      <section className="hp-section" id="services">
        <div className="container">
          <div className="hp-section-head">
            <span className="hp-eyebrow">What We Offer</span>
            <h2 className="hp-title">Our Services</h2>
            <p className="hp-subtitle">Three flexible travel options designed for comfort, safety and your convenience.</p>
          </div>

          <div className="svc-grid" ref={svcRef}>
            {[
              {
                img: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=600&q=75&auto=format&fit=crop',
                icon: '🚗', title: 'Car with Driver',
                desc: 'Comfortable AC sedan with a verified professional driver. City rides, airport transfers and outstation trips.',
                link: '/book', badge: null,
                features: ['AC Sedan', 'Verified Driver', 'Outstation OK', 'Luxury Amenities'],
              },
              {
                img: 'https://images.unsplash.com/photo-1558981852-426c349dece2?w=600&q=75&auto=format&fit=crop',
                icon: '🏍️', title: 'Bike with Driver',
                desc: 'Quick, affordable city motorbike rides with a professional rider. Beat traffic in style.',
                link: '/book', badge: 'Most Popular',
                features: ['Helmet Provided', 'City Rides', 'Affordable', 'Quick Pickup'],
              },
              {
                img: 'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=600&q=75&auto=format&fit=crop',
                icon: '🛵', title: 'Self-Drive Bike Rental',
                desc: 'Rent a well-maintained bike and ride on your own schedule. Hourly to daily rates available.',
                link: '/bike-rental', badge: null,
                features: ['Hourly / Daily', 'Verified Docs', '₹2000 Deposit', 'Well-Maintained'],
              },
            ].map((s, i) => (
              <div
                key={s.title}
                className={`svc-card reveal-up ${svcVis ? 'in-view' : ''}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                {s.badge && <span className="svc-badge">{s.badge}</span>}
                <div className="svc-img-wrap">
                  <img src={s.img} alt={s.title} loading="lazy" className="svc-img" />
                  <div className="svc-img-overlay" />
                  <span className="svc-icon-float">{s.icon}</span>
                </div>
                <div className="svc-body">
                  <h3 className="svc-title">{s.title}</h3>
                  <p className="svc-desc">{s.desc}</p>
                  <ul className="svc-features">
                    {s.features.map(f => (
                      <li key={f}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={s.link} className="svc-btn">
                    Book Now
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 3 — WHAT MAKES US UNIQUE
         ══════════════════════════════════════════════ */}
      <section className="hp-section hp-section-dark" id="unique">
        <div className="container">
          <div className="hp-section-head hp-head-light">
            <span className="hp-eyebrow hp-eyebrow-gold">Premium Experience</span>
            <h2 className="hp-title hp-title-white">What Makes Us Unique</h2>
            <p className="hp-subtitle hp-subtitle-light">
              We don't just drive you — we give you an experience. Every VIAROAD car comes with
              curated backseat amenities designed for your comfort, safety and enjoyment.
            </p>
          </div>

          <div className={`unique-layout reveal-up ${uniqVis ? 'in-view' : ''}`} ref={uniqRef}>

            {/* Left: seat image */}
            <div className="unique-img-col">
              <div className="unique-img-frame">
                <img
                  src={ownerAndSeat}
                  alt="VIAROAD premium backseat — book library, massager, feedback diary, safety box"
                  className="unique-photo"
                  loading="lazy"
                />
                <div className="unique-photo-shine" />

                {/* Floating feature pills */}
                <div className="feature-pill pill-1">📚 Book Library</div>
                <div className="feature-pill pill-2">💆 Seat Massager</div>
                <div className="feature-pill pill-3">📝 Feedback Diary</div>
                <div className="feature-pill pill-4">🛡️ Safety Box</div>
              </div>
            </div>

            {/* Right: feature cards */}
            <div className="unique-features-col">
              {SEAT_FEATURES.map((f, i) => (
                <div
                  className={`ufeat-card reveal-up ${uniqVis ? 'in-view' : ''}`}
                  key={f.title}
                  style={{ transitionDelay: `${0.08 + i * 0.07}s` }}
                >
                  <span className="ufeat-icon">{f.icon}</span>
                  <div className="ufeat-text">
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quote */}
          <blockquote className="unique-quote">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#c9a84c" opacity="0.6"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
            <p>Every detail in our car is designed with <strong>you</strong> in mind. Because you deserve more than just a ride — you deserve an experience.</p>
            <cite>— Sunol Durai, Founder · VIAROAD</cite>
          </blockquote>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 4 — OWNER
         ══════════════════════════════════════════════ */}
      <section className="hp-section" ref={ownerRef}>
        <div className="container">
          <div className={`owner-layout reveal-up ${ownerVis ? 'in-view' : ''}`}>

            {/* Owner photo — right half of image */}
            <div className="owner-photo-col">
              <div className="owner-photo-frame">
                <img
                  src={ownerAndSeat}
                  alt="Sunol Durai — Founder & CEO of VIAROAD"
                  className="owner-photo"
                  loading="lazy"
                />
                <div className="owner-photo-card">
                  <strong>Sunol Durai</strong>
                  <span>Founder & CEO</span>
                </div>
              </div>
            </div>

            {/* Owner text */}
            <div className="owner-text-col">
              <span className="hp-eyebrow">Meet the Founder</span>
              <h2 className="hp-title" style={{textAlign:'left'}}>The Man Behind VIAROAD</h2>
              <div className="owner-rule"/>
              <p className="owner-para">
                VIAROAD was born from a personal experience of uncomfortable, unsafe and soulless cab rides.
                I wanted to change that. Every book in our library, every feature in our backseat, every
                policy in our service — it all comes from one belief:
              </p>
              <div className="owner-belief">
                "Every passenger deserves to feel safe, comfortable and respected."
              </div>
              <p className="owner-para">
                Our cars don't just transport you — they give you an experience. The book library,
                the massager, the feedback diary, the women's safety kit — these aren't extras.
                They are our standard.
              </p>

              <div className="owner-stats-row">
                <div className="ostat"><strong>500+</strong><span>Customers</span></div>
                <div className="ostat"><strong>3</strong><span>Services</span></div>
                <div className="ostat"><strong>100%</strong><span>Safe Rides</span></div>
              </div>

              <a href="tel:9867998094" className="owner-cta-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.38 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.77-.77a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Speak to Sunol: 9867998094
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 5 — WHY CHOOSE US
         ══════════════════════════════════════════════ */}
      <section className="hp-section hp-section-grey">
        <div className="container">
          <div className="hp-section-head">
            <span className="hp-eyebrow">Why VIAROAD</span>
            <h2 className="hp-title">Why Customers Choose Us</h2>
            <p className="hp-subtitle">We've thought about every detail so you don't have to.</p>
          </div>

          <div className="why-grid" ref={whyRef}>
            {[
              { icon:'🛡️', t:'Safety First',           d:'Verified drivers, women safety kit, GPS trips. Your safety is our highest priority.' },
              { icon:'📚', t:'In-Car Book Library',     d:'Curated books right in the backseat. Turn every journey into a learning experience.' },
              { icon:'💆', t:'Passenger Massager',      d:'Built-in seat massager for backseat passengers. Even long drives feel comfortable.' },
              { icon:'💰', t:'Transparent Pricing',     d:'No hidden charges. See your full fare before you confirm. Zero surprises.' },
              { icon:'📝', t:'Feedback Diary',          d:'Write your experience right inside the car. We read every note and improve.' },
              { icon:'⚡', t:'Easy 2-Minute Booking',   d:'Select service, pick time, pay via UPI or cash. Done in under 2 minutes.' },
            ].map((w, i) => (
              <div
                className={`why-card reveal-up ${whyVis ? 'in-view' : ''}`}
                key={w.t}
                style={{ transitionDelay: `${i * 0.08}s` }}
              >
                <span className="why-icon">{w.icon}</span>
                <h4>{w.t}</h4>
                <p>{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 6 — HOW IT WORKS
         ══════════════════════════════════════════════ */}
      <section className="hp-section">
        <div className="container">
          <div className="hp-section-head">
            <span className="hp-eyebrow">Simple Process</span>
            <h2 className="hp-title">How It Works</h2>
            <p className="hp-subtitle">Four easy steps from zero to your doorstep.</p>
          </div>

          <div className="how-grid" ref={howRef}>
            {[
              { n:'1', t:'Create Account',  d:'Sign up free with your name, email and mobile. Takes less than 60 seconds.' },
              { n:'2', t:'Choose Service',  d:'Select Car with Driver, Bike Ride or Self-Drive Bike Rental.' },
              { n:'3', t:'Book & Pay',      d:'Enter pickup details, select date & time, pay via UPI QR or cash on arrival.' },
              { n:'4', t:'Ride & Enjoy',    d:'Admin approves, driver arrives on time. Sit back and enjoy the premium experience!' },
            ].map((s, i) => (
              <div
                className={`how-step reveal-up ${howVis ? 'in-view' : ''}`}
                key={s.n}
                style={{ transitionDelay: `${i * 0.12}s` }}
              >
                <div className="how-num">{s.n}</div>
                {i < 3 && <div className="how-connector" aria-hidden="true"/>}
                <h4 className="how-title">{s.t}</h4>
                <p className="how-desc">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 7 — FLEET
         ══════════════════════════════════════════════ */}
      {vehicles.length > 0 && (
        <section className="hp-section hp-section-grey">
          <div className="container">
            <div className="hp-section-head">
              <span className="hp-eyebrow">Available Now</span>
              <h2 className="hp-title">Our Fleet</h2>
              <p className="hp-subtitle">All vehicles are verified, well-maintained and ready for your next journey.</p>
            </div>
            <div className="fleet-row">
              {vehicles.slice(0,3).map(v => <VehicleCard key={v.id} vehicle={v}/>)}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          SECTION 8 — STATS
          Rides Completed starts at 20 (seed count).
          fetchedCompleted from API adds on top of 20.
         ══════════════════════════════════════════════ */}
      <section className="stats-section" ref={statsRef}>
        <div className="container">
          <div className="stats-row">
            {[
              { n:'500',             s:'+', l:'Happy Customers',   e:'😊' },
              { n:ridesCompleted,    s:'+', l:'Rides Completed',   e:'🚗' },   /* seed 20 + live DB count */
              { n:'99',             s:'%', l:'Satisfaction Rate', e:'💯' },
              { n:'3',              s:'',  l:'Premium Services',  e:'⭐' },
            ].map(x => (
              <div className={`stat-box reveal-up ${statsVis ? 'in-view' : ''}`} key={x.l}>
                <span className="stat-emoji">{x.e}</span>
                <div className="stat-num">
                  {statsVis ? <Counter end={x.n} suffix={x.s}/> : `0${x.s}`}
                </div>
                <div className="stat-label">{x.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 9 — REVIEWS
         ══════════════════════════════════════════════ */}
      <section className="hp-section hp-section-grey">
        <div className="container">
          <div className="hp-section-head">
            <span className="hp-eyebrow">Real Feedback</span>
            <h2 className="hp-title">What Our Customers Say</h2>
            <p className="hp-subtitle">Honest words from people who've ridden with VIAROAD.</p>
          </div>

          <div className="reviews-track">
            {reviews.map((r, i) => (
              <div
                key={r.id || i}
                className={`review-card ${i === reviewIdx ? 'rcard-active' : ''}`}
                aria-hidden={i !== reviewIdx}
              >
                <div className="rcard-top">
                  <div className="rcard-avatar">{(r.name || r.customer_name || 'C').charAt(0)}</div>
                  <div>
                    <div className="rcard-name">{r.name || r.customer_name}</div>
                    <div className="rcard-service">{r.service || r.service_type?.replace(/_/g,' ')}</div>
                  </div>
                  <Stars n={r.rating}/>
                </div>
                <p className="rcard-text">"{r.text || r.comment}"</p>
              </div>
            ))}
          </div>

          <div className="review-dots">
            {reviews.map((_, i) => (
              <button
                key={i}
                className={`rdot ${i === reviewIdx ? 'rdot-on' : ''}`}
                onClick={() => setReviewIdx(i)}
                aria-label={`Review ${i+1}`}
              />
            ))}
          </div>

          <div style={{textAlign:'center', marginTop:'32px'}}>
            <Link to="/reviews" className="outline-btn">View All Reviews →</Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 10 — FINAL CTA
         ══════════════════════════════════════════════ */}
      <section className="cta-section">
        <div className="cta-bg-img">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1400&q=70&auto=format&fit=crop"
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <div className="cta-overlay"/>
        </div>
        <div className="container cta-content">
          <h2 className="cta-title">Ready for Your Next Journey?</h2>
          <p className="cta-desc">Book in minutes. Experience the luxury you deserve.</p>
          <div className="cta-btns">
            <Link to="/book" className="cta-primary-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Book a Ride Now
            </Link>
            <Link to="/services" className="cta-ghost-btn">
              Explore Services
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
