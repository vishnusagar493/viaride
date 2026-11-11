const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

const setAuthCookie = (res, token, cookieName = 'token') => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { full_name, email, mobile, password, whatsapp_consent } = req.body;

    // Check duplicates
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR mobile = $2',
      [email.toLowerCase(), mobile]
    );

    if (existing.rows.length > 0) {
      const dup = existing.rows[0];
      return errorResponse(res, 'An account with this email or mobile number already exists.', 409);
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (full_name, email, mobile, password_hash, whatsapp_consent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, mobile, created_at`,
      [full_name.trim(), email.toLowerCase().trim(), mobile.trim(), password_hash, whatsapp_consent || false]
    );

    const user = result.rows[0];
    const token = generateToken({ id: user.id, role: 'user' });
    setAuthCookie(res, token, 'token');

    return successResponse(res, { user }, 'Registration successful. Welcome to VIAROAD!', 201);
  } catch (err) {
    console.error('Register error:', err);
    return errorResponse(res, 'Registration failed. Please try again.', 500);
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const result = await query(
      'SELECT * FROM users WHERE email = $1 OR mobile = $1',
      [identifier.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Invalid credentials.', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return errorResponse(res, 'Account has been deactivated. Contact support.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials.', 401);
    }

    const token = generateToken({ id: user.id, role: 'user' });
    setAuthCookie(res, token, 'token');

    const { password_hash, ...userWithoutPassword } = user;
    return successResponse(res, { user: userWithoutPassword }, 'Login successful!');
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse(res, 'Login failed. Please try again.', 500);
  }
};

// POST /api/auth/logout
const logout = (req, res) => {
  res.clearCookie('token');
  return successResponse(res, null, 'Logged out successfully.');
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, full_name, email, mobile, whatsapp_consent, profile_image, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found.', 404);
    }

    return successResponse(res, { user: result.rows[0] });
  } catch (err) {
    console.error('GetMe error:', err);
    return errorResponse(res, 'Failed to get user info.', 500);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, mobile, whatsapp_consent } = req.body;

    // Check mobile conflict
    if (mobile) {
      const existing = await query(
        'SELECT id FROM users WHERE mobile = $1 AND id != $2',
        [mobile, req.user.id]
      );
      if (existing.rows.length > 0) {
        return errorResponse(res, 'Mobile number already in use.', 409);
      }
    }

    const result = await query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           mobile = COALESCE($2, mobile),
           whatsapp_consent = COALESCE($3, whatsapp_consent),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, full_name, email, mobile, whatsapp_consent`,
      [full_name, mobile, whatsapp_consent, req.user.id]
    );

    return successResponse(res, { user: result.rows[0] }, 'Profile updated successfully.');
  } catch (err) {
    console.error('UpdateProfile error:', err);
    return errorResponse(res, 'Profile update failed.', 500);
  }
};

// ========================
// ADMIN AUTH
// ========================

// POST /api/admin/auth/login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT * FROM admins WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Invalid admin credentials.', 401);
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return errorResponse(res, 'Admin account is disabled.', 403);
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid admin credentials.', 401);
    }

    // Update last login
    await query('UPDATE admins SET last_login = NOW() WHERE id = $1', [admin.id]);

    const token = generateToken({ id: admin.id, role: 'admin' });
    setAuthCookie(res, token, 'adminToken');

    const { password_hash, ...adminData } = admin;
    return successResponse(res, { admin: adminData }, 'Admin login successful!');
  } catch (err) {
    console.error('AdminLogin error:', err);
    return errorResponse(res, 'Login failed. Please try again.', 500);
  }
};

// POST /api/admin/auth/logout
const adminLogout = (req, res) => {
  res.clearCookie('adminToken');
  return successResponse(res, null, 'Admin logged out successfully.');
};

// GET /api/admin/auth/me
const getAdminMe = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, last_login, created_at FROM admins WHERE id = $1',
      [req.admin.id]
    );

    return successResponse(res, { admin: result.rows[0] });
  } catch (err) {
    return errorResponse(res, 'Failed to get admin info.', 500);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  adminLogin,
  adminLogout,
  getAdminMe,
};
