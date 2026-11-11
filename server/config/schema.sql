-- VIAROAD Database Schema
-- Run this file to initialize the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================
-- USERS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  whatsapp_consent BOOLEAN DEFAULT FALSE,
  profile_image VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- ADMINS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- VEHICLES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_name VARCHAR(150) NOT NULL,
  registration_number VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('car_with_driver','bike_with_driver','self_drive_bike')),
  seating_capacity INTEGER NOT NULL DEFAULT 1,
  fuel_type VARCHAR(30) DEFAULT 'Petrol',
  description TEXT,
  image_url VARCHAR(500),
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_km NUMERIC(10,2) DEFAULT 0,
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  daily_rate NUMERIC(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  is_under_maintenance BOOLEAN DEFAULT FALSE,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- BOOKINGS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('car_with_driver','bike_with_driver','self_drive_bike')),
  pickup_location TEXT NOT NULL,
  destination TEXT,
  journey_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  return_date DATE,
  return_time TIME,
  num_passengers INTEGER DEFAULT 1,
  special_instructions TEXT,
  estimated_amount NUMERIC(10,2) DEFAULT 0,
  security_deposit NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending_approval' CHECK (
    status IN (
      'pending_approval','awaiting_payment','payment_verification_pending',
      'confirmed','rejected','cancelled','completed',
      'refund_pending','refunded'
    )
  ),
  payment_method VARCHAR(30) CHECK (payment_method IN ('online_upi','cash')),
  is_temp_hold BOOLEAN DEFAULT TRUE,
  hold_expires_at TIMESTAMPTZ,
  admin_notes TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- PAYMENTS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('booking_payment','security_deposit')),
  method VARCHAR(30) NOT NULL CHECK (method IN ('online_upi','cash','razorpay')),
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending','screenshot_uploaded','verified','failed','refund_pending','refund_processing','refunded','refund_failed','cash_pending','cash_collected')
  ),
  transaction_ref VARCHAR(200),
  screenshot_url VARCHAR(500),
  verified_by UUID REFERENCES admins(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- REFUNDS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  user_id UUID NOT NULL REFERENCES users(id),
  original_amount NUMERIC(10,2) NOT NULL,
  deduction_percent NUMERIC(5,2) DEFAULT 10,
  deduction_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'refund_pending' CHECK (
    status IN ('refund_pending','refund_processing','refunded','refund_failed')
  ),
  refund_reference VARCHAR(200),
  reason TEXT,
  processed_by UUID REFERENCES admins(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- RENTAL DOCUMENTS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS rental_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  aadhaar_url VARCHAR(500),
  driving_licence_url VARCHAR(500),
  pan_card_url VARCHAR(500),
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (
    verification_status IN ('pending','approved','rejected','correction_requested')
  ),
  physical_verified BOOLEAN DEFAULT FALSE,
  physical_verified_by UUID REFERENCES admins(id),
  physical_verified_at TIMESTAMPTZ,
  admin_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- BIKE HANDOVER TABLE
-- ========================
CREATE TABLE IF NOT EXISTS bike_handover_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  handover_time TIMESTAMPTZ,
  handover_by UUID REFERENCES admins(id),
  bike_condition_at_handover TEXT,
  fuel_level_at_handover VARCHAR(50),
  odometer_at_handover INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- BIKE RETURN TABLE
-- ========================
CREATE TABLE IF NOT EXISTS bike_return_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  return_time TIMESTAMPTZ,
  recorded_by UUID REFERENCES admins(id),
  bike_condition_at_return TEXT,
  fuel_level_at_return VARCHAR(50),
  odometer_at_return INTEGER,
  has_damage BOOLEAN DEFAULT FALSE,
  damage_description TEXT,
  late_return BOOLEAN DEFAULT FALSE,
  late_charges NUMERIC(10,2) DEFAULT 0,
  deposit_refund_amount NUMERIC(10,2) DEFAULT 0,
  deposit_deduction_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- REVIEWS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','approved','hidden','removed')),
  approved_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- COMPLAINTS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  contact_details VARCHAR(200),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  admin_response TEXT,
  assigned_to UUID REFERENCES admins(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- NOTIFICATIONS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  admin_id UUID REFERENCES admins(id),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  related_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- BUSINESS SETTINGS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description VARCHAR(255),
  updated_by UUID REFERENCES admins(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- AUDIT LOGS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  admin_id UUID REFERENCES admins(id),
  action VARCHAR(200) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- BOOKING STATUS HISTORY
-- ========================
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by_user UUID REFERENCES users(id),
  changed_by_admin UUID REFERENCES admins(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- WHATSAPP NOTIFICATION LOGS
-- ========================
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_phone VARCHAR(20) NOT NULL,
  template_name VARCHAR(100),
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  wa_message_id VARCHAR(200),
  booking_id UUID REFERENCES bookings(id),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- INDEXES
-- ========================
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_journey_date ON bookings(journey_date);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_date ON bookings(vehicle_id, journey_date, status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ========================
-- INITIAL SEED DATA
-- ========================

-- Default business settings
INSERT INTO business_settings (setting_key, setting_value, description) VALUES
  ('upi_qr_url', NULL, 'URL of current UPI QR code image'),
  ('upi_id', 'viaroad@upi', 'Company UPI ID'),
  ('contact_email', 'support@viaroad.in', 'Customer support email'),
  ('contact_phone', '9867998094', 'Customer support phone'),
  ('business_hours', 'Monday to Saturday, 8:00 AM to 9:00 PM', 'Business operating hours'),
  ('facebook_url', NULL, 'Facebook page URL'),
  ('instagram_url', NULL, 'Instagram page URL'),
  ('twitter_url', NULL, 'Twitter/X page URL'),
  ('security_deposit_amount', '2000', 'Security deposit for self-drive bike rental'),
  ('cancellation_deduction_percent', '10', 'Percentage deducted on cancellation'),
  ('temp_hold_minutes', '30', 'Minutes for temporary booking hold'),
  ('max_advance_booking_days', '90', 'Maximum days ahead a booking can be made')
ON CONFLICT (setting_key) DO NOTHING;

-- Default vehicles
INSERT INTO vehicles (vehicle_name, registration_number, category, seating_capacity, fuel_type, description, base_price, price_per_km, is_available) VALUES
  ('Honda Amaze', 'MH-01-AB-1234', 'car_with_driver', 4, 'Petrol', 'Comfortable sedan with AC, suitable for city and outstation trips.', 200, 12, TRUE),
  ('TVS Apache RTR 160', 'MH-01-CD-5678', 'bike_with_driver', 1, 'Petrol', 'Reliable motorbike for quick city rides with a professional rider.', 80, 6, TRUE),
  ('Honda Activa 6G', 'MH-01-EF-9012', 'self_drive_bike', 1, 'Petrol', 'Smooth and comfortable scooter for self-drive city rentals.', 300, 0, TRUE)
ON CONFLICT (registration_number) DO NOTHING;
