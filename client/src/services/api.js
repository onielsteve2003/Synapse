const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
let authToken = "";

function notifyUnauthorized() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("synapse:unauthorized"));
  }
}

export function setAPIAuthToken(token) {
  authToken = typeof token === "string" ? token.trim() : "";
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  });

  const rawBody = await response.text();
  let data = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch (_error) {
      data = rawBody;
    }
  }

  if (!response.ok) {
    const error = new Error(
      typeof data === "object" && data !== null
        ? data?.message || `API request failed with status ${response.status}.`
        : `API request failed with status ${response.status}.`,
    );

    error.status = response.status;

    if (response.status === 401) {
      notifyUnauthorized();
    }

    throw error;
  }

  return data;
}

export function registerUser(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCanvas(canvasId) {
  if (!canvasId) {
    throw new Error("A canvas id is required to fetch canvas state.");
  }

  return request(`/canvases/${canvasId}`);
}

export function getAllCanvases() {
  return request("/canvases");
}

export function createCanvas(payload = {}) {
  return request("/canvases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteCanvas(canvasId) {
  if (!canvasId) {
    throw new Error("A canvas id is required to delete a canvas.");
  }

  return request(`/canvases/${canvasId}`, {
    method: "DELETE",
  });
}

export function updateCanvas(canvasId, payload) {
  if (!canvasId) {
    throw new Error("A canvas id is required to save canvas state.");
  }

  return request(`/canvases/${canvasId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function generateInfrastructure(canvasId) {
  if (!canvasId) {
    throw new Error("A canvas id is required to generate infrastructure.");
  }

  return request(`/canvases/${canvasId}/generate-infra`, {
    method: "POST",
  });
}

export function runAICommand(canvasId, command) {
  if (!canvasId) {
    throw new Error("A canvas id is required to run an AI command.");
  }

  if (typeof command !== "string" || !command.trim()) {
    throw new Error("A non-empty AI command is required.");
  }

  return request(`/canvases/${canvasId}/ai-command`, {
    method: "POST",
    body: JSON.stringify({ command: command.trim() }),
  });
}

