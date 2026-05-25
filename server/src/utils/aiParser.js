const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const env = require("../config/env");

const NODE_DIMENSIONS = {
  width: 248,
  height: 144,
};

const GRID_ORIGIN = {
  x: 72,
  y: 96,
};

const GRID_STEP = {
  x: 266,
  y: 174,
};

const GRID_COLUMNS = 4;
const GRID_ROWS = 24;
const COLLISION_PADDING = 24;
const MODEL_NAME = "gemini-1.5-flash";
const ALLOWED_ACTION_TYPES = ["ADD_NODE", "ADD_EDGE"];
const ALLOWED_NODE_TYPES = ["service", "frontend", "database", "cache"];
const ARCHITECTURE_KEYWORDS = [
  "add",
  "api",
  "architecture",
  "cache",
  "canvas",
  "connect",
  "connection",
  "database",
  "edge",
  "frontend",
  "graph",
  "link",
  "node",
  "service",
  "system",
  "wire",
];
const CONVERSATIONAL_PATTERNS = [
  /^(hi|hello|hey|yo|sup|hiya|howdy)(\s|$)/i,
  /^(good\s+(morning|afternoon|evening))(\s|$)/i,
  /^(how are you|what'?s up|thanks|thank you|ok|okay|cool|help)(\s|$)/i,
];

const ACTION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    type: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ALLOWED_ACTION_TYPES,
    },
    nodeType: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ALLOWED_NODE_TYPES,
    },
    label: {
      type: SchemaType.STRING,
    },
    techStack: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
    },
    sourceNodeLabel: {
      type: SchemaType.STRING,
    },
    targetNodeLabel: {
      type: SchemaType.STRING,
    },
  },
  required: ["type"],
};

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    actions: {
      type: SchemaType.ARRAY,
      items: ACTION_SCHEMA,
    },
  },
  required: ["actions"],
};

const SYSTEM_INSTRUCTION = [
  "You are Synapse, an architecture mutation planner for a realtime canvas.",
  "Convert the user's natural-language architecture request into JSON actions only.",
  "Return a single valid JSON object with exactly this top-level shape: {\"actions\":[...]}",
  "Never wrap the response in markdown fences. Never add prose, notes, or explanations.",
  "Only use ADD_NODE and ADD_EDGE actions.",
  "For ADD_NODE, return nodeType, label, and techStack.",
  "Valid nodeType values are service, frontend, database, and cache.",
  "For ADD_EDGE, return sourceNodeLabel and targetNodeLabel.",
  "Use the existing canvas context to avoid duplicate nodes or duplicate connections.",
  "If the request cannot be satisfied using only ADD_NODE and ADD_EDGE, return {\"actions\":[]}.",
  "Labels must be concise and human-readable.",
  "techStack must be an array of strings.",
].join(" ");

let generativeModel;

function createParserError(statusCode, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  return error;
}

function normalizePhrase(value) {
  return String(value || "")
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/^the\s+/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function cleanPhrase(value) {
  return String(value || "")
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}

function hasArchitectureIntent(command) {
  const normalizedCommand = normalizePhrase(command);

  return ARCHITECTURE_KEYWORDS.some((keyword) => normalizedCommand.includes(keyword));
}

function isConversationalInput(command) {
  const normalizedCommand = normalizePhrase(command);

  return CONVERSATIONAL_PATTERNS.some((pattern) => pattern.test(normalizedCommand));
}

function getNodeBounds(position) {
  return {
    left: position.x - COLLISION_PADDING,
    top: position.y - COLLISION_PADDING,
    right: position.x + NODE_DIMENSIONS.width + COLLISION_PADDING,
    bottom: position.y + NODE_DIMENSIONS.height + COLLISION_PADDING,
  };
}

function overlaps(candidatePosition, existingNodes) {
  const candidateBounds = getNodeBounds(candidatePosition);

  return existingNodes.some((node) => {
    if (typeof node?.position?.x !== "number" || typeof node?.position?.y !== "number") {
      return false;
    }

    const existingBounds = getNodeBounds(node.position);

    return !(
      candidateBounds.right <= existingBounds.left ||
      candidateBounds.left >= existingBounds.right ||
      candidateBounds.bottom <= existingBounds.top ||
      candidateBounds.top >= existingBounds.bottom
    );
  });
}

function findOpenCanvasPosition(existingNodes) {
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const candidatePosition = {
        x: GRID_ORIGIN.x + column * GRID_STEP.x,
        y: GRID_ORIGIN.y + row * GRID_STEP.y,
      };

      if (!overlaps(candidatePosition, existingNodes)) {
        return candidatePosition;
      }
    }
  }

  const maxBottom = existingNodes.reduce((currentMax, node) => {
    if (typeof node?.position?.y !== "number") {
      return currentMax;
    }

    return Math.max(currentMax, node.position.y + NODE_DIMENSIONS.height);
  }, GRID_ORIGIN.y);

  return {
    x: GRID_ORIGIN.x,
    y: maxBottom + 48,
  };
}

