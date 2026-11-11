const { query } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// POST /api/reviews - Submit review
const submitReview = async (req, res) => {
  try {
    const { booking_id, rating, comment } = req.body;

    // Verify booking belongs to user and is completed
    const bookingResult = await query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
      [booking_id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      return errorResponse(res, 'You can only review completed bookings.', 400);
    }

    // Check for duplicate review
    const existing = await query(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [booking_id]
    );

    if (existing.rows.length > 0) {
      return errorResponse(res, 'You have already reviewed this booking.', 409);
    }

    const result = await query(
      `INSERT INTO reviews (booking_id, user_id, rating, comment)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [booking_id, req.user.id, parseInt(rating), comment?.trim() || null]
    );

    return successResponse(res, { review: result.rows[0] }, 'Review submitted. Thank you for your feedback!', 201);
  } catch (err) {
    console.error('SubmitReview error:', err);
    return errorResponse(res, 'Failed to submit review.', 500);
  }
};

// GET /api/reviews - Public approved reviews
const getApprovedReviews = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, u.full_name AS customer_name, b.service_type
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN bookings b ON r.booking_id = b.id
       WHERE r.status = 'approved'
       ORDER BY r.created_at DESC
       LIMIT 20`
    );

    return successResponse(res, { reviews: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch reviews.', 500);
  }
};

// GET /api/reviews/my - Customer's own reviews
const getMyReviews = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, b.booking_number, b.service_type
       FROM reviews r
       LEFT JOIN bookings b ON r.booking_id = b.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return successResponse(res, { reviews: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch reviews.', 500);
  }
};

// GET /api/admin/reviews - Admin get all reviews
const getAllReviews = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, u.full_name AS customer_name, b.booking_number, b.service_type
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN bookings b ON r.booking_id = b.id
       ORDER BY r.created_at DESC`
    );

    return successResponse(res, { reviews: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch reviews.', 500);
  }
};

// PUT /api/admin/reviews/:id - Update review status
const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'hidden', 'removed'];

    if (!validStatuses.includes(status)) {
      return errorResponse(res, 'Invalid review status.', 400);
    }

    const result = await query(
      `UPDATE reviews SET status = $1, approved_by = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, req.admin.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Review not found.', 404);
    }

    return successResponse(res, { review: result.rows[0] }, 'Review status updated.');
  } catch (err) {
    return errorResponse(res, 'Failed to update review.', 500);
  }
};

module.exports = {
  submitReview,
  getApprovedReviews,
  getMyReviews,
  getAllReviews,
  updateReviewStatus,
};
