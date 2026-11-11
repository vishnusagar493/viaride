const { query, getClient } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');

// GET /api/payments/qr - Get current UPI QR code (public)
const getUPIQR = async (req, res) => {
  try {
    const result = await query(
      "SELECT setting_value FROM business_settings WHERE setting_key = 'upi_qr_url'",
      []
    );

    const qr_url = result.rows[0]?.setting_value || null;
    const upi_id_result = await query(
      "SELECT setting_value FROM business_settings WHERE setting_key = 'upi_id'",
      []
    );

    return successResponse(res, {
      qr_url,
      upi_id: upi_id_result.rows[0]?.setting_value || 'viaroad@upi',
    });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch QR code.', 500);
  }
};

// POST /api/payments - Submit payment screenshot
const submitPayment = async (req, res) => {
  try {
    const { booking_id, payment_type, transaction_ref } = req.body;

    if (!req.file) {
      return errorResponse(res, 'Payment screenshot is required.', 400);
    }

    // Verify booking belongs to user
    const bookingResult = await query(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
      [booking_id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      return errorResponse(res, 'Booking not found.', 404);
    }

    const booking = bookingResult.rows[0];
    const screenshot_url = `/uploads/payments/${req.file.filename}`;
    const amount = payment_type === 'security_deposit' ? booking.security_deposit : booking.estimated_amount;

    // Check if payment already submitted
    const existingPayment = await query(
      'SELECT id FROM payments WHERE booking_id = $1 AND payment_type = $2',
      [booking_id, payment_type || 'booking_payment']
    );

    if (existingPayment.rows.length > 0) {
      await query(
        `UPDATE payments SET screenshot_url = $1, transaction_ref = $2,
         status = 'screenshot_uploaded', updated_at = NOW()
         WHERE booking_id = $3 AND payment_type = $4`,
        [screenshot_url, transaction_ref || null, booking_id, payment_type || 'booking_payment']
      );
    } else {
      await query(
        `INSERT INTO payments (booking_id, user_id, payment_type, method, amount, status, screenshot_url, transaction_ref)
         VALUES ($1,$2,$3,'online_upi',$4,'screenshot_uploaded',$5,$6)`,
        [
          booking_id, req.user.id,
          payment_type || 'booking_payment',
          amount,
          screenshot_url,
          transaction_ref || null
        ]
      );
    }

    // Update booking status
    await query(
      `UPDATE bookings SET status = 'payment_verification_pending', updated_at = NOW()
       WHERE id = $1`,
      [booking_id]
    );

    // Notify admin
    await notificationService.createAdminNotification(
      'payment_submitted',
      'Payment Screenshot Submitted',
      `Payment screenshot submitted for Booking #${booking.booking_number}. Please verify.`,
      booking_id
    );

    return successResponse(res, null, 'Payment screenshot submitted. Admin will verify soon.');
  } catch (err) {
    console.error('SubmitPayment error:', err);
    return errorResponse(res, 'Failed to submit payment.', 500);
  }
};

// PUT /api/admin/payments/:id/verify - Admin verify payment
const verifyPayment = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { status, notes } = req.body; // 'verified' or 'failed'
    const payment_id = req.params.id;

    const paymentResult = await client.query(
      'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
      [payment_id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Payment not found.', 404);
    }

    const payment = paymentResult.rows[0];

    await client.query(
      `UPDATE payments SET status = $1, notes = $2, verified_by = $3, verified_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [status, notes || null, req.admin.id, payment_id]
    );

    // Update booking status based on payment result
    if (status === 'verified') {
      await client.query(
        `UPDATE bookings SET status = 'confirmed', is_temp_hold = FALSE, hold_expires_at = NULL, updated_at = NOW()
         WHERE id = $1`,
        [payment.booking_id]
      );

      await notificationService.createUserNotification(
        payment.user_id,
        'payment_verified',
        'Payment Verified',
        'Your payment has been verified. Booking is now confirmed!',
        payment.booking_id
      );
    }

    await client.query('COMMIT');
    return successResponse(res, null, `Payment ${status} successfully.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('VerifyPayment error:', err);
    return errorResponse(res, 'Failed to verify payment.', 500);
  } finally {
    client.release();
  }
};

// PUT /api/admin/payments/:id/cash-collected - Mark cash as collected
const markCashCollected = async (req, res) => {
  try {
    const { booking_id } = req.body;

    const bookingResult = await query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    if (bookingResult.rows.length === 0) {
      return errorResponse(res, 'Booking not found.', 404);
    }

    const booking = bookingResult.rows[0];

    const existing = await query(
      "SELECT id FROM payments WHERE booking_id = $1 AND payment_type = 'booking_payment'",
      [booking_id]
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE payments SET status = 'cash_collected', updated_at = NOW(), verified_by = $1, verified_at = NOW()
         WHERE booking_id = $2 AND payment_type = 'booking_payment'`,
        [req.admin.id, booking_id]
      );
    } else {
      await query(
        `INSERT INTO payments (booking_id, user_id, payment_type, method, amount, status, verified_by, verified_at)
         VALUES ($1,$2,'booking_payment','cash',$3,'cash_collected',$4,NOW())`,
        [booking_id, booking.user_id, booking.estimated_amount, req.admin.id]
      );
    }

    return successResponse(res, null, 'Cash payment marked as collected.');
  } catch (err) {
    console.error('MarkCashCollected error:', err);
    return errorResponse(res, 'Failed to update payment.', 500);
  }
};

// POST /api/admin/settings/upi-qr - Upload UPI QR code
const uploadUPIQR = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'QR code image is required.', 400);
    }

    const qr_url = `/uploads/qr/${req.file.filename}`;

    await query(
      `INSERT INTO business_settings (setting_key, setting_value, updated_by)
       VALUES ('upi_qr_url', $1, $2)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1, updated_by = $2, updated_at = NOW()`,
      [qr_url, req.admin.id]
    );

    return successResponse(res, { qr_url }, 'UPI QR code updated successfully.');
  } catch (err) {
    console.error('UploadUPIQR error:', err);
    return errorResponse(res, 'Failed to upload QR code.', 500);
  }
};

// GET /api/admin/payments - List all payments
const getAllPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.*, b.booking_number, b.service_type,
             u.full_name AS customer_name, u.email AS customer_email
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) {
      sql += ` AND p.status = $${idx++}`;
      params.push(status);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), offset);

    const result = await query(sql, params);
    return successResponse(res, { payments: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch payments.', 500);
  }
};

// GET /api/admin/refunds - List all refunds
const getAllRefunds = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, b.booking_number, u.full_name AS customer_name, u.email
       FROM refunds r
       LEFT JOIN bookings b ON r.booking_id = b.id
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    );

    return successResponse(res, { refunds: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch refunds.', 500);
  }
};

// PUT /api/admin/refunds/:id - Update refund status
const updateRefundStatus = async (req, res) => {
  try {
    const { status, refund_reference } = req.body;

    const result = await query(
      `UPDATE refunds SET status = $1, refund_reference = $2, processed_by = $3, processed_at = NOW(), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, refund_reference || null, req.admin.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Refund not found.', 404);
    }

    if (status === 'refunded') {
      const refund = result.rows[0];
      await query(
        `UPDATE bookings SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [refund.booking_id]
      );
    }

    return successResponse(res, { refund: result.rows[0] }, 'Refund status updated.');
  } catch (err) {
    console.error('UpdateRefund error:', err);
    return errorResponse(res, 'Failed to update refund.', 500);
  }
};

module.exports = {
  getUPIQR,
  submitPayment,
  verifyPayment,
  markCashCollected,
  uploadUPIQR,
  getAllPayments,
  getAllRefunds,
  updateRefundStatus,
};
