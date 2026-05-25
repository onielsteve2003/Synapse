const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    throw new Error(data?.message || `API request failed with status ${response.status}.`);
  }

  return data;
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

