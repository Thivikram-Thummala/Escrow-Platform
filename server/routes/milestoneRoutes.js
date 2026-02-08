const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const {
  createMilestone,
  approveMilestone,
  rejectMilestone,
  getMyMilestones,
  submitMilestone
} = require("../controllers/milestoneController");

// Client creates milestone
router.post(
  "/:contractId",
  protect,
  authorizeRoles("client"),
  createMilestone
);

// Client approves milestone and releases payment to freelancer
router.put(
  "/approve/:id", //milestone id
  protect,
  authorizeRoles("client"),
  approveMilestone
);

// Client rejects milestone
router.put(
  "/reject/:id",    //milestone id
  protect,
  authorizeRoles("client"),
  rejectMilestone
);

// Get milestones relevant to logged-in user
router.get(
  "/",
  protect,
  getMyMilestones
);

// Freelancer marks milestone submitted
router.put(
  "/submit/:id",
  protect,
  authorizeRoles("freelancer"),
  submitMilestone
);

module.exports = router;
