const { query } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// GET /api/notifications - Customer notifications
const getMyNotifications = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    return successResponse(res, { notifications: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch notifications.', 500);
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    return successResponse(res, null, 'Notification marked as read.');
  } catch (err) {
    return errorResponse(res, 'Failed to update notification.', 500);
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [req.user.id]
    );

    return successResponse(res, null, 'All notifications marked as read.');
  } catch (err) {
    return errorResponse(res, 'Failed to update notifications.', 500);
  }
};

// GET /api/admin/notifications - Admin notifications
const getAdminNotifications = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM notifications
       WHERE admin_id = $1 OR (user_id IS NULL AND admin_id IS NULL AND type LIKE 'admin_%')
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.admin.id]
    );

    return successResponse(res, { notifications: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch admin notifications.', 500);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getAdminNotifications,
};
