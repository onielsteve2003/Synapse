import { useEffect, useState } from "react";

import App from "./App";
import WorkspaceErrorBoundary from "./components/WorkspaceErrorBoundary";
import DashboardView from "./components/DashboardView";
import Login from "./components/Login";
import Signup from "./components/Signup";
import { useAuth } from "./context/AuthContext";

function sanitizeRedirectPath(value) {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = value.trim();

  if (!normalizedValue.startsWith("/")) {
    return "";
  }

  if (normalizedValue.startsWith("/login") || normalizedValue.startsWith("/signup")) {
    return "/dashboard";
  }

  return normalizedValue;
}

function buildAuthPath(page, redirectPath = "") {
  const params = new URLSearchParams();
  const safeRedirectPath = sanitizeRedirectPath(redirectPath);

  if (safeRedirectPath) {
    params.set("redirect", safeRedirectPath);
  }

  const pathname = page === "signup" ? "/signup" : "/login";
  const queryString = params.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

function getCurrentPath() {
  if (typeof window === "undefined") {
    return "/dashboard";
  }

  return `${window.location.pathname}${window.location.search}`;
}

function getRouteState() {
  if (typeof window === "undefined") {
    return {
      canvasId: "",
      page: "dashboard",
      redirectPath: "",
    };
  }

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const searchParams = new URLSearchParams(window.location.search);
  const redirectPath = sanitizeRedirectPath(searchParams.get("redirect") || "");

  if (pathname === "/login") {
    return {
      canvasId: "",
      page: "login",
      redirectPath,
    };
  }

  if (pathname === "/signup") {
    return {
      canvasId: "",
      page: "signup",
      redirectPath,
    };
  }

  const legacyCanvasId = searchParams.get("canvasId");

  if (legacyCanvasId) {
    return {
      canvasId: legacyCanvasId,
      page: "editor",
      redirectPath: "",
    };
  }

  const canvasMatch = pathname.match(/^\/canvas\/([^/]+)$/);

  if (canvasMatch) {
    return {
      canvasId: decodeURIComponent(canvasMatch[1]),
      page: "editor",
      redirectPath: "",
    };
  }

  if (pathname === "/" || pathname === "/dashboard") {
    return {
      canvasId: "",
      page: "dashboard",
      redirectPath: "",
    };
  }

  return {
    canvasId: "",
    page: "dashboard",
    redirectPath: "",
  };
}

function navigateTo(path, options = {}) {
  if (typeof window === "undefined") {
    return getRouteState();
  }

  const method = options.replace ? "replaceState" : "pushState";

  window.history[method]({}, "", path);
  return getRouteState();
}

export default function WorkspaceApp() {
  const [route, setRoute] = useState(() => getRouteState());
  const [workspaceResetVersion, setWorkspaceResetVersion] = useState(0);
  const { isAuthenticated, isReady, logout, user } = useAuth();

  useEffect(() => {
    function handlePopState() {
      setRoute(getRouteState());
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated && (route.page === "dashboard" || route.page === "editor")) {
      setRoute(navigateTo(buildAuthPath("login", getCurrentPath()), { replace: true }));
      return;
    }

    if (isAuthenticated && (route.page === "login" || route.page === "signup")) {
      setRoute(navigateTo(route.redirectPath || "/dashboard", { replace: true }));
    }
  }, [isAuthenticated, isReady, route.page, route.redirectPath]);

  function handleOpenCanvas(canvasId, options = {}) {
    if (!canvasId) {
      return;
    }

    setRoute(navigateTo(`/canvas/${encodeURIComponent(canvasId)}`, options));
  }

  function handleOpenDashboard(options = {}) {
    setRoute(navigateTo("/dashboard", options));
  }

  function handleAuthSuccess() {
    setRoute(navigateTo(route.redirectPath || "/dashboard", { replace: true }));
  }

  function handleLogout() {
    logout();
    setRoute(navigateTo(buildAuthPath("login"), { replace: true }));
  }

  function handleResetViewport() {
    setWorkspaceResetVersion((currentValue) => currentValue + 1);
  }

  if (!isReady) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-center rounded-[2rem] border border-white/10 bg-slate-950/80 px-6 py-16 text-slate-300 shadow-panel">
          Restoring secure workspace session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (route.page === "signup") {
      return (
        <Signup
          onOpenLogin={() => setRoute(navigateTo(buildAuthPath("login", route.redirectPath), { replace: true }))}
          onSuccess={handleAuthSuccess}
          redirectPath={route.redirectPath}
        />
      );
    }

    return (
      <Login
        onOpenSignup={() => setRoute(navigateTo(buildAuthPath("signup", route.redirectPath), { replace: true }))}
        onSuccess={handleAuthSuccess}
        redirectPath={route.redirectPath}
      />
    );
  }

  if (route.page === "editor") {
    const workspaceResetToken = `${route.canvasId}:${workspaceResetVersion}`;

    return (
      <WorkspaceErrorBoundary onReset={handleResetViewport} resetToken={workspaceResetToken}>
        <App
          key={workspaceResetToken}
          currentUser={user}
          initialCanvasId={route.canvasId}
          onNavigateToCanvas={handleOpenCanvas}
          onOpenDashboard={handleOpenDashboard}
          onLogout={handleLogout}
        />
      </WorkspaceErrorBoundary>
    );
  }

  return <DashboardView currentUser={user} onLogout={handleLogout} onOpenCanvas={handleOpenCanvas} />;
}