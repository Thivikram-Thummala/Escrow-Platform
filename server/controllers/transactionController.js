const Transaction = require('../models/Transaction');

// GET /api/transactions
// Returns transactions where the authenticated user is either sender or receiver
exports.getTransactions = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    // If admin (special hardcoded id), return all transactions
    const isAdmin = req.user.role === 'admin' || req.user._id === 'admin-static-id';

    let query = {};
    if (!isAdmin) { // regular user, get only their transactions
      const userId = req.user._id;
      query = { $or: [{ from: userId }, { to: userId }] }; 
    }

    const transactions = await Transaction.find(query)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .populate('contract', 'title')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
