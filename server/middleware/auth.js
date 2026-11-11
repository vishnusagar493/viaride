const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Verify customer JWT token from HTTP-only cookie or Authorization header
 */
const verifyToken = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Fallback to Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Access denied. Please log in.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await query(
      'SELECT id, full_name, email, mobile, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found.', 401);
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return errorResponse(res, 'Account has been deactivated. Contact support.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Session expired. Please log in again.', 401);
    }
    return errorResponse(res, 'Invalid token.', 401);
  }
};

/**
 * Verify admin JWT token
 */
const verifyAdminToken = async (req, res, next) => {
  try {
    let token = req.cookies?.adminToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Admin access required. Please log in.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return errorResponse(res, 'Unauthorized. Admin access only.', 403);
    }

    const result = await query(
      'SELECT id, name, email, role, is_active FROM admins WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Admin not found.', 401);
    }

    const admin = result.rows[0];
    if (!admin.is_active) {
      return errorResponse(res, 'Admin account is disabled.', 403);
    }

    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Session expired. Please log in again.', 401);
    }
    return errorResponse(res, 'Invalid admin token.', 401);
  }
};

module.exports = { verifyToken, verifyAdminToken };
