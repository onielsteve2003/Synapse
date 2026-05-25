const User = require("../models/User");
const { extractToken, getSafeUser, verifyAuthToken } = require("../utils/authToken");

async function authenticateRequest(req, res, next) {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub).lean();

    if (!user) {
      return res.status(401).json({
        message: "Authentication failed.",
      });
    }

    req.user = getSafeUser(user);
    return next();
  } catch (_error) {
    return res.status(401).json({
      message: "Authentication failed.",
    });
  }
}

module.exports = {
  authenticateRequest,
};