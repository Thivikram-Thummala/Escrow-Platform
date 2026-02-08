const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Support hardcoded admin token (no DB record)
      if (decoded.id === 'admin-static-id') {
        req.user = {
          _id: decoded.id,
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          isFrozen: false
        };
        return next();
      }

      req.user = await User.findById(decoded.id).select("-password");

      // Check if account is frozen, if so, block access
      if (req.user && req.user.isFrozen) {
        return res.status(403).json({ message: "Account is frozen" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }
};



module.exports = { protect };
