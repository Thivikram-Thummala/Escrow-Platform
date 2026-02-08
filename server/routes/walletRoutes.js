const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getWallet, addToWallet, withdrawFromWallet } = require('../controllers/walletController');

// GET /api/wallet - get current user's wallet balances
router.get('/', protect, getWallet);

// POST /api/wallet/add - add amount to user's available wallet
router.post('/add', protect, addToWallet);

// POST /api/wallet/withdraw - withdraw amount from user's available wallet
router.post('/withdraw', protect, withdrawFromWallet);

module.exports = router;
