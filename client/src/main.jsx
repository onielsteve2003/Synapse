import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import WorkspaceApp from "./WorkspaceApp";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <WorkspaceApp />
    </AuthProvider>
  </React.StrictMode>,
);
