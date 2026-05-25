import { io } from "socket.io-client";

let socket;
let socketAuthToken = "";

export function setWorkspaceSocketToken(token) {
  socketAuthToken = typeof token === "string" ? token.trim() : "";

  if (!socket) {
    return;
  }

  socket.auth = socketAuthToken ? { token: socketAuthToken } : {};

  if (socket.connected) {
    socket.disconnect();

    if (socketAuthToken) {
      socket.connect();
    }
  }
}

export function getWorkspaceSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      auth: socketAuthToken ? { token: socketAuthToken } : {},
      autoConnect: false,
      path: "/socket.io",
      randomizationFactor: 0.5,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports: ["websocket", "polling"],
    });
  }

  return socket;
}
