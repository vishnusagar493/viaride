const { query } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { generateComplaintNumber } = require('../utils/generateBookingNumber');
const notificationService = require('../services/notificationService');

// POST /api/complaints - Submit complaint
const submitComplaint = async (req, res) => {
  try {
    const { booking_id, category, description, contact_details } = req.body;

    const complaint_number = await generateComplaintNumber();

    const result = await query(
      `INSERT INTO complaints (complaint_number, user_id, booking_id, category, description, contact_details)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        complaint_number,
        req.user.id,
        booking_id || null,
        category,
        description.trim(),
        contact_details || null
      ]
    );

    const complaint = result.rows[0];

    await notificationService.createAdminNotification(
      'new_complaint',
      'New Customer Complaint',
      `Complaint #${complaint_number} received. Category: ${category}.`,
      null
    );

    return successResponse(res, { complaint }, 'Complaint submitted. We will respond shortly.', 201);
  } catch (err) {
    console.error('SubmitComplaint error:', err);
    return errorResponse(res, 'Failed to submit complaint.', 500);
  }
};

// GET /api/complaints/my - Customer's complaints
const getMyComplaints = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, b.booking_number
       FROM complaints c
       LEFT JOIN bookings b ON c.booking_id = b.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    return successResponse(res, { complaints: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch complaints.', 500);
  }
};

// GET /api/admin/complaints - All complaints
const getAllComplaints = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT c.*, u.full_name AS customer_name, u.email AS customer_email,
             b.booking_number
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN bookings b ON c.booking_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND c.status = $1';
      params.push(status);
    }

    sql += ' ORDER BY c.created_at DESC';

    const result = await query(sql, params);
    return successResponse(res, { complaints: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch complaints.', 500);
  }
};

// PUT /api/admin/complaints/:id - Respond to complaint
const updateComplaint = async (req, res) => {
  try {
    const { status, admin_response } = req.body;
    const validStatuses = ['open', 'in_progress', 'resolved'];

    if (!validStatuses.includes(status)) {
      return errorResponse(res, 'Invalid complaint status.', 400);
    }

    const resolved_at = status === 'resolved' ? new Date() : null;

    const result = await query(
      `UPDATE complaints
       SET status = $1, admin_response = $2, assigned_to = $3,
           resolved_at = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [status, admin_response || null, req.admin.id, resolved_at, req.params.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Complaint not found.', 404);
    }

    const complaint = result.rows[0];

    if (complaint.user_id) {
      await notificationService.createUserNotification(
        complaint.user_id,
        'complaint_update',
        `Complaint #${complaint.complaint_number} Update`,
        admin_response || `Your complaint status is now: ${status}.`,
        null
      );
    }

    return successResponse(res, { complaint }, 'Complaint updated.');
  } catch (err) {
    return errorResponse(res, 'Failed to update complaint.', 500);
  }
};

module.exports = {
  submitComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaint,
};