function getGenerativeModel() {
  if (!env.GEMINI_API_KEY) {
    throw createParserError(
      503,
      "GEMINI_API_KEY is not configured on the server. Add it to server/.env and restart the server.",
    );
  }

  if (!generativeModel) {
    const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);

    generativeModel = client.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });
  }

  return generativeModel;
}

function normalizeAction(action) {
  if (!action || typeof action !== "object") {
    return null;
  }

  const actionType = cleanPhrase(action.type).toUpperCase();

  if (!ALLOWED_ACTION_TYPES.includes(actionType)) {
    return null;
  }

  if (actionType === "ADD_NODE") {
    const nodeType = ALLOWED_NODE_TYPES.find((value) => value === normalizePhrase(action.nodeType));
    const label = cleanPhrase(action.label);
    const techStack = Array.isArray(action.techStack)
      ? action.techStack.map((item) => cleanPhrase(item)).filter(Boolean)
      : [];

    if (!nodeType || !label || !techStack.length) {
      return null;
    }

    return {
      type: actionType,
      nodeType,
      label,
      techStack,
    };
  }

  const sourceNodeLabel = cleanPhrase(action.sourceNodeLabel);
  const targetNodeLabel = cleanPhrase(action.targetNodeLabel);

  if (!sourceNodeLabel || !targetNodeLabel) {
    return null;
  }

  return {
    type: actionType,
    sourceNodeLabel,
    targetNodeLabel,
  };
}

function parseModelResponse(rawText) {
  const normalizedText = String(rawText || "").trim();

  if (!normalizedText) {
    throw createParserError(502, "Gemini returned an empty plan for this command.");
  }

  let parsed;

  try {
    parsed = JSON.parse(normalizedText);
  } catch (error) {
    throw createParserError(502, "Gemini returned malformed JSON for the canvas plan.");
  }

  if (!Array.isArray(parsed?.actions)) {
    throw createParserError(502, "Gemini returned a plan without an actions array.");
  }

  return {
    actions: parsed.actions.map(normalizeAction).filter(Boolean),
    rawText: normalizedText,
  };
}

function buildPlannerPrompt(command, canvas) {
  const existingNodes = (canvas.nodes || []).map((node) => ({
    id: node.id,
    label: cleanPhrase(node?.data?.label),
    techStack: Array.isArray(node?.data?.techStack) ? node.data.techStack : [],
    type: normalizePhrase(node.type) || "unknown",
  }));
  const labelById = new Map(existingNodes.map((node) => [node.id, node.label]));
  const existingEdges = (canvas.edges || []).map((edge) => ({
    sourceNodeLabel: labelById.get(edge.source) || edge.source,
    targetNodeLabel: labelById.get(edge.target) || edge.target,
  }));

  return [
    `User request: ${cleanPhrase(command)}`,
    `Canvas title: ${cleanPhrase(canvas.title) || "Untitled Canvas"}`,
    `Existing nodes: ${JSON.stringify(existingNodes)}`,
    `Existing edges: ${JSON.stringify(existingEdges)}`,
  ].join("\n");
}

async function parseAICommand(command, canvas) {
  const normalizedCommand = cleanPhrase(command);

  if (!normalizedCommand) {
    throw createParserError(400, "Enter a command before sending it to the AI copilot.");
  }

  if (isConversationalInput(normalizedCommand) && !hasArchitectureIntent(normalizedCommand)) {
    throw createParserError(
      400,
      'Ask the AI copilot to change the canvas with a structural request, like "Add a Redis node named Session Cache" or "Connect Checkout SPA to Express API".',
    );
  }

  const model = getGenerativeModel();

  try {
    const result = await model.generateContent(buildPlannerPrompt(normalizedCommand, canvas));

    return parseModelResponse(result.response.text());
  } catch (error) {
    const normalizedMessage = String(error?.message || "");

    if (/429|quota exceeded|rate limit/i.test(normalizedMessage)) {
      throw createParserError(
        503,
        "Gemini API quota is exhausted for the configured key right now. Retry later or switch to a key or project with available Gemini quota.",
      );
    }

    throw createParserError(502, `Gemini request failed: ${normalizedMessage}`);
  }
}

module.exports = {
  createParserError,
  findOpenCanvasPosition,
  parseAICommand,
  normalizePhrase,
};