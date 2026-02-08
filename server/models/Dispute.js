const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Milestone",
      required: true
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["OPEN", "RESOLVED"],
      default: "OPEN"
    },
    resolution: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dispute", disputeSchema);
