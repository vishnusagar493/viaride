const { query } = require('../config/database');

/**
 * Create in-app notifications
 */

const createUserNotification = async (user_id, type, title, message, related_id = null, related_type = null) => {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [user_id, type, title, message, related_id, related_type]
    );
  } catch (err) {
    console.error('CreateUserNotification error:', err.message);
  }
};

const createAdminNotification = async (type, title, message, related_id = null) => {
  try {
    // Fetch all active admins and create notification for each
    const admins = await query('SELECT id FROM admins WHERE is_active = TRUE');
    
    for (const admin of admins.rows) {
      await query(
        `INSERT INTO notifications (admin_id, type, title, message, related_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [admin.id, type, title, message, related_id]
      );
    }
  } catch (err) {
    console.error('CreateAdminNotification error:', err.message);
  }
};

module.exports = {
  createUserNotification,
  createAdminNotification,
};
