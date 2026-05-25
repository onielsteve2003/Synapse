const mongoose = require("mongoose");

const env = require("./env");

async function connectToDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  console.log(`MongoDB connected on ${mongoose.connection.host}:${mongoose.connection.port}`);
}

module.exports = {
  connectToDatabase,
};
