const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

// Public routes
router.get('/', vehicleController.getVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.get('/:vehicle_id/availability', vehicleController.checkAvailability);

module.exports = router;
