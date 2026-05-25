const mongoose = require("mongoose");

const Canvas = require("../models/Canvas");
const User = require("../models/User");
const { extractToken, getSafeUser, verifyAuthToken } = require("../utils/authToken");

const PRESENCE_COLORS = ["#22d3ee", "#34d399", "#f59e0b", "#60a5fa", "#f472b6", "#a78bfa", "#fb7185"];
const roomPresence = new Map();

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

function getPresenceColor(userId) {
  const normalizedId = String(userId || "");
  let hash = 0;

  for (let index = 0; index < normalizedId.length; index += 1) {
    hash = normalizedId.charCodeAt(index) + ((hash << 5) - hash);
  }

  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

function getSerializedRoomPresence(canvasId) {
  const roomUsers = roomPresence.get(canvasId);

  if (!roomUsers) {
    return [];
  }

  return Array.from(roomUsers.values())
    .map((user) => ({ ...user }))
    .sort((leftUser, rightUser) => leftUser.name.localeCompare(rightUser.name));
}

function broadcastRoomPresence(io, canvasId) {
  if (!canvasId) {
    return;
  }

  io.to(canvasId).emit("room-presence-updated", {
    canvasId,
    users: getSerializedRoomPresence(canvasId),
  });
}

function addSocketToRoomPresence(canvasId, user, socketId) {
  const normalizedCanvasId = String(canvasId || "").trim();

  if (!normalizedCanvasId || !user?.id) {
    return;
  }

  let roomUsers = roomPresence.get(normalizedCanvasId);

  if (!roomUsers) {
    roomUsers = new Map();
    roomPresence.set(normalizedCanvasId, roomUsers);
  }

  roomUsers.set(socketId, {
    color: getPresenceColor(user.id),
    email: user.email,
    id: user.id,
    name: user.name,
    sessionId: socketId,
  });
}

function removeSocketFromRoomPresence(canvasId, socketId) {
  const normalizedCanvasId = String(canvasId || "").trim();

  if (!normalizedCanvasId || !socketId) {
    return;
  }

  const roomUsers = roomPresence.get(normalizedCanvasId);

  if (!roomUsers) {
    return;
  }

  roomUsers.delete(socketId);

  if (!roomUsers.size) {
    roomPresence.delete(normalizedCanvasId);
  }
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

    function leaveCanvasRoom(canvasId = socket.data.canvasId) {
      const activeCanvasId = getCanvasId(canvasId);

      if (!activeCanvasId) {
        return;
      }

      socket.leave(activeCanvasId);
      removeSocketFromRoomPresence(activeCanvasId, socket.id);
      socket.to(activeCanvasId).emit("server-cursor-update", {
        canvasId: activeCanvasId,
        id: socket.data.user?.id,
        isLeaving: true,
        name: socket.data.user?.name,
        socketId: socket.id,
      });

      if (socket.data.canvasId === activeCanvasId) {
        socket.data.canvasId = "";
      }

      broadcastRoomPresence(io, activeCanvasId);
    }

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
        leaveCanvasRoom(socket.data.canvasId);
      }

      socket.data.canvasId = canvasId;
      socket.join(canvasId);
      addSocketToRoomPresence(canvasId, socket.data.user, socket.id);
      broadcastRoomPresence(io, canvasId);
      socket.emit("canvas:joined", {
        canvasId,
        socketId: socket.id,
        users: getSerializedRoomPresence(canvasId),
      });
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

    function broadcastCursorMove(payload) {
      const canvasId = getCanvasId(payload);

      if (
        !canvasId ||
        canvasId !== socket.data.canvasId ||
        typeof payload?.x !== "number" ||
        typeof payload?.y !== "number"
      ) {
        return;
      }

      socket.to(canvasId).emit("server-cursor-update", {
        canvasId,
        color: getPresenceColor(socket.data.user.id),
        email: socket.data.user.email,
        id: socket.data.user.id,
        isLeaving: false,
        name: socket.data.user.name,
        sentAt: Date.now(),
        socketId: socket.id,
        x: payload.x,
        y: payload.y,
      });
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
    socket.on("client-cursor-move", broadcastCursorMove);

    socket.on("disconnect", () => {
      leaveCanvasRoom(socket.data.canvasId);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = {
  registerCanvasSocket,
};

