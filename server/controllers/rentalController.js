const { query, getClient } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');

// POST /api/rentals/:booking_id/documents - Upload rental documents
const uploadDocuments = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const bookingResult = await query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND service_type = 'self_drive_bike'`,
      [booking_id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      return errorResponse(res, 'Self-drive booking not found.', 404);
    }

    const files = req.files;
    const aadhaar_url = files?.aadhaar?.[0] ? `/uploads/documents/${files.aadhaar[0].filename}` : null;
    const driving_licence_url = files?.driving_licence?.[0] ? `/uploads/documents/${files.driving_licence[0].filename}` : null;
    const pan_card_url = files?.pan_card?.[0] ? `/uploads/documents/${files.pan_card[0].filename}` : null;

    if (!aadhaar_url || !driving_licence_url || !pan_card_url) {
      return errorResponse(res, 'Aadhaar, Driving Licence, and PAN Card are all required.', 400);
    }

    const existing = await query(
      'SELECT id FROM rental_documents WHERE booking_id = $1',
      [booking_id]
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE rental_documents SET
         aadhaar_url = $1, driving_licence_url = $2, pan_card_url = $3,
         verification_status = 'pending', updated_at = NOW()
         WHERE booking_id = $4`,
        [aadhaar_url, driving_licence_url, pan_card_url, booking_id]
      );
    } else {
      await query(
        `INSERT INTO rental_documents (booking_id, user_id, aadhaar_url, driving_licence_url, pan_card_url)
         VALUES ($1,$2,$3,$4,$5)`,
        [booking_id, req.user.id, aadhaar_url, driving_licence_url, pan_card_url]
      );
    }

    // Notify admin
    const booking = bookingResult.rows[0];
    await notificationService.createAdminNotification(
      'document_uploaded',
      'Rental Documents Submitted',
      `Documents submitted for Booking #${booking.booking_number}. Please verify.`,
      booking_id
    );

    return successResponse(res, null, 'Documents uploaded successfully. Admin will verify them.');
  } catch (err) {
    console.error('UploadDocuments error:', err);
    return errorResponse(res, 'Failed to upload documents.', 500);
  }
};

// GET /api/admin/rentals/:booking_id/documents - Admin view documents
const getDocumentsAdmin = async (req, res) => {
  try {
    const result = await query(
      `SELECT rd.*, u.full_name AS customer_name, u.email AS customer_email,
              b.booking_number
       FROM rental_documents rd
       LEFT JOIN users u ON rd.user_id = u.id
       LEFT JOIN bookings b ON rd.booking_id = b.id
       WHERE rd.booking_id = $1`,
      [req.params.booking_id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Documents not found.', 404);
    }

    return successResponse(res, { documents: result.rows[0] });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch documents.', 500);
  }
};

// PUT /api/admin/rentals/:booking_id/documents/verify - Admin verify documents
const verifyDocuments = async (req, res) => {
  try {
    const { verification_status, admin_remarks } = req.body;

    const result = await query(
      `UPDATE rental_documents SET
       verification_status = $1, admin_remarks = $2, updated_at = NOW()
       WHERE booking_id = $3 RETURNING *`,
      [verification_status, admin_remarks || null, req.params.booking_id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Documents not found.', 404);
    }

    const doc = result.rows[0];
    await notificationService.createUserNotification(
      doc.user_id,
      'document_verified',
      'Document Verification Update',
      `Your rental documents status: ${verification_status.replace(/_/g, ' ')}.`,
      req.params.booking_id
    );

    return successResponse(res, { documents: result.rows[0] }, 'Document verification updated.');
  } catch (err) {
    return errorResponse(res, 'Failed to verify documents.', 500);
  }
};

// PUT /api/admin/rentals/:booking_id/physical-verify - Record physical verification
const recordPhysicalVerification = async (req, res) => {
  try {
    await query(
      `UPDATE rental_documents SET
       physical_verified = TRUE, physical_verified_by = $1, physical_verified_at = NOW(), updated_at = NOW()
       WHERE booking_id = $2`,
      [req.admin.id, req.params.booking_id]
    );

    return successResponse(res, null, 'Physical verification recorded.');
  } catch (err) {
    return errorResponse(res, 'Failed to record physical verification.', 500);
  }
};

// POST /api/admin/rentals/:booking_id/handover - Record bike handover
const recordHandover = async (req, res) => {
  try {
    const { bike_condition_at_handover, fuel_level_at_handover, odometer_at_handover, notes } = req.body;

    const existing = await query(
      'SELECT id FROM bike_handover_records WHERE booking_id = $1',
      [req.params.booking_id]
    );

    if (existing.rows.length > 0) {
      return errorResponse(res, 'Handover already recorded.', 400);
    }

    await query(
      `INSERT INTO bike_handover_records
       (booking_id, handover_time, handover_by, bike_condition_at_handover, fuel_level_at_handover, odometer_at_handover, notes)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6)`,
      [
        req.params.booking_id, req.admin.id,
        bike_condition_at_handover || 'Good', fuel_level_at_handover || 'Full',
        odometer_at_handover ? parseInt(odometer_at_handover) : null, notes
      ]
    );

    return successResponse(res, null, 'Bike handover recorded successfully.');
  } catch (err) {
    console.error('RecordHandover error:', err);
    return errorResponse(res, 'Failed to record handover.', 500);
  }
};

// POST /api/admin/rentals/:booking_id/return - Record bike return
const recordReturn = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      bike_condition_at_return, fuel_level_at_return, odometer_at_return,
      has_damage, damage_description, late_charges, deposit_deduction_reason, notes
    } = req.body;

    const lateCharge = parseFloat(late_charges) || 0;
    const depositRefund = Math.max(0, 2000 - lateCharge);

    await client.query(
      `INSERT INTO bike_return_records
       (booking_id, return_time, recorded_by, bike_condition_at_return, fuel_level_at_return,
        odometer_at_return, has_damage, damage_description, late_return, late_charges,
        deposit_refund_amount, deposit_deduction_reason, notes)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        req.params.booking_id, req.admin.id,
        bike_condition_at_return || 'Good', fuel_level_at_return || 'Full',
        odometer_at_return ? parseInt(odometer_at_return) : null,
        has_damage === true || has_damage === 'true', damage_description || null,
        lateCharge > 0,
        lateCharge, depositRefund,
        deposit_deduction_reason || null, notes || null
      ]
    );

    await client.query(
      `UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [req.params.booking_id]
    );

    await client.query('COMMIT');

    return successResponse(res, { deposit_refund_amount: depositRefund }, 'Bike return recorded. Booking marked as completed.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('RecordReturn error:', err);
    return errorResponse(res, 'Failed to record return.', 500);
  } finally {
    client.release();
  }
};

module.exports = {
  uploadDocuments,
  getDocumentsAdmin,
  verifyDocuments,
  recordPhysicalVerification,
  recordHandover,
  recordReturn,
};
