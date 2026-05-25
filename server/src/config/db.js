const mongoose = require("mongoose");

const env = require("./env");

function sanitizeMongoUri(value) {
  return String(value || "")
    .replace(/(mongodb(?:\+srv)?:\/\/[^:/?#\s]+:)([^@/\s]+)@/gi, "$1****@")
    .trim();
}

function sanitizeErrorMessage(value) {
  return sanitizeMongoUri(value).replace(/\s+/g, " ").trim() || "Unknown MongoDB connection error.";
}

async function connectToDatabase() {
  mongoose.set("strictQuery", true);
  const sanitizedTarget = sanitizeMongoUri(env.MONGODB_URI) || "mongodb://<unset>";

  console.log(`MongoDB connection state: connecting (${sanitizedTarget})`);

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(`MongoDB connection state: connected (${mongoose.connection.host}:${mongoose.connection.port})`);
  } catch (error) {
    const sanitizedMessage = sanitizeErrorMessage(error instanceof Error ? error.message : String(error));

    console.error(`MongoDB connection state: failed (${sanitizedMessage})`);
    throw new Error("MongoDB connection failed during startup.");
  }
}

module.exports = {
  connectToDatabase,
};
