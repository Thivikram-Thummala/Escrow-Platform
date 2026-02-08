const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const {
  raiseDispute,
  updateDispute,
  resolveDispute,
  freezeUser
} = require("../controllers/disputeController");

const { getAllDisputes } = require("../controllers/disputeController");

// Freelancer raises a dispute on a milestone
router.post(
  "/:milestoneId",
  protect,
  authorizeRoles("freelancer"),
  raiseDispute
);

// Admin resolves dispute
router.put(
  "/resolve/:id",
  protect,
  authorizeRoles("admin"),
  resolveDispute
);

// Admin: list disputes
router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getAllDisputes
);

// Freelancer edits their dispute
router.put(
  "/:id",
  protect,
  authorizeRoles("freelancer"),
  updateDispute
);

// Admin freezes user account
router.put(
  "/freeze/:id",
  protect,
  authorizeRoles("admin"),
  freezeUser
);

module.exports = router;
