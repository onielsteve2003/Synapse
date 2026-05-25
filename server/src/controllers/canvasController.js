const { randomUUID } = require("crypto");
const mongoose = require("mongoose");

const Canvas = require("../models/Canvas");
const { compileInfrastructure } = require("../services/infrastructureCompiler");
const { createParserError, findOpenCanvasPosition, normalizePhrase, parseAICommand } = require("../utils/aiParser");

const NODE_TYPE_TO_CANVAS_TYPE = {
  service: "api",
  frontend: "frontend",
  database: "database",
  cache: "cache",
};

const DEFAULT_TECH_STACKS = {
  service: ["Node.js", "Express", "Socket.io"],
  frontend: ["React", "Vite", "Tailwind CSS"],
  database: ["MongoDB", "Mongoose"],
  cache: ["Redis", "Pub/Sub"],
};

function cleanCommandText(value) {
  return String(value || "")
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}

function extractFallbackLabel(command, fallbackLabel) {
  const match = /\b(?:named|called)\s+(.+)$/i.exec(command);

  if (!match) {
    return fallbackLabel;
  }

  const label = cleanCommandText(match[1]);

  return label || fallbackLabel;
}

function shouldUseLocalAIFallback(error) {
  const normalizedMessage = String(error?.message || "");

  return (
    error?.statusCode >= 500 ||
    /gemini|quota|429|rate limit|api error|not found for api version/i.test(normalizedMessage)
  );
}

function buildLocalFallbackPlan(command) {
  const normalizedCommand = normalizePhrase(command);
  const actions = [];

  if (!normalizedCommand.includes("add")) {
    return {
      actions,
      message: "Gemini is unavailable, and the local fallback only simulates add-database and add-cache requests right now.",
      usedFallback: true,
    };
  }

  if (normalizedCommand.includes("database") || normalizedCommand.includes("mongo")) {
    actions.push({
      type: "ADD_NODE",
      nodeType: "database",
      label: extractFallbackLabel(command, normalizedCommand.includes("mongo") ? "MongoDB Database" : "Database Node"),
      techStack: ["MongoDB", "Mongoose"],
    });
  }

  if (normalizedCommand.includes("redis") || normalizedCommand.includes("cache")) {
    actions.push({
      type: "ADD_NODE",
      nodeType: "cache",
      label: extractFallbackLabel(command, normalizedCommand.includes("redis") ? "Redis Cache" : "Cache Node"),
      techStack: ["Redis", "Pub/Sub"],
    });
  }

  return {
    actions,
    message: actions.length
      ? "Gemini is unavailable, so Synapse applied a local mock AI fallback plan for testing."
      : "Gemini is unavailable, and the local fallback could not infer a supported database or cache add action from this command.",
    usedFallback: true,
  };
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function handleCanvasError(error, res) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Canvas payload failed validation.",
      errors: Object.values(error.errors).map((entry) => entry.message),
    });
  }

  console.error("Canvas controller error", error);
  return res.status(500).json({
    message: "An unexpected error occurred while processing the canvas request.",
  });
}

function buildOwnedCanvasQuery(ownerId, canvasId) {
  return {
    _id: canvasId,
    owner: ownerId,
  };
}

function emitCanvasUpdated(io, canvas) {
  if (!io || !canvas?._id) {
    return;
  }

  const canvasId = String(canvas._id);

  io.to(canvasId).emit("canvas-updated", {
    canvasId,
    title: canvas.title,
    nodes: canvas.nodes,
    edges: canvas.edges,
    lastModified: canvas.lastModified,
  });
}

function cloneCanvasGraph(canvas) {
  return {
    edges: Array.isArray(canvas.edges) ? canvas.edges.map((edge) => ({ ...edge })) : [],
    nodes: Array.isArray(canvas.nodes)
      ? canvas.nodes.map((node) => ({
          ...node,
          data: {
            ...(node.data || {}),
            techStack: Array.isArray(node?.data?.techStack) ? [...node.data.techStack] : [],
          },
          position: {
            ...(node.position || {}),
          },
        }))
      : [],
  };
}

function createNodeId() {
  return `node-${randomUUID()}`;
}

function createEdgeId() {
  return `edge-${randomUUID()}`;
}

