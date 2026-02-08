const User = require('../models/User');

// GET /api/wallet
// Returns wallet balances for the authenticated user
exports.getWallet = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    // Ensure numeric values
    const balance = Number(req.user.walletBalance || 0);
    const locked = Number(req.user.lockedBalance || 0);

    res.json({ balance, locked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/wallet/add
// Body: { amount }
exports.addToWallet = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    const amount = Number(req.body.amount || 0);
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    // Use atomic update to avoid race conditions
    const updated = await User.findByIdAndUpdate(req.user._id, { $inc: { walletBalance: amount } }, { new: true }).select('-password');
    return res.json({ balance: Number(updated.walletBalance || 0), locked: Number(updated.lockedBalance || 0) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/wallet/withdraw
// Body: { amount }
exports.withdrawFromWallet = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    const amount = Number(req.body.amount || 0);
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    // Ensure user has enough available balance
    const user = await User.findById(req.user._id).select('walletBalance lockedBalance');
    const available = Number(user.walletBalance || 0);
    if (available < amount) return res.status(400).json({ message: 'Insufficient balance' });

    // Deduct amount
    const updated = await User.findByIdAndUpdate(req.user._id, { $inc: { walletBalance: -amount } }, { new: true }).select('-password');
    return res.json({ balance: Number(updated.walletBalance || 0), locked: Number(updated.lockedBalance || 0) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
