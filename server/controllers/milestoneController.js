const Milestone = require("../models/Milestone");
const Dispute = require("../models/Dispute");
const Contract = require("../models/Contract");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Client creates milestone
exports.createMilestone = async (req, res) => {
  try {
    const { title, amount } = req.body;

    const contract = await Contract.findById(req.params.contractId);

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    if (contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ensure total of milestones does not exceed contract total
    const existing = await Milestone.find({ contract: contract._id });
    const existingSum = existing.reduce((s, m) => s + (Number(m.amount) || 0), 0);
    if (existingSum + Number(amount) > Number(contract.totalAmount)) {
      return res.status(400).json({ message: 'Total milestones amount exceeds contract total' });
    }

    const milestone = await Milestone.create({
      contract: contract._id,
      title,
      amount
    });

    res.status(201).json(milestone);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get milestones for contracts where the user is client or freelancer
exports.getMyMilestones = async (req, res) => {
  try {
    // find contracts where user is client or freelancer
    const contracts = await Contract.find({
      $or: [{ client: req.user._id }, { freelancer: req.user._id }]
    }).select('_id title client freelancer');

    const contractIds = contracts.map(c => c._id);

    const milestones = await Milestone.find({ contract: { $in: contractIds } })
      .populate({ path: 'contract', select: 'title client freelancer' })
      .sort({ createdAt: -1 });

    // attach any open dispute (or latest) for each milestone so client UI can show reason
    const milestoneIds = milestones.map(m => m._id);
    const disputes = await Dispute.find({ milestone: { $in: milestoneIds } }).sort({ createdAt: -1 });
    const disputeMap = {};
    disputes.forEach(d => {
      // only keep the latest dispute per milestone
      if (!disputeMap[d.milestone]) disputeMap[d.milestone] = d;
    });

    const enriched = milestones.map(m => {
      const item = m.toObject ? m.toObject() : m;
      if (disputeMap[m._id]) item.dispute = disputeMap[m._id];
      return item;
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Client approves milestone and releases payment to freelancer

exports.approveMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate("contract");

    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    const contract = milestone.contract;

    if (contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const freelancer = await User.findById(contract.freelancer);
    const client = await User.findById(contract.client);

    if (client.lockedBalance < milestone.amount) {
      return res.status(400).json({ message: "Insufficient escrow balance" });
    }

    // Transfer logic
    client.lockedBalance -= milestone.amount;
    freelancer.walletBalance += milestone.amount;

    milestone.status = "APPROVED";

    await client.save();
    await freelancer.save();
    await milestone.save();

    await Transaction.create({
      from: client._id,
      to: freelancer._id,
      amount: milestone.amount,
      type: "RELEASE_PAYMENT",
      contract: contract._id
    });

    // return the updated milestone
    const updated = await Milestone.findById(milestone._id).populate({ path: 'contract', select: 'title client freelancer' });

    // after approving, check if total approved/resolved milestones cover the contract total
    const approvedMilestones = await Milestone.find({ contract: contract._id, status: { $in: ['APPROVED', 'RESOLVED'] } });
    const approvedSum = approvedMilestones.reduce((s, m) => s + (Number(m.amount) || 0), 0);
    if (approvedSum >= (Number(contract.totalAmount) || 0)) {
      contract.status = 'COMPLETED';
      await contract.save();
    }

    res.json({ message: "Payment released", milestone: updated });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Client rejects milestone
exports.rejectMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate("contract");

    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    if (milestone.contract.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    milestone.status = "REJECTED";
    await milestone.save();

    res.json({ message: "Milestone rejected", milestone });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Freelancer marks milestone as submitted
exports.submitMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate('contract');

    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    if (milestone.contract.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (milestone.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending milestones can be submitted' });
    }

    milestone.status = 'SUBMITTED';
    await milestone.save();

    res.json({ message: 'Milestone marked as submitted', milestone });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