function findNodeByLabel(nodes, label) {
  const normalizedLabel = normalizePhrase(label);

  if (!normalizedLabel) {
    throw createParserError(400, "An AI edge action referenced an empty node label.");
  }

  const exactMatches = nodes.filter((node) => normalizePhrase(node?.data?.label) === normalizedLabel);

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  if (exactMatches.length > 1) {
    throw createParserError(409, `Multiple nodes match "${label}". Refine the architecture labels before reconnecting them.`);
  }

  const fuzzyMatches = nodes.filter((node) => normalizePhrase(node?.data?.label).includes(normalizedLabel));

  if (fuzzyMatches.length === 1) {
    return fuzzyMatches[0];
  }

  if (fuzzyMatches.length > 1) {
    throw createParserError(409, `Multiple nodes partially match "${label}". Use more specific node labels.`);
  }

  throw createParserError(404, `I could not find a node named "${label}" on this canvas.`);
}

function buildMutationSummary(appliedMutations) {
  if (!appliedMutations.length) {
    return "The AI reviewed the request but no graph changes were required.";
  }

  const addedNodes = appliedMutations.filter((entry) => entry.kind === "ADD_NODE");
  const addedEdges = appliedMutations.filter((entry) => entry.kind === "ADD_EDGE");
  const skippedEntries = appliedMutations.filter((entry) => entry.kind === "SKIP");
  const segments = [];

  if (addedNodes.length) {
    segments.push(`Added ${addedNodes.length} node${addedNodes.length === 1 ? "" : "s"}: ${addedNodes.map((entry) => entry.label).join(", ")}.`);
  }

  if (addedEdges.length) {
    segments.push(
      `Created ${addedEdges.length} connection${addedEdges.length === 1 ? "" : "s"}: ${addedEdges
        .map((entry) => `${entry.sourceLabel} -> ${entry.targetLabel}`)
        .join(", ")}.`,
    );
  }

  if (skippedEntries.length) {
    segments.push(`Skipped ${skippedEntries.length} duplicate action${skippedEntries.length === 1 ? "" : "s"}.`);
  }

  return segments.join(" ");
}

function applyAIPlanToCanvas(canvas, plan) {
  const nextGraph = cloneCanvasGraph(canvas);
  const appliedMutations = [];

  for (const action of plan.actions) {
    if (action.type === "ADD_NODE") {
      const existingNode = nextGraph.nodes.find(
        (node) => normalizePhrase(node?.data?.label) === normalizePhrase(action.label),
      );

      if (existingNode) {
        appliedMutations.push({
          kind: "SKIP",
          reason: "duplicate-node",
        });
        continue;
      }

      const nextNode = {
        id: createNodeId(),
        type: NODE_TYPE_TO_CANVAS_TYPE[action.nodeType] || "api",
        position: findOpenCanvasPosition(nextGraph.nodes),
        data: {
          label: action.label,
          size: "md",
          techStack: action.techStack.length ? action.techStack : DEFAULT_TECH_STACKS[action.nodeType] || [],
        },
      };

      nextGraph.nodes.push(nextNode);
      appliedMutations.push({
        kind: "ADD_NODE",
        label: nextNode.data.label,
      });
      continue;
    }

    if (action.type === "ADD_EDGE") {
      const sourceNode = findNodeByLabel(nextGraph.nodes, action.sourceNodeLabel);
      const targetNode = findNodeByLabel(nextGraph.nodes, action.targetNodeLabel);

      if (sourceNode.id === targetNode.id) {
        appliedMutations.push({
          kind: "SKIP",
          reason: "self-edge",
        });
        continue;
      }

      const edgeExists = nextGraph.edges.some(
        (edge) => edge.source === sourceNode.id && edge.target === targetNode.id,
      );

      if (edgeExists) {
        appliedMutations.push({
          kind: "SKIP",
          reason: "duplicate-edge",
        });
        continue;
      }

      nextGraph.edges.push({
        id: createEdgeId(),
        source: sourceNode.id,
        target: targetNode.id,
      });
      appliedMutations.push({
        kind: "ADD_EDGE",
        sourceLabel: sourceNode.data.label,
        targetLabel: targetNode.data.label,
      });
    }
  }

  return {
    appliedMutations,
    nextEdges: nextGraph.edges,
    nextNodes: nextGraph.nodes,
  };
}

async function createCanvas(req, res) {
  try {
    const { title } = req.body;

    const canvas = await Canvas.create({
      title: typeof title === "string" && title.trim() ? title.trim() : "Untitled Canvas",
      owner: req.user.id,
      nodes: [],
      edges: [],
    });

    return res.status(201).json(canvas);
  } catch (error) {
    return handleCanvasError(error, res);
  }
}

