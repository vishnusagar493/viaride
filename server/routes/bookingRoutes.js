const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400, errors.array());
  }
  next();
};

// All booking routes require authentication
router.use(verifyToken);

router.post('/', [
  body('vehicle_id').notEmpty().isUUID().withMessage('Valid vehicle ID is required'),
  body('service_type').isIn(['car_with_driver','bike_with_driver','self_drive_bike']).withMessage('Invalid service type'),
  body('pickup_location').trim().notEmpty().withMessage('Pickup location is required'),
  body('journey_date').isDate().withMessage('Valid journey date is required'),
  body('pickup_time').notEmpty().withMessage('Pickup time is required'),
  body('payment_method').isIn(['online_upi','cash']).withMessage('Invalid payment method'),
], validate, bookingController.createBooking);

router.get('/my', bookingController.getMyBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/:id/cancel', bookingController.cancelBooking);

module.exports = router;
