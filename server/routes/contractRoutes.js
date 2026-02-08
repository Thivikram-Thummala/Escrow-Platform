const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const {
  createContract,
  getMyContracts,
  acceptContract,
  fundEscrow,
  completeContract
} = require("../controllers/contractController");

// Client creates contract
router.post(
  "/",
  protect,
  authorizeRoles("client"),
  createContract
);

// Both client & freelancer can view
router.get("/", protect, getMyContracts);

// Freelancer accepts contract
router.put(
  "/:id/accept",      //contract id
  protect,
  authorizeRoles("freelancer"),
  acceptContract
);

// Client funds escrow
router.put(
  "/:id/fund",    //contract id
  protect,
  authorizeRoles("client"),
  fundEscrow
);

// Client marks contract completed
router.put(
  "/:id/complete",
  protect,
  authorizeRoles("client"),
  completeContract
);


module.exports = router;
