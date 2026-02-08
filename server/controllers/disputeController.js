const Dispute = require("../models/Dispute");
const Milestone = require("../models/Milestone");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Contract = require("../models/Contract");

// Freelancer raises a dispute on a milestone
exports.raiseDispute = async (req, res) => {
  try {
    const { reason } = req.body;

    const milestone = await Milestone.findById(req.params.milestoneId)
      .populate("contract");

    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    if (milestone.contract.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const dispute = await Dispute.create({
      contract: milestone.contract._id,
      milestone: milestone._id,
      raisedBy: req.user._id,
      reason
    });
    // update milestone status and remember previous status
    try {
      milestone.prevStatus = milestone.status;
      milestone.status = 'DISPUTED';
      await milestone.save();
    } catch (e) {
      // non-fatal; log and continue
      console.error('Failed to update milestone status to DISPUTED', e.message || e);
    }
  

    res.status(201).json(dispute);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Freelancer edits their open dispute
exports.updateDispute = async (req, res) => {
  try {
    const { reason } = req.body;

    const dispute = await Dispute.findById(req.params.id).populate('milestone');
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    if (dispute.raisedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this dispute' });
    }

    if (dispute.status === 'RESOLVED') {
      return res.status(400).json({ message: 'Cannot edit a resolved dispute' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    dispute.reason = reason.trim();
    await dispute.save();

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: get all disputes
exports.getAllDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate({ path: 'milestone', populate: { path: 'contract' } })
      .populate('contract')
      .populate('raisedBy')
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Admin resolves dispute
exports.resolveDispute = async (req, res) => {
  try {
    const { action } = req.body; 
    // action = "RELEASE" | "REFUND" | "SPLIT"

    const dispute = await Dispute.findById(req.params.id)
      .populate({
        path: "milestone",
        populate: { path: "contract" }
      });

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    if (dispute.status === "RESOLVED") {
      return res.status(400).json({ message: "Already resolved" });
    }

    const milestone = dispute.milestone;
    const contract = milestone.contract;

    const client = await User.findById(contract.client);
    const freelancer = await User.findById(contract.freelancer);

    let amount = milestone.amount;

    if (action === "RELEASE") {
      client.lockedBalance -= milestone.amount;
      freelancer.walletBalance += milestone.amount;
      
      // Transfer from client to freelancer
      await Transaction.create({
      from: client._id,
      to: freelancer._id,
      amount: amount,
      type: "RELEASE_PAYMENT",
      contract: contract._id
    });
    }

    if (action === "REFUND") {
      client.lockedBalance -= milestone.amount;
      client.walletBalance += milestone.amount;

      //Escrow refund back to client
      await Transaction.create({
      from: null,
      to: client._id,
      amount: amount,
      type: "REFUND_PAYMENT",
      contract: contract._id
    });
    }

    if (action === "SPLIT") {
      const half = milestone.amount / 2;
      client.lockedBalance -= milestone.amount;
      freelancer.walletBalance += half;
      client.walletBalance += half;
      amount = half; // for transaction record

      // Refund half to client, release half to freelancer
      await Transaction.create({
      from: null,
      to: client._id,
      amount: amount,
      type: "REFUND_PAYMENT",
      contract: contract._id
      });

      await Transaction.create({
      from: client._id,
      to: freelancer._id,
      amount: amount,
      type: "RELEASE_PAYMENT",
      contract: contract._id
      });
    }

    dispute.status = "RESOLVED";
    dispute.resolution = action;
    // update milestone as resolved and record resolution
    try {
      milestone.prevStatus = milestone.prevStatus || milestone.status;
      milestone.status = 'RESOLVED';
      milestone.resolution = action;
      await milestone.save();
    } catch (e) {
      console.error('Failed to update milestone on dispute resolution', e.message || e);
    }

    await client.save();
    await freelancer.save();
    await dispute.save();

    // after resolving, check if approved/resolved milestones cover the contract total and complete contract
    try {
      const approvedMilestones = await Milestone.find({ contract: contract._id, status: { $in: ['APPROVED', 'RESOLVED'] } });
      const approvedSum = approvedMilestones.reduce((s, m) => s + (Number(m.amount) || 0), 0);
      if (approvedSum >= (Number(contract.totalAmount) || 0)) {
        const c = await Contract.findById(contract._id);
        if (c && c.status !== 'COMPLETED') {
          c.status = 'COMPLETED';
          await c.save();
        }
      }
    } catch (e) {
      console.error('Failed to auto-complete contract after dispute resolution', e.message || e);
    }

    

    res.json({ message: "Dispute resolved" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Admin freezes a user account
exports.freezeUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isFrozen = true;
    await user.save();

    res.json({ message: "User account frozen" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
