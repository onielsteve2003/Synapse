const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isDockerRuntime = process.env.DOCKER_RUNTIME === "true";

module.exports = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 4000,
  MONGODB_URI:
    process.env.MONGODB_URI ||
    (isDockerRuntime ? "mongodb://synapse-db:27017/synapse" : "mongodb://127.0.0.1:27017/synapse"),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};
