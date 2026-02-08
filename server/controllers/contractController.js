const Contract = require("../models/Contract");
const User = require("../models/User");
const Transaction = require("../models/Transaction");      

// Create Contract (Client only)
exports.createContract = async (req, res) => {
  try {
    const { freelancerEmail, title, description, totalAmount } = req.body;

    if (!freelancerEmail) return res.status(400).json({ message: 'Freelancer email is required' });

    const freelancer = await User.findOne({ email: freelancerEmail });
    if (!freelancer || freelancer.role !== "freelancer") {
      return res.status(400).json({ message: "Invalid freelancer email" });
    }

    const contract = await Contract.create({
      client: req.user._id,
      freelancer: freelancer._id,
      title,
      description,
      totalAmount
    });

    res.status(201).json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get My Contracts
exports.getMyContracts = async (req, res) => {
  try {
    const contracts = await Contract.find({
      $or: [
        { client: req.user._id },
        { freelancer: req.user._id }
      ]
    })
      .populate("client", "name email")
      .populate("freelancer", "name email");

    res.json(contracts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Accept Contract (Freelancer only)
exports.acceptContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    if (contract.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    contract.status = "ACTIVE";
    await contract.save();

    res.json({ message: "Contract accepted", contract });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Client funds contract(escrow)
exports.fundEscrow = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    if (contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.walletBalance < contract.totalAmount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Deduct from client wallet
    req.user.walletBalance -= contract.totalAmount;
    req.user.lockedBalance += contract.totalAmount;

    await req.user.save();

    await Transaction.create({
      from: req.user._id,
      to: null,
      amount: contract.totalAmount,
      type: "FUND_ESCROW",
      contract: contract._id
    });

    // mark contract as funded
    contract.funded = true;
    await contract.save();

    res.json({ message: "Escrow funded successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

  // Client marks contract as completed
  exports.completeContract = async (req, res) => {
    try {
      const contract = await Contract.findById(req.params.id);

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      if (contract.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (contract.status === 'COMPLETED') {
        return res.status(400).json({ message: 'Contract already completed' });
      }

      contract.status = 'COMPLETED';
      await contract.save();

      res.json({ message: 'Contract marked as completed', contract });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
