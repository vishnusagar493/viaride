const { query } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// GET /api/admin/settings - Get all settings
const getSettings = async (req, res) => {
  try {
    const result = await query('SELECT * FROM business_settings ORDER BY setting_key');
    return successResponse(res, { settings: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch settings.', 500);
  }
};

// PUT /api/admin/settings - Update settings
const updateSettings = async (req, res) => {
  try {
    const updates = req.body; // { setting_key: value, ... }

    for (const [key, value] of Object.entries(updates)) {
      await query(
        `INSERT INTO business_settings (setting_key, setting_value, updated_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_by = $3, updated_at = NOW()`,
        [key, value, req.admin.id]
      );
    }

    return successResponse(res, null, 'Settings updated successfully.');
  } catch (err) {
    console.error('UpdateSettings error:', err);
    return errorResponse(res, 'Failed to update settings.', 500);
  }
};

// GET /api/settings/public - Get public settings (contact info etc)
const getPublicSettings = async (req, res) => {
  try {
    const publicKeys = [
      'contact_email', 'contact_phone', 'business_hours',
      'facebook_url', 'instagram_url', 'twitter_url'
    ];

    const result = await query(
      `SELECT setting_key, setting_value FROM business_settings WHERE setting_key = ANY($1)`,
      [publicKeys]
    );

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    return successResponse(res, { settings });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch settings.', 500);
  }
};

// GET /api/admin/customers - List customers
const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT u.id, u.full_name, u.email, u.mobile, u.is_active, u.created_at,
             COUNT(b.id) AS total_bookings
      FROM users u
      LEFT JOIN bookings b ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (search) {
      sql += ` AND (u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.mobile ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), offset);

    const result = await query(sql, params);
    return successResponse(res, { customers: result.rows });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch customers.', 500);
  }
};

// PUT /api/admin/customers/:id/deactivate
const deactivateCustomer = async (req, res) => {
  try {
    await query(
      'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    return successResponse(res, null, 'Customer account deactivated.');
  } catch (err) {
    return errorResponse(res, 'Failed to deactivate customer.', 500);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getPublicSettings,
  getCustomers,
  deactivateCustomer,
};
