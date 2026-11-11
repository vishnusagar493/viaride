const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/auth');

router.get('/', reviewController.getApprovedReviews); // public
router.post('/', verifyToken, reviewController.submitReview);
router.get('/my', verifyToken, reviewController.getMyReviews);

module.exports = router;
