const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, complaintController.submitComplaint);
router.get('/my', verifyToken, complaintController.getMyComplaints);

module.exports = router;
