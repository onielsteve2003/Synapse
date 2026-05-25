const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = require("./app");
const { connectToDatabase } = require("./config/db");
const env = require("./config/env");
const { registerCanvasSocket } = require("./socket/registerCanvasSocket");

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.locals.io = io;

registerCanvasSocket(io);

async function shutdown(signal) {
  console.log(`${signal} received. Closing Synapse services...`);

  io.close(async () => {
    await mongoose.connection.close();
    httpServer.close(() => process.exit(0));
  });
}

async function startServer() {
  try {
    await connectToDatabase();

    httpServer.listen(env.PORT, () => {
      console.log(`Synapse server listening on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown startup failure.";

    console.error(`Failed to start Synapse server. ${message}`);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
