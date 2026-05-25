const mongoose = require("mongoose");

const Canvas = require("../models/Canvas");
const User = require("../models/User");
const { extractToken, getSafeUser, verifyAuthToken } = require("../utils/authToken");

function getCanvasId(payload) {
  if (typeof payload === "string") {
    return payload.trim();
  }

  if (typeof payload?.canvasId === "string") {
    return payload.canvasId.trim();
  }

  return "";
}

function getSocketToken(socket) {
  return extractToken(socket.handshake.auth?.token || socket.handshake.headers?.authorization);
}

function registerCanvasSocket(io) {
  io.use(async (socket, next) => {
    const token = getSocketToken(socket);

    if (!token) {
      next(new Error("Authentication required."));
      return;
    }

    try {
      const payload = verifyAuthToken(token);
      const user = await User.findById(payload.sub).lean();

      if (!user) {
        next(new Error("Authentication failed."));
        return;
      }

      socket.data.user = getSafeUser(user);
      next();
    } catch (_error) {
      next(new Error("Authentication failed."));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.emit("server:ready", { socketId: socket.id });

    async function joinCanvasRoom(payload) {
      const canvasId = getCanvasId(payload);

      if (!canvasId) {
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(canvasId)) {
        socket.emit("canvas:error", {
          canvasId,
          message: "A valid canvas id is required.",
        });
        return;
      }

      const canvasExists = await Canvas.exists({
        _id: canvasId,
        owner: socket.data.user.id,
      });

      if (!canvasExists) {
        socket.emit("canvas:error", {
          canvasId,
          message: "Canvas not found.",
        });
        return;
      }

      if (socket.data.canvasId && socket.data.canvasId !== canvasId) {
        socket.leave(socket.data.canvasId);
      }

      socket.data.canvasId = canvasId;
      socket.join(canvasId);
      socket.emit("canvas:joined", { canvasId, socketId: socket.id });
    }

    function broadcastNodeDrag(payload) {
      const canvasId = getCanvasId(payload);

      if (!canvasId || canvasId !== socket.data.canvasId || !payload?.nodeId || !payload?.position) {
        return;
      }

      socket.to(canvasId).emit("node-drag", {
        canvasId,
        nodeId: payload.nodeId,
        position: payload.position,
      });
    }

    function broadcastCanvasUpdate(payload) {
      const canvasId = getCanvasId(payload);

      if (!canvasId || canvasId !== socket.data.canvasId) {
        return;
      }

      const update = { canvasId };

      if (typeof payload?.title === "string") {
        update.title = payload.title;
      }

      if (Array.isArray(payload?.nodes)) {
        update.nodes = payload.nodes;
      }

      if (Array.isArray(payload?.edges)) {
        update.edges = payload.edges;
      }

      if (payload?.lastModified) {
        update.lastModified = payload.lastModified;
      }

      socket.to(canvasId).emit("canvas-updated", update);
    }

    socket.on("join-canvas", (payload) => {
      void joinCanvasRoom(payload);
    });
    socket.on("canvas:join", (payload) => {
      void joinCanvasRoom(payload);
    });
    socket.on("node-drag", broadcastNodeDrag);
    socket.on("canvas:node:moved", broadcastNodeDrag);
    socket.on("canvas-updated", broadcastCanvasUpdate);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = {
  registerCanvasSocket,
};

