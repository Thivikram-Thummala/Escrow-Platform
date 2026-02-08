const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getTransactions } = require('../controllers/transactionController');

// GET /api/transactions - list transactions for authenticated user
router.get('/', protect, getTransactions);

module.exports = router;
