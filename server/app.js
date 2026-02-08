const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes")); //Phase 1: User registration & login
app.use("/api/contracts", require("./routes/contractRoutes")); //Phase 2: Contract creation, acceptance, and management
app.use("/api/milestones", require("./routes/milestoneRoutes")); //Phase 3: Milestone creation, approval, and payment release
app.use("/api/disputes", require("./routes/disputeRoutes")); //Phase 4: Dispute raising and resolution
app.use("/api/wallet", require("./routes/walletRoutes")); // Wallet balances
app.use("/api/transactions", require("./routes/transactionRoutes")); // Transactions list


module.exports = app;