const User = require("../models/User");
const { getSafeUser, signAuthToken } = require("../utils/authToken");

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateAuthPayload({ email, name, password }, { requireName }) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return {
      statusCode: 400,
      message: "A valid email address is required.",
    };
  }

  if (requireName && (typeof name !== "string" || !name.trim() || name.trim().length < 2)) {
    return {
      statusCode: 400,
      message: "A display name with at least 2 characters is required.",
    };
  }

  if (typeof password !== "string" || password.length < 8) {
    return {
      statusCode: 400,
      message: "A password with at least 8 characters is required.",
    };
  }

  return {
    email: normalizedEmail,
    name: typeof name === "string" ? name.trim() : "",
    password,
  };
}

function handleAuthError(error, res) {
  if (error?.code === 11000) {
    return res.status(409).json({
      message: "An account with that email already exists.",
    });
  }

  if (error?.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  console.error("Auth controller error", error);
  return res.status(500).json({
    message: "An unexpected error occurred while processing the authentication request.",
  });
}

async function register(req, res) {
  try {
    const validatedPayload = validateAuthPayload(req.body, { requireName: true });

    if (validatedPayload.statusCode) {
      return res.status(validatedPayload.statusCode).json({
        message: validatedPayload.message,
      });
    }

    const user = await User.create(validatedPayload);
    const safeUser = getSafeUser(user);

    return res.status(201).json({
      token: signAuthToken(safeUser),
      user: safeUser,
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
}

async function login(req, res) {
  try {
    const validatedPayload = validateAuthPayload(req.body, { requireName: false });

    if (validatedPayload.statusCode) {
      return res.status(validatedPayload.statusCode).json({
        message: validatedPayload.message,
      });
    }

    const user = await User.findOne({ email: validatedPayload.email }).select("+password");

    if (!user || !(await user.comparePassword(validatedPayload.password))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const safeUser = getSafeUser(user);

    return res.status(200).json({
      token: signAuthToken(safeUser),
      user: safeUser,
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
}

module.exports = {
  login,
  register,
};