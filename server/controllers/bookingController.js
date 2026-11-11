const { query, getClient } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { generateBookingNumber } = require('../utils/generateBookingNumber');
const whatsappService = require('../services/whatsappService');
const notificationService = require('../services/notificationService');

const TEMP_HOLD_MINUTES = parseInt(process.env.TEMP_HOLD_MINUTES) || 30;
const SECURITY_DEPOSIT = parseFloat(process.env.SECURITY_DEPOSIT_AMOUNT) || 2000;

// Helper: Check vehicle conflict (transaction-safe)
const checkVehicleConflict = async (client, vehicle_id, service_type, journey_date, pickup_time, return_date = null, excludeBookingId = null) => {
  let conflictQuery;
  let conflictParams;

  if (service_type === 'self_drive_bike') {
    const endDate = return_date || journey_date;
    conflictQuery = `
      SELECT id FROM bookings
      WHERE vehicle_id = $1
        AND status IN ('confirmed', 'payment_verification_pending', 'awaiting_payment')
        AND (journey_date <= $2 AND COALESCE(return_date, journey_date) >= $3)
        ${excludeBookingId ? 'AND id != $4' : ''}
    `;
    conflictParams = excludeBookingId
      ? [vehicle_id, endDate, journey_date, excludeBookingId]
      : [vehicle_id, endDate, journey_date];
  } else {
    conflictQuery = `
      SELECT id FROM bookings
      WHERE vehicle_id = $1
        AND journey_date = $2
        AND status IN ('confirmed', 'payment_verification_pending', 'awaiting_payment')
        AND (pickup_time BETWEEN ($3::TIME - INTERVAL '30 minutes') AND ($3::TIME + INTERVAL '30 minutes'))
        ${excludeBookingId ? 'AND id != $4' : ''}
    `;
    conflictParams = excludeBookingId
      ? [vehicle_id, journey_date, pickup_time, excludeBookingId]
      : [vehicle_id, journey_date, pickup_time];
  }

  const result = await client.query(conflictQuery, conflictParams);
  return result.rows.length > 0;
};

// POST /api/bookings - Create booking
const createBooking = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      vehicle_id, service_type, pickup_location, destination,
      journey_date, pickup_time, return_date, return_time,
      num_passengers, special_instructions, payment_method, estimated_amount
    } = req.body;

    // Validate vehicle exists
    const vehicleResult = await client.query(
      'SELECT * FROM vehicles WHERE id = $1 AND category = $2 AND is_available = TRUE AND is_under_maintenance = FALSE',
      [vehicle_id, service_type]
    );

    if (vehicleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Selected vehicle is not available.', 400);
    }

    // Check for conflicts (with row lock)
    await client.query('SELECT id FROM vehicles WHERE id = $1 FOR UPDATE', [vehicle_id]);

    const hasConflict = await checkVehicleConflict(
      client, vehicle_id, service_type, journey_date, pickup_time, return_date
    );

    if (hasConflict) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'This vehicle is already booked for the selected time. Please choose a different time or vehicle.', 409);
    }

    // Expire old temp holds before proceeding
    await client.query(
      `UPDATE bookings SET status = 'cancelled', is_temp_hold = FALSE
       WHERE vehicle_id = $1 AND is_temp_hold = TRUE AND hold_expires_at < NOW()
         AND status = 'pending_approval'`,
      [vehicle_id]
    );

    const booking_number = await generateBookingNumber();
    const security_deposit = service_type === 'self_drive_bike' ? SECURITY_DEPOSIT : 0;
    const total_amount = (parseFloat(estimated_amount) || 0) + security_deposit;
    const hold_expires_at = new Date(Date.now() + TEMP_HOLD_MINUTES * 60 * 1000);

    const bookingResult = await client.query(
      `INSERT INTO bookings (
        booking_number, user_id, vehicle_id, service_type,
        pickup_location, destination, journey_date, pickup_time,
        return_date, return_time, num_passengers, special_instructions,
        estimated_amount, security_deposit, total_amount,
        payment_method, status, is_temp_hold, hold_expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,TRUE,$18)
      RETURNING *`,
      [
        booking_number, req.user.id, vehicle_id, service_type,
        pickup_location, destination, journey_date, pickup_time,
        return_date || null, return_time || null,
        parseInt(num_passengers) || 1, special_instructions || null,
        parseFloat(estimated_amount) || 0, security_deposit, total_amount,
        payment_method, 'pending_approval', hold_expires_at
      ]
    );

    const booking = bookingResult.rows[0];

    // Record status history
    await client.query(
      `INSERT INTO booking_status_history (booking_id, new_status, changed_by_user, notes)
       VALUES ($1, 'pending_approval', $2, 'Booking created by customer')`,
      [booking.id, req.user.id]
    );

    await client.query('COMMIT');

    // Send notifications (non-blocking)
    try {
      await notificationService.createAdminNotification(
        'new_booking',
        'New Booking Received',
        `Booking #${booking_number} received from ${req.user.full_name} for ${service_type}.`,
        booking.id
      );

      await whatsappService.sendNewBookingAlert(booking, req.user);
    } catch (notifErr) {
      console.error('Notification error (non-critical):', notifErr.message);
    }

    return successResponse(res, { booking }, 'Booking submitted successfully! Awaiting admin approval.', 201);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('CreateBooking error:', err);
    return errorResponse(res, 'Failed to create booking. Please try again.', 500);
  } finally {
    client.release();
  }
};

// GET /api/bookings/my - Customer's bookings
const getMyBookings = async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*, v.vehicle_name, v.registration_number, v.category, v.image_url,
              p.status AS payment_status, p.method AS payment_method_detail,
              p.screenshot_url, p.transaction_ref
       FROM bookings b
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_type = 'booking_payment'
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    return successResponse(res, { bookings: result.rows });
  } catch (err) {
    console.error('GetMyBookings error:', err);
    return errorResponse(res, 'Failed to fetch bookings.', 500);
  }
};

// GET /api/bookings/:id - Single booking
const getBookingById = async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*, v.vehicle_name, v.registration_number, v.image_url, v.seating_capacity,
              v.fuel_type, v.features,
              u.full_name AS customer_name, u.email AS customer_email, u.mobile AS customer_mobile
       FROM bookings b
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Booking not found.', 404);
    }

    const booking = result.rows[0];

    // Security: customers can only view their own bookings
    if (req.user && booking.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied.', 403);
    }

    return successResponse(res, { booking });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch booking.', 500);
  }
};

// POST /api/bookings/:id/cancel - Customer cancel booking
const cancelBooking = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { reason } = req.body;

    const result = await client.query(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Booking not found.', 404);
    }

    const booking = result.rows[0];

    if (!['pending_approval', 'awaiting_payment', 'payment_verification_pending', 'confirmed'].includes(booking.status)) {
      await client.query('ROLLBACK');
      return errorResponse(res, `Cannot cancel a booking with status: ${booking.status}`, 400);
    }

    if (booking.payment_method === 'cash') {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Cash bookings cannot be cancelled online. Please contact us directly.', 400);
    }

    await client.query(
      `UPDATE bookings SET status = 'cancelled', cancellation_reason = $1,
       cancelled_by = 'customer', updated_at = NOW()
       WHERE id = $2`,
      [reason || 'Customer requested cancellation', booking.id]
    );

    await client.query(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by_user, notes)
       VALUES ($1, $2, 'cancelled', $3, $4)`,
      [booking.id, booking.status, req.user.id, reason || 'Customer requested cancellation']
    );

    // If payment was made, initiate refund
    const paymentResult = await client.query(
      `SELECT * FROM payments WHERE booking_id = $1 AND payment_type = 'booking_payment' AND status = 'verified'`,
      [booking.id]
    );

    if (paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];
      const deductionPercent = 10;
      const deductionAmount = (payment.amount * deductionPercent) / 100;
      const refundAmount = payment.amount - deductionAmount;

      await client.query(
        `INSERT INTO refunds (booking_id, payment_id, user_id, original_amount, deduction_percent, deduction_amount, refund_amount, status, reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'refund_pending',$8)`,
        [booking.id, payment.id, req.user.id, payment.amount, deductionPercent, deductionAmount, refundAmount, reason]
      );

      await client.query(
        `UPDATE bookings SET status = 'refund_pending', updated_at = NOW() WHERE id = $1`,
        [booking.id]
      );
    }

    await client.query('COMMIT');

    return successResponse(res, null, 'Booking cancelled successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('CancelBooking error:', err);
    return errorResponse(res, 'Failed to cancel booking.', 500);
  } finally {
    client.release();
  }
};

// ========================
// ADMIN BOOKING MANAGEMENT
// ========================

// GET /api/admin/bookings - All bookings
const getAllBookings = async (req, res) => {
  try {
    const { status, vehicle_id, user_id, date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT b.*, v.vehicle_name, v.registration_number, v.category,
             u.full_name AS customer_name, u.email AS customer_email, u.mobile AS customer_mobile,
             p.status AS payment_status, p.method AS payment_method_detail
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_type = 'booking_payment'
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { sql += ` AND b.status = $${idx++}`; params.push(status); }
    if (vehicle_id) { sql += ` AND b.vehicle_id = $${idx++}`; params.push(vehicle_id); }
    if (user_id) { sql += ` AND b.user_id = $${idx++}`; params.push(user_id); }
    if (date) { sql += ` AND b.journey_date = $${idx++}`; params.push(date); }

    const countResult = await query(
      `SELECT COUNT(*) FROM bookings b WHERE 1=1 ${status ? `AND b.status = '${status}'` : ''}`,
      []
    );
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY b.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), offset);

    const result = await query(sql, params);
    return paginatedResponse(res, result.rows, total, page, limit, 'Bookings fetched.');
  } catch (err) {
    console.error('GetAllBookings error:', err);
    return errorResponse(res, 'Failed to fetch bookings.', 500);
  }
};

// PUT /api/admin/bookings/:id/status - Update booking status
const updateBookingStatus = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { status, admin_notes } = req.body;
    const bookingId = req.params.id;

    const allowedStatuses = [
      'pending_approval', 'awaiting_payment', 'payment_verification_pending',
      'confirmed', 'rejected', 'cancelled', 'completed',
      'refund_pending', 'refunded'
    ];

    if (!allowedStatuses.includes(status)) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Invalid booking status.', 400);
    }

    const result = await client.query(
      'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
      [bookingId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Booking not found.', 404);
    }

    const booking = result.rows[0];

    // If confirming: do a final conflict check
    if (status === 'confirmed') {
      const hasConflict = await checkVehicleConflict(
        client,
        booking.vehicle_id,
        booking.service_type,
        booking.journey_date,
        booking.pickup_time,
        booking.return_date,
        bookingId
      );

      if (hasConflict) {
        await client.query('ROLLBACK');
        return errorResponse(res, 'Cannot confirm: vehicle already has an overlapping confirmed booking.', 409);
      }
    }

    const updateResult = await client.query(
      `UPDATE bookings SET status = $1, admin_notes = $2, is_temp_hold = FALSE, hold_expires_at = NULL, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, admin_notes || null, bookingId]
    );

    await client.query(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by_admin, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [bookingId, booking.status, status, req.admin.id, admin_notes || null]
    );

    await client.query('COMMIT');

    const updatedBooking = updateResult.rows[0];

    // Send WhatsApp notification to customer
    try {
      const userResult = await query('SELECT * FROM users WHERE id = $1', [booking.user_id]);
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        if (status === 'confirmed') {
          await whatsappService.sendBookingConfirmation(updatedBooking, user);
        } else if (status === 'rejected') {
          await whatsappService.sendBookingRejection(updatedBooking, user);
        }
        // Create in-app notification
        await notificationService.createUserNotification(
          booking.user_id,
          'booking_update',
          `Booking #${booking.booking_number} Update`,
          `Your booking status has been updated to: ${status.replace(/_/g, ' ')}.`,
          booking.id
        );
      }
    } catch (notifErr) {
      console.error('Notification error (non-critical):', notifErr.message);
    }

    return successResponse(res, { booking: updatedBooking }, 'Booking status updated.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('UpdateBookingStatus error:', err);
    return errorResponse(res, 'Failed to update booking status.', 500);
  } finally {
    client.release();
  }
};

// GET /api/admin/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_customers,
        (SELECT COUNT(*) FROM vehicles) AS total_vehicles,
        (SELECT COUNT(*) FROM bookings) AS total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'pending_approval') AS pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') AS confirmed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status IN ('cancelled','rejected')) AS cancelled_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'refund_pending') AS pending_refunds,
        (SELECT COUNT(*) FROM complaints WHERE status = 'open') AS new_complaints,
        (SELECT COUNT(*) FROM reviews WHERE status = 'pending') AS pending_reviews,
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'verified') AS total_revenue,
        (SELECT COUNT(*) FROM payments WHERE status = 'screenshot_uploaded') AS pending_payments,
        (SELECT COUNT(*) FROM bookings WHERE service_type = 'self_drive_bike' AND status = 'confirmed') AS active_bike_rentals
    `);

    return successResponse(res, { stats: stats.rows[0] });
  } catch (err) {
    console.error('GetDashboardStats error:', err);
    return errorResponse(res, 'Failed to fetch dashboard stats.', 500);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
  getDashboardStats,
};
