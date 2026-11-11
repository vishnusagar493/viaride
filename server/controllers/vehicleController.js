const { query } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');

// GET /api/vehicles - List all available vehicles (public)
const getVehicles = async (req, res) => {
  try {
    const { category, available } = req.query;

    let sql = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];
    let idx = 1;

    if (category) {
      sql += ` AND category = $${idx++}`;
      params.push(category);
    }

    if (available === 'true') {
      sql += ` AND is_available = TRUE AND is_under_maintenance = FALSE`;
    }

    sql += ' ORDER BY category, vehicle_name';

    const result = await query(sql, params);
    return successResponse(res, { vehicles: result.rows });
  } catch (err) {
    console.error('GetVehicles error:', err);
    return errorResponse(res, 'Failed to fetch vehicles.', 500);
  }
};

// GET /api/vehicles/:id
const getVehicleById = async (req, res) => {
  try {
    const result = await query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return errorResponse(res, 'Vehicle not found.', 404);
    }
    return successResponse(res, { vehicle: result.rows[0] });
  } catch (err) {
    return errorResponse(res, 'Failed to fetch vehicle.', 500);
  }
};

// POST /api/admin/vehicles - Add vehicle (admin only)
const addVehicle = async (req, res) => {
  try {
    const {
      vehicle_name, registration_number, category, seating_capacity,
      fuel_type, description, base_price, price_per_km, hourly_rate, daily_rate, features
    } = req.body;

    const image_url = req.file ? `/uploads/vehicles/${req.file.filename}` : null;

    const result = await query(
      `INSERT INTO vehicles (
        vehicle_name, registration_number, category, seating_capacity,
        fuel_type, description, image_url, base_price, price_per_km,
        hourly_rate, daily_rate, features
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        vehicle_name, registration_number, category,
        parseInt(seating_capacity) || 1, fuel_type || 'Petrol',
        description, image_url,
        parseFloat(base_price) || 0, parseFloat(price_per_km) || 0,
        parseFloat(hourly_rate) || 0, parseFloat(daily_rate) || 0,
        features ? (Array.isArray(features) ? features : features.split(',')) : []
      ]
    );

    return successResponse(res, { vehicle: result.rows[0] }, 'Vehicle added successfully.', 201);
  } catch (err) {
    console.error('AddVehicle error:', err);
    if (err.code === '23505') {
      return errorResponse(res, 'Registration number already exists.', 409);
    }
    return errorResponse(res, 'Failed to add vehicle.', 500);
  }
};

// PUT /api/admin/vehicles/:id - Update vehicle
const updateVehicle = async (req, res) => {
  try {
    const {
      vehicle_name, registration_number, category, seating_capacity,
      fuel_type, description, base_price, price_per_km, hourly_rate,
      daily_rate, is_available, is_under_maintenance, features
    } = req.body;

    const image_url = req.file ? `/uploads/vehicles/${req.file.filename}` : undefined;

    const existing = await query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Vehicle not found.', 404);
    }

    const v = existing.rows[0];

    const result = await query(
      `UPDATE vehicles SET
        vehicle_name = COALESCE($1, vehicle_name),
        registration_number = COALESCE($2, registration_number),
        category = COALESCE($3, category),
        seating_capacity = COALESCE($4, seating_capacity),
        fuel_type = COALESCE($5, fuel_type),
        description = COALESCE($6, description),
        image_url = COALESCE($7, image_url),
        base_price = COALESCE($8, base_price),
        price_per_km = COALESCE($9, price_per_km),
        hourly_rate = COALESCE($10, hourly_rate),
        daily_rate = COALESCE($11, daily_rate),
        is_available = COALESCE($12, is_available),
        is_under_maintenance = COALESCE($13, is_under_maintenance),
        features = COALESCE($14, features),
        updated_at = NOW()
      WHERE id = $15
      RETURNING *`,
      [
        vehicle_name, registration_number, category,
        seating_capacity ? parseInt(seating_capacity) : null,
        fuel_type, description, image_url,
        base_price ? parseFloat(base_price) : null,
        price_per_km ? parseFloat(price_per_km) : null,
        hourly_rate ? parseFloat(hourly_rate) : null,
        daily_rate ? parseFloat(daily_rate) : null,
        is_available !== undefined ? is_available === 'true' || is_available === true : null,
        is_under_maintenance !== undefined ? is_under_maintenance === 'true' || is_under_maintenance === true : null,
        features ? (Array.isArray(features) ? features : features.split(',')) : null,
        req.params.id
      ]
    );

    return successResponse(res, { vehicle: result.rows[0] }, 'Vehicle updated successfully.');
  } catch (err) {
    console.error('UpdateVehicle error:', err);
    return errorResponse(res, 'Failed to update vehicle.', 500);
  }
};

// DELETE /api/admin/vehicles/:id
const deleteVehicle = async (req, res) => {
  try {
    const activeBookings = await query(
      `SELECT id FROM bookings WHERE vehicle_id = $1 AND status IN ('confirmed','pending_approval','awaiting_payment','payment_verification_pending')`,
      [req.params.id]
    );

    if (activeBookings.rows.length > 0) {
      return errorResponse(res, 'Cannot delete vehicle with active bookings.', 400);
    }

    await query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
    return successResponse(res, null, 'Vehicle deleted successfully.');
  } catch (err) {
    console.error('DeleteVehicle error:', err);
    return errorResponse(res, 'Failed to delete vehicle.', 500);
  }
};

// GET /api/vehicles/:id/availability - Check vehicle availability for date/time
const checkAvailability = async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { journey_date, pickup_time, service_type, return_date, return_time } = req.query;

    if (!journey_date || !pickup_time) {
      return errorResponse(res, 'Journey date and pickup time are required.', 400);
    }

    const vehicle = await query(
      'SELECT * FROM vehicles WHERE id = $1 AND is_available = TRUE AND is_under_maintenance = FALSE',
      [vehicle_id]
    );

    if (vehicle.rows.length === 0) {
      return successResponse(res, { available: false, reason: 'Vehicle is not available or under maintenance.' });
    }

    // Check for conflicting confirmed bookings
    // For self-drive: check date range overlap
    // For others: check same-day time overlap (with 30 min buffer)

    let conflictQuery;
    let conflictParams;

    if (service_type === 'self_drive_bike') {
      const endDate = return_date || journey_date;
      conflictQuery = `
        SELECT id, journey_date, return_date FROM bookings
        WHERE vehicle_id = $1
          AND status IN ('confirmed', 'payment_verification_pending', 'awaiting_payment')
          AND (
            (journey_date <= $2 AND COALESCE(return_date, journey_date) >= $3)
          )
      `;
      conflictParams = [vehicle_id, endDate, journey_date];
    } else {
      // For driver services, check time-based conflict on same day (30 min buffer)
      conflictQuery = `
        SELECT id FROM bookings
        WHERE vehicle_id = $1
          AND journey_date = $2
          AND status IN ('confirmed', 'payment_verification_pending', 'awaiting_payment')
          AND (
            pickup_time BETWEEN ($3::TIME - INTERVAL '30 minutes') AND ($3::TIME + INTERVAL '30 minutes')
          )
      `;
      conflictParams = [vehicle_id, journey_date, pickup_time];
    }

    const conflicts = await query(conflictQuery, conflictParams);

    if (conflicts.rows.length > 0) {
      return successResponse(res, {
        available: false,
        reason: 'Vehicle is already booked for the selected time slot.',
      });
    }

    return successResponse(res, { available: true });
  } catch (err) {
    console.error('CheckAvailability error:', err);
    return errorResponse(res, 'Failed to check availability.', 500);
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  checkAvailability,
};
