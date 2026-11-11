import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import AdminRoute from './components/ProtectedRoute/AdminRoute'
import LoadingSpinner from './components/Notification/LoadingSpinner'

// Lazy-load pages for better performance
const Home = lazy(() => import('./pages/Home/Home'))
const About = lazy(() => import('./pages/About/About'))
const Services = lazy(() => import('./pages/Services/Services'))
const Login = lazy(() => import('./pages/Login/Login'))
const Register = lazy(() => import('./pages/Register/Register'))
const BookRide = lazy(() => import('./pages/BookRide/BookRide'))
const BikeRental = lazy(() => import('./pages/BikeRental/BikeRental'))
const MyAccount = lazy(() => import('./pages/MyAccount/MyAccount'))
const Reviews = lazy(() => import('./pages/Reviews/Reviews'))
const Complaints = lazy(() => import('./pages/Complaints/Complaints'))
const Contact = lazy(() => import('./pages/Contact/Contact'))
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'))
const AdminLogin = lazy(() => import('./pages/Admin/AdminLogin'))

function App() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Suspense fallback={<LoadingSpinner fullPage />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin auth */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected customer routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/book" element={<BookRide />} />
              <Route path="/bike-rental" element={<BikeRental />} />
              <Route path="/my-account" element={<MyAccount />} />
              <Route path="/complaints" element={<Complaints />} />
            </Route>

            {/* Protected admin routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/*" element={<AdminDashboard />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App
