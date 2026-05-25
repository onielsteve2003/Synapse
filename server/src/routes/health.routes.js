const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const databaseStates = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "synapse-server",
    database: databaseStates[mongoose.connection.readyState] || "unknown",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

module.exports = router;
