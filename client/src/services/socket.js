import { io } from "socket.io-client";

let socket;

export function getWorkspaceSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
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
