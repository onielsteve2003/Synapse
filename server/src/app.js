const cors = require("cors");
const express = require("express");
const helmet = require("helmet");

const canvasRoutes = require("./routes/canvasRoutes");
const env = require("./config/env");
const healthRoutes = require("./routes/health.routes");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "Synapse API",
    status: "online",
    docsHint: "Use /api/health to confirm API and database status.",
  });
});

app.use("/api", healthRoutes);
app.use("/api/canvases", canvasRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} was not found.`,
  });
});

module.exports = app;
