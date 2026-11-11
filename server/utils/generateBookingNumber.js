const { query } = require('../config/database');

/**
 * Generate unique booking number like VR1001, VR1002, ...
 */
const generateBookingNumber = async () => {
  const result = await query(
    "SELECT booking_number FROM bookings ORDER BY created_at DESC LIMIT 1"
  );

  if (result.rows.length === 0) {
    return 'VR1001';
  }

  const last = result.rows[0].booking_number;
  const num = parseInt(last.replace('VR', ''), 10);
  return `VR${num + 1}`;
};

const generateComplaintNumber = async () => {
  const result = await query(
    "SELECT complaint_number FROM complaints ORDER BY created_at DESC LIMIT 1"
  );

  if (result.rows.length === 0) {
    return 'CMP1001';
  }

  const last = result.rows[0].complaint_number;
  const num = parseInt(last.replace('CMP', ''), 10);
  return `CMP${num + 1}`;
};

module.exports = { generateBookingNumber, generateComplaintNumber };
