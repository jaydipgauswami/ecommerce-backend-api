const jwt = require("jsonwebtoken");
const pool = require("../config/connect");

const protect = async (req, res, next) => {
  let token;

  // ✅ Check Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // ❌ No token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
    });
  }

  try {
    //  Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //  Get user from DB
    const { rows } = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1 AND is_deleted = false",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    //  Attach user to request
    req.user = rows[0];

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Token invalid or expired",
    });
  }
};
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied (Admin only)",
    });
  }
  next();
};


module.exports = { protect, isAdmin };