async function getAllCanvases(req, res) {
  try {
    const canvases = await Canvas.find({ owner: req.user.id }).sort({ lastModified: -1 }).lean();

    return res.status(200).json(canvases);
  } catch (error) {
    return handleCanvasError(error, res);
  }
}

async function getCanvasById(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "A valid canvas id is required.",
      });
    }

    const canvas = await Canvas.findOne(buildOwnedCanvasQuery(req.user.id, id)).lean();

    if (!canvas) {
      return res.status(404).json({
        message: "Canvas not found.",
      });
    }

    return res.status(200).json(canvas);
  } catch (error) {
    return handleCanvasError(error, res);
  }
}

async function updateCanvas(req, res) {
  try {
    const { id } = req.params;
    const { title, nodes, edges } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "A valid canvas id is required.",
      });
    }

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return res.status(400).json({
        message: "If provided, title must be a non-empty string.",
      });
    }

    if (nodes !== undefined && !Array.isArray(nodes)) {
      return res.status(400).json({
        message: "If provided, nodes must be an array.",
      });
    }

    if (edges !== undefined && !Array.isArray(edges)) {
      return res.status(400).json({
        message: "If provided, edges must be an array.",
      });
    }

    const updatePayload = {};

    if (title !== undefined) {
      updatePayload.title = title.trim();
    }

    if (nodes !== undefined) {
      updatePayload.nodes = nodes;
    }

    if (edges !== undefined) {
      updatePayload.edges = edges;
    }

    if (!Object.keys(updatePayload).length) {
      return res.status(400).json({
        message: "Provide at least one of title, nodes, or edges to update a canvas.",
      });
    }

    const canvas = await Canvas.findOneAndUpdate(buildOwnedCanvasQuery(req.user.id, id), updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!canvas) {
      return res.status(404).json({
        message: "Canvas not found.",
      });
    }

    return res.status(200).json(canvas);
  } catch (error) {
    return handleCanvasError(error, res);
  }
}

async function generateInfrastructure(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "A valid canvas id is required.",
      });
    }

    const canvas = await Canvas.findOne(buildOwnedCanvasQuery(req.user.id, id)).lean();

    if (!canvas) {
      return res.status(404).json({
        message: "Canvas not found.",
      });
    }

    return res.status(200).json(compileInfrastructure(canvas));
  } catch (error) {
    return handleCanvasError(error, res);
  }
}

async function deleteCanvas(req, res) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "A valid canvas id is required.",
      });
    }

    const canvas = await Canvas.findOneAndDelete(buildOwnedCanvasQuery(req.user.id, id)).lean();

    if (!canvas) {
      return res.status(404).json({
        message: "Canvas not found.",
      });
    }

    return res.status(200).json({
      canvasId: id,
      message: `Canvas ${id} deleted successfully.`,
    });
  } catch (error) {
    return handleCanvasError(error, res);
  }
}

async function runAICommand(req, res) {
  try {
    const { id } = req.params;
    const { command } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "A valid canvas id is required.",
      });
    }

    if (typeof command !== "string" || !command.trim()) {
      return res.status(400).json({
        message: "A non-empty command string is required.",
      });
    }

    const canvas = await Canvas.findOne(buildOwnedCanvasQuery(req.user.id, id));

    if (!canvas) {
      return res.status(404).json({
        message: "Canvas not found.",
      });
    }

    let plan;

    try {
      plan = await parseAICommand(command, canvas.toObject());
    } catch (error) {
      if (!shouldUseLocalAIFallback(error)) {
        throw error;
      }

      plan = buildLocalFallbackPlan(command);
    }

    const { appliedMutations, nextEdges, nextNodes } = applyAIPlanToCanvas(canvas.toObject(), plan);
    const hasMutation = appliedMutations.some((entry) => entry.kind !== "SKIP");

    if (hasMutation) {
      canvas.nodes = nextNodes;
      canvas.edges = nextEdges;
      await canvas.save();
    }

    const responseCanvas = canvas.toObject();

    if (hasMutation) {
      emitCanvasUpdated(req.app.locals.io, responseCanvas);
    }

    return res.status(200).json({
      actions: plan.actions,
      canvas: responseCanvas,
      hasMutation,
      message: plan.usedFallback
        ? `${plan.message} ${buildMutationSummary(appliedMutations)}`.trim()
        : buildMutationSummary(appliedMutations),
    });
  } catch (error) {
    return handleCanvasError(error, res);
  }
}

module.exports = {
  runAICommand,
  createCanvas,
  deleteCanvas,
  generateInfrastructure,
  getAllCanvases,
  getCanvasById,
  updateCanvas,
};
