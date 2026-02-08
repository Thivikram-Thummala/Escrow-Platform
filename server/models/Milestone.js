const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true
    },
    title: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "SUBMITTED", "APPROVED", "REJECTED", "DISPUTED", "RESOLVED"],
      default: "PENDING"
    },
    prevStatus: {
      type: String
    },
    resolution: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Milestone", milestoneSchema);
