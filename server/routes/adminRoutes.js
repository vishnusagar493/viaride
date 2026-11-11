const express = require('express');
const router = express.Router();
const { adminLogin, adminLogout, getAdminMe } = require('../controllers/authController');
const { verifyAdminToken } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');
const vehicleController = require('../controllers/vehicleController');
const paymentController = require('../controllers/paymentController');
const rentalController = require('../controllers/rentalController');
const reviewController = require('../controllers/reviewController');
const complaintController = require('../controllers/complaintController');
const notificationController = require('../controllers/notificationController');
const settingsController = require('../controllers/settingsController');
const { uploadVehicleImage, uploadQR } = require('../middleware/upload');

// Auth
router.post('/auth/login', adminLogin);
router.post('/auth/logout', verifyAdminToken, adminLogout);
router.get('/auth/me', verifyAdminToken, getAdminMe);

// Dashboard
router.get('/dashboard/stats', verifyAdminToken, bookingController.getDashboardStats);

// Bookings
router.get('/bookings', verifyAdminToken, bookingController.getAllBookings);
router.put('/bookings/:id/status', verifyAdminToken, bookingController.updateBookingStatus);

// Vehicles
router.get('/vehicles', verifyAdminToken, vehicleController.getVehicles);
router.post('/vehicles', verifyAdminToken, uploadVehicleImage.single('image'), vehicleController.addVehicle);
router.put('/vehicles/:id', verifyAdminToken, uploadVehicleImage.single('image'), vehicleController.updateVehicle);
router.delete('/vehicles/:id', verifyAdminToken, vehicleController.deleteVehicle);

// Payments
router.get('/payments', verifyAdminToken, paymentController.getAllPayments);
router.put('/payments/:id/verify', verifyAdminToken, paymentController.verifyPayment);
router.post('/payments/cash-collected', verifyAdminToken, paymentController.markCashCollected);
router.post('/settings/upi-qr', verifyAdminToken, uploadQR.single('qr_image'), paymentController.uploadUPIQR);

// Refunds
router.get('/refunds', verifyAdminToken, paymentController.getAllRefunds);
router.put('/refunds/:id', verifyAdminToken, paymentController.updateRefundStatus);

// Rental documents
router.get('/rentals/:booking_id/documents', verifyAdminToken, rentalController.getDocumentsAdmin);
router.put('/rentals/:booking_id/documents/verify', verifyAdminToken, rentalController.verifyDocuments);
router.put('/rentals/:booking_id/physical-verify', verifyAdminToken, rentalController.recordPhysicalVerification);
router.post('/rentals/:booking_id/handover', verifyAdminToken, rentalController.recordHandover);
router.post('/rentals/:booking_id/return', verifyAdminToken, rentalController.recordReturn);

// Reviews
router.get('/reviews', verifyAdminToken, reviewController.getAllReviews);
router.put('/reviews/:id', verifyAdminToken, reviewController.updateReviewStatus);

// Complaints
router.get('/complaints', verifyAdminToken, complaintController.getAllComplaints);
router.put('/complaints/:id', verifyAdminToken, complaintController.updateComplaint);

// Notifications
router.get('/notifications', verifyAdminToken, notificationController.getAdminNotifications);

// Settings
router.get('/settings', verifyAdminToken, settingsController.getSettings);
router.put('/settings', verifyAdminToken, settingsController.updateSettings);

// Customers
router.get('/customers', verifyAdminToken, settingsController.getCustomers);
router.put('/customers/:id/deactivate', verifyAdminToken, settingsController.deactivateCustomer);

module.exports = router;
