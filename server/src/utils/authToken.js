const jwt = require("jsonwebtoken");

const env = require("../config/env");

function extractToken(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^Bearer\s+/i.test(trimmedValue)) {
    return trimmedValue.replace(/^Bearer\s+/i, "").trim();
  }

  return trimmedValue;
}

function getSafeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: String(user._id || user.id),
    email: user.email,
    name: user.name,
  };
}

function signAuthToken(user) {
  const safeUser = getSafeUser(user);

  return jwt.sign(
    {
      email: safeUser.email,
      name: safeUser.name,
      sub: safeUser.id,
    },
    env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = {
  extractToken,
  getSafeUser,
  signAuthToken,
  verifyAuthToken,
};