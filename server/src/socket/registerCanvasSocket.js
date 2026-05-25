function getCanvasId(payload) {
  if (typeof payload === "string") {
    return payload.trim();
  }

  if (typeof payload?.canvasId === "string") {
    return payload.canvasId.trim();
  }

  return "";
}

function registerCanvasSocket(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.emit("server:ready", { socketId: socket.id });

    function joinCanvasRoom(payload) {
      const canvasId = getCanvasId(payload);

      if (!canvasId) {
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

      if (!canvasId || !payload?.nodeId || !payload?.position) {
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

      if (!canvasId) {
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

    socket.on("join-canvas", joinCanvasRoom);
    socket.on("canvas:join", joinCanvasRoom);
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

