import { useEffect, useState } from "react";

import App from "./App";
import DashboardView from "./components/DashboardView";

function getRouteState() {
  if (typeof window === "undefined") {
    return {
      canvasId: "",
      page: "dashboard",
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const legacyCanvasId = searchParams.get("canvasId");

  if (legacyCanvasId) {
    return {
      canvasId: legacyCanvasId,
      page: "editor",
    };
  }

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const canvasMatch = pathname.match(/^\/canvas\/([^/]+)$/);

  if (canvasMatch) {
    return {
      canvasId: decodeURIComponent(canvasMatch[1]),
      page: "editor",
    };
  }

  if (pathname === "/" || pathname === "/dashboard") {
    return {
      canvasId: "",
      page: "dashboard",
    };
  }

  return {
    canvasId: "",
    page: "dashboard",
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

  useEffect(() => {
    function handlePopState() {
      setRoute(getRouteState());
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function handleOpenCanvas(canvasId, options = {}) {
    if (!canvasId) {
      return;
    }

    setRoute(navigateTo(`/canvas/${encodeURIComponent(canvasId)}`, options));
  }

  function handleOpenDashboard(options = {}) {
    setRoute(navigateTo("/dashboard", options));
  }

  if (route.page === "editor") {
    return (
      <App
        initialCanvasId={route.canvasId}
        onNavigateToCanvas={handleOpenCanvas}
        onOpenDashboard={handleOpenDashboard}
      />
    );
  }

  return <DashboardView onOpenCanvas={handleOpenCanvas} />;
}