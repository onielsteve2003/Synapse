import { useEffect, useRef, useState } from "react";
import { toPng, toSvg } from "html-to-image";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  FileCode2,
  LoaderCircle,
  LogOut,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import AIDrawer from "./components/AIDrawer";
import InfraModal from "./components/InfraModal";
import Canvas from "./components/workspace/Canvas";
import Sidebar from "./components/workspace/Sidebar";
import { generateInfrastructure, getCanvas, runAICommand, updateCanvas } from "./services/api";
import { getWorkspaceSocket } from "./services/socket";
import { createRafThrottle } from "./utils/createRafThrottle";

const starterNodes = [
  {
    id: "starter-frontend",
    type: "frontend",
    position: { x: 72, y: 104 },
    data: {
      label: "Customer Frontend",
      size: "md",
      techStack: ["React", "Vite", "Tailwind CSS"],
    },
  },
  {
    id: "starter-api",
    type: "api",
    position: { x: 392, y: 142 },
    data: {
      label: "Architecture API",
      size: "md",
      techStack: ["Node.js", "Express", "Socket.io"],
    },
  },
  {
    id: "starter-db",
    type: "database",
    position: { x: 710, y: 284 },
    data: {
      label: "MongoDB Primary",
      size: "md",
      techStack: ["MongoDB", "Mongoose"],
    },
  },
  {
    id: "starter-cache",
    type: "cache",
    position: { x: 710, y: 84 },
    data: {
      label: "Redis Presence Cache",
      size: "md",
      techStack: ["Redis", "Pub/Sub"],
    },
  },
];

const starterEdges = [
  {
    id: "edge-frontend-api",
    source: "starter-frontend",
    target: "starter-api",
  },
  {
    id: "edge-api-db",
    source: "starter-api",
    target: "starter-db",
  },
  {
    id: "edge-api-cache",
    source: "starter-api",
    target: "starter-cache",
  },
];

function getInitialCanvasId() {
  if (typeof window === "undefined") {
    return import.meta.env.VITE_CANVAS_ID || "";
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("canvasId") || import.meta.env.VITE_CANVAS_ID || "";
}

function createNodeId(label) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `node-${crypto.randomUUID()}`;
  }

  return `node-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
}

function createEdgeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `edge-${crypto.randomUUID()}`;
  }

  return `edge-${Date.now()}`;
}

function createExportFileName(title, extension) {
  const normalizedTitle = typeof title === "string" ? title.trim().toLowerCase() : "";
  const sanitizedTitle = normalizedTitle.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return `${sanitizedTitle || "synapse-diagram"}.${extension}`;
}

function downloadDataUrl(dataUrl, fileName) {
  const link = document.createElement("a");

  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function createDrawerMessage(role, text) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return {
      id: crypto.randomUUID(),
      role,
      text,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id: `${role}-${Date.now()}`,
    role,
    text,
    createdAt: new Date().toISOString(),
  };
}

function getNextNodeSize(currentSize, direction) {
  const order = ["sm", "md", "lg"];
  const currentIndex = order.indexOf(currentSize);
  const safeIndex = currentIndex === -1 ? 1 : currentIndex;
  const nextIndex = direction === "decrease" ? safeIndex - 1 : safeIndex + 1;

  return order[Math.min(order.length - 1, Math.max(0, nextIndex))] || order[safeIndex];
}

function getNextNodePosition(index) {
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    x: 72 + column * 266,
    y: 96 + row * 174,
  };
}

function getNoticeAppearance(tone) {
  if (tone === "success") {
    return {
      icon: CheckCircle2,
      className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
      iconClassName: "text-emerald-200",
    };
  }

  if (tone === "error") {
    return {
      icon: TriangleAlert,
      className: "border-rose-400/20 bg-rose-400/10 text-rose-100",
      iconClassName: "text-rose-200",
    };
  }

  if (tone === "loading") {
    return {
      icon: LoaderCircle,
      className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-50",
      iconClassName: "animate-spin text-cyan-200",
    };
  }

  return {
    icon: Sparkles,
    className: "border-white/10 bg-white/5 text-slate-200",
    iconClassName: "text-cyan-200",
  };
}

function getSocketStatusAppearance(status) {
  if (status === "connected") {
    return {
      label: "Realtime live",
      className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
      dotClassName: "bg-emerald-300",
    };
  }

  if (status === "reconnecting") {
    return {
      label: "Reconnecting...",
      className: "border-amber-400/20 bg-amber-400/10 text-amber-100",
      dotClassName: "animate-pulse bg-amber-300",
    };
  }

  if (status === "connecting") {
    return {
      label: "Connecting...",
      className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-50",
      dotClassName: "animate-pulse bg-cyan-300",
    };
  }

  if (status === "offline") {
    return {
      label: "Offline",
      className: "border-rose-400/20 bg-rose-400/10 text-rose-100",
      dotClassName: "bg-rose-300",
    };
  }

  return {
    label: "Realtime standby",
    className: "border-white/10 bg-white/5 text-slate-300",
    dotClassName: "bg-slate-500",
  };
}

function getNextSelectedNodeId(nodes, currentSelectedNodeId) {
  return nodes.some((node) => node.id === currentSelectedNodeId)
    ? currentSelectedNodeId
    : nodes[0]?.id || null;
}

function isTextInputActive() {
  if (typeof document === "undefined") {
    return false;
  }

  const activeElement = document.activeElement;

  if (!activeElement) {
    return false;
  }

  return (
    activeElement.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName)
  );
}

export default function App({ currentUser, initialCanvasId = "", onNavigateToCanvas, onOpenDashboard, onLogout }) {
  const [canvasId, setCanvasId] = useState(() => initialCanvasId || getInitialCanvasId());
  const [joinedCanvasId, setJoinedCanvasId] = useState("");
  const [title, setTitle] = useState("Synapse Workspace");
  const [nodes, setNodes] = useState(starterNodes);
  const [edges, setEdges] = useState(starterEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(starterNodes[0].id);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [connectingSourceId, setConnectingSourceId] = useState(null);
  const [generatedInfra, setGeneratedInfra] = useState(null);
  const [isInfraModalOpen, setIsInfraModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingInfra, setIsGeneratingInfra] = useState(false);
  const [isRunningAICommand, setIsRunningAICommand] = useState(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(true);
  const [aiMessages, setAiMessages] = useState(() => [
    createDrawerMessage(
      "assistant",
      "I can mutate this canvas from plain English. Try adding a node or wiring two existing labels together.",
    ),
  ]);
  const [socketStatus, setSocketStatus] = useState("idle");
  const [notice, setNotice] = useState({
    tone: "info",
    text: "Paste a canvas id to load MongoDB state, or start refining the starter architecture on the board.",
  });

  const socketRef = useRef(null);
  const joinedCanvasIdRef = useRef(joinedCanvasId);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const titleRef = useRef(title);
  const dragEmitterRef = useRef(null);
  const loadedCanvasIdRef = useRef("");
  const canvasSurfaceRef = useRef(null);
  const exportMenuRef = useRef(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const noticeAppearance = getNoticeAppearance(notice.tone);
  const socketStatusAppearance = getSocketStatusAppearance(socketStatus);
  const NoticeIcon = noticeAppearance.icon;
  const isBusy = isLoadingCanvas || isSaving || isGeneratingInfra;
  const aiExamplePrompts = [
    "Add a Redis node named Session Cache",
    "Connect React Storefront to Express API",
  ];

  useEffect(() => {
    joinedCanvasIdRef.current = joinedCanvasId;
    nodesRef.current = nodes;
    edgesRef.current = edges;
    titleRef.current = title;
  }, [edges, joinedCanvasId, nodes, title]);

  useEffect(() => {
    if (!isExportMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!exportMenuRef.current?.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsExportMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isExportMenuOpen]);

  useEffect(() => {
    const socket = getWorkspaceSocket();
    const manager = socket.io;

    socketRef.current = socket;
    dragEmitterRef.current = createRafThrottle((payload) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("node-drag", payload);
      }
    }, 16);

    function handleConnect() {
      const activeCanvasId = joinedCanvasIdRef.current;

      setSocketStatus(activeCanvasId ? "connected" : "idle");

      if (activeCanvasId) {
        socket.emit("join-canvas", { canvasId: activeCanvasId });
      }
    }

    function handleDisconnect(reason) {
      if (!joinedCanvasIdRef.current) {
        setSocketStatus("idle");
        return;
      }

      setSocketStatus(reason === "io client disconnect" ? "idle" : "reconnecting");
    }

    function handleConnectError() {
      setSocketStatus(joinedCanvasIdRef.current ? "reconnecting" : "offline");
    }

    function handleReconnectAttempt() {
      if (joinedCanvasIdRef.current) {
        setSocketStatus("reconnecting");
      }
    }

    function handleReconnectFailed() {
      setSocketStatus(joinedCanvasIdRef.current ? "offline" : "idle");
    }

    function handleNodeDrag(payload) {
      if (
        payload?.canvasId !== joinedCanvasIdRef.current ||
        !payload?.nodeId ||
        typeof payload?.position?.x !== "number" ||
        typeof payload?.position?.y !== "number"
      ) {
        return;
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === payload.nodeId
            ? {
                ...node,
                position: payload.position,
              }
            : node,
        ),
      );
    }

    function handleCanvasUpdated(payload) {
      if (payload?.canvasId !== joinedCanvasIdRef.current) {
        return;
      }

      if (typeof payload.title === "string") {
        setTitle(payload.title);
      }

      if (Array.isArray(payload.nodes)) {
        setNodes(payload.nodes);
        setSelectedNodeId((currentSelectedNodeId) =>
          getNextSelectedNodeId(payload.nodes, currentSelectedNodeId),
        );
      }

      if (Array.isArray(payload.edges)) {
        setEdges(payload.edges);
      }

      if (payload.lastModified) {
        setLastSavedAt(payload.lastModified);
      }
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("node-drag", handleNodeDrag);
    socket.on("canvas-updated", handleCanvasUpdated);
    manager.on("reconnect_attempt", handleReconnectAttempt);
    manager.on("reconnect_failed", handleReconnectFailed);

    return () => {
      dragEmitterRef.current?.cancel();
      dragEmitterRef.current = null;

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("node-drag", handleNodeDrag);
      socket.off("canvas-updated", handleCanvasUpdated);
      manager.off("reconnect_attempt", handleReconnectAttempt);
      manager.off("reconnect_failed", handleReconnectFailed);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const normalizedCanvasId = joinedCanvasId.trim();
    const socket = socketRef.current;

    if (!normalizedCanvasId || !socket) {
      if (!normalizedCanvasId) {
        setSocketStatus("idle");
      }

      return;
    }

    if (!socket.connected) {
      setSocketStatus("connecting");
      socket.connect();
      return;
    }

    socket.emit("join-canvas", { canvasId: normalizedCanvasId });
    setSocketStatus("connected");
  }, [joinedCanvasId]);

  useEffect(() => {
    const nextInitialCanvasId =
      (typeof initialCanvasId === "string" && initialCanvasId.trim()) || getInitialCanvasId();

    if (!nextInitialCanvasId || nextInitialCanvasId === loadedCanvasIdRef.current) {
      return;
    }

    setCanvasId(nextInitialCanvasId);
    void loadCanvas(nextInitialCanvasId);
  }, [initialCanvasId]);

  useEffect(() => {
    if (selectedEdgeId && !edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [edges, selectedEdgeId]);

  useEffect(() => {
    if (connectingSourceId && !nodes.some((node) => node.id === connectingSourceId)) {
      setConnectingSourceId(null);
    }
  }, [connectingSourceId, nodes]);

  function emitCanvasUpdate(partialState = {}) {
    const socket = socketRef.current;
    const activeCanvasId = joinedCanvasIdRef.current;

    if (!socket?.connected || !activeCanvasId) {
      return;
    }

    socket.emit("canvas-updated", {
      canvasId: activeCanvasId,
      title: partialState.title ?? titleRef.current,
      nodes: partialState.nodes ?? nodesRef.current,
      edges: partialState.edges ?? edgesRef.current,
      ...(partialState.lastModified ? { lastModified: partialState.lastModified } : {}),
    });
  }

  function queueNodeDragBroadcast(nodeId, position) {
    const socket = socketRef.current;
    const activeCanvasId = joinedCanvasIdRef.current;

    if (!socket?.connected || !activeCanvasId) {
      return;
    }

    dragEmitterRef.current?.schedule({
      canvasId: activeCanvasId,
      nodeId,
      position,
    });
  }

  function joinCanvasRoom(nextCanvasId) {
    const normalizedCanvasId = nextCanvasId.trim();

    if (!normalizedCanvasId) {
      return;
    }

    setJoinedCanvasId(normalizedCanvasId);
  }

  function applyRemoteCanvasState(nextCanvas, fallbackCanvasId) {
    const resolvedCanvasId = nextCanvas?._id || fallbackCanvasId;
    const nextNodes = nextCanvas?.nodes || [];
    const nextEdges = nextCanvas?.edges || [];

    if (resolvedCanvasId) {
      loadedCanvasIdRef.current = resolvedCanvasId;
      setCanvasId(resolvedCanvasId);
      joinCanvasRoom(resolvedCanvasId);
    }

    setTitle(nextCanvas?.title || "Untitled Canvas");
    setNodes(nextNodes);
    setEdges(nextEdges);
    setLastSavedAt(nextCanvas?.lastModified || null);
    setSelectedNodeId((currentSelectedNodeId) => getNextSelectedNodeId(nextNodes, currentSelectedNodeId));
    setSelectedEdgeId((currentSelectedEdgeId) =>
      nextEdges.some((edge) => edge.id === currentSelectedEdgeId) ? currentSelectedEdgeId : null,
    );
  }

  async function loadCanvas(targetCanvasId = canvasId) {
    const normalizedCanvasId = targetCanvasId.trim();

    if (!normalizedCanvasId) {
      setNotice({
        tone: "error",
        text: "Enter a canvas id before attempting to load MongoDB state.",
      });
      return;
    }

    setIsLoadingCanvas(true);
    setNotice({
      tone: "loading",
      text: `Loading canvas ${normalizedCanvasId} from the API...`,
    });

    try {
      const canvas = await getCanvas(normalizedCanvasId);

      applyRemoteCanvasState(canvas, normalizedCanvasId);
      onNavigateToCanvas?.(canvas._id || normalizedCanvasId, { replace: true });
      setSelectedNodeId(canvas.nodes?.[0]?.id || null);
      setSelectedEdgeId(null);
      setConnectingSourceId(null);
      setNotice({
        tone: "success",
        text: `Canvas ${canvas._id} loaded from MongoDB with ${canvas.nodes.length} nodes and ${canvas.edges.length} edges.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error.message,
      });
    } finally {
      setIsLoadingCanvas(false);
    }
  }

  function handleAddNode(template) {
    const nextNode = {
      id: createNodeId(template.label),
      type: template.type,
      position: getNextNodePosition(nodes.length),
      data: {
        label: template.label,
        size: "md",
        techStack: template.techStack,
      },
    };

    const nextNodes = [...nodes, nextNode];

    setNodes(nextNodes);
    setSelectedNodeId(nextNode.id);
    setSelectedEdgeId(null);
    emitCanvasUpdate({ nodes: nextNodes, edges });
    setNotice({
      tone: "info",
      text: `${template.label} added to the workspace. Drag it into place, then save when the layout is ready.`,
    });
  }

  function handleNodeMove(nodeId, position, options = {}) {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              position,
            }
          : node,
      ),
    );

    if (options.broadcast) {
      queueNodeDragBroadcast(nodeId, position);
    }
  }

  function handleResizeNode(nodeId, direction) {
    const nodeToResize = nodes.find((node) => node.id === nodeId);

    if (!nodeToResize) {
      return;
    }

    const currentSize = nodeToResize.data?.size || "md";
    const nextSize = getNextNodeSize(currentSize, direction);

    if (currentSize === nextSize) {
      setNotice({
        tone: "info",
        text: `${nodeToResize.data?.label || nodeId} is already at the ${currentSize === "sm" ? "smallest" : "largest"} card size.`,
      });
      return;
    }

    const nextNodes = nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              size: nextSize,
            },
          }
        : node,
    );

    setNodes(nextNodes);
    emitCanvasUpdate({ nodes: nextNodes, edges });
    setNotice({
      tone: "info",
      text: `${nodeToResize.data?.label || nodeId} resized to ${nextSize === "sm" ? "small" : nextSize === "lg" ? "large" : "medium"}. Save to persist the new card size.`,
    });
  }

  function handleEdgeSelect(edgeId) {
    setSelectedEdgeId(edgeId);
    setConnectingSourceId(null);
  }

  function handleDeleteEdge(edgeId) {
    const edgeToDelete = edges.find((edge) => edge.id === edgeId);

    if (!edgeToDelete) {
      return;
    }

    const sourceNode = nodes.find((node) => node.id === edgeToDelete.source);
    const targetNode = nodes.find((node) => node.id === edgeToDelete.target);
    const nextEdges = edges.filter((edge) => edge.id !== edgeId);

    setEdges(nextEdges);
    setSelectedEdgeId(null);
    emitCanvasUpdate({ nodes, edges: nextEdges });
    setNotice({
      tone: "info",
      text: `Removed connection ${sourceNode?.data?.label || edgeToDelete.source} -> ${targetNode?.data?.label || edgeToDelete.target}.`,
    });
  }

  function handleDeleteNode(nodeId) {
    const nodeToDelete = nodes.find((node) => node.id === nodeId);

    if (!nodeToDelete) {
      return;
    }

    const nextNodes = nodes.filter((node) => node.id !== nodeId);
    const removedEdges = edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);
    const nextEdges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);

    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNodeId((currentSelectedNodeId) =>
      getNextSelectedNodeId(nextNodes, currentSelectedNodeId === nodeId ? null : currentSelectedNodeId),
    );
    setSelectedEdgeId((currentSelectedEdgeId) =>
      removedEdges.some((edge) => edge.id === currentSelectedEdgeId) ? null : currentSelectedEdgeId,
    );

    if (connectingSourceId === nodeId) {
      setConnectingSourceId(null);
    }

    emitCanvasUpdate({ nodes: nextNodes, edges: nextEdges });
    setNotice({
      tone: "info",
      text: `Deleted ${nodeToDelete.data?.label || nodeId} and removed ${removedEdges.length} connected edge${removedEdges.length === 1 ? "" : "s"}.`,
    });
  }

  function createEdgeBetween(sourceId, targetId) {
    if (sourceId === targetId) {
      setConnectingSourceId(null);
      setSelectedNodeId(sourceId);
      setNotice({
        tone: "info",
        text: "Connection mode cancelled. Choose a different node to create an edge.",
      });
      return;
    }

    if (edges.some((edge) => edge.source === sourceId && edge.target === targetId)) {
      setConnectingSourceId(null);
      setSelectedNodeId(targetId);
      setSelectedEdgeId(null);
      setNotice({
        tone: "info",
        text: "That edge already exists on the canvas.",
      });
      return;
    }

    const sourceNode = nodes.find((node) => node.id === sourceId);
    const targetNode = nodes.find((node) => node.id === targetId);
    const nextEdges = [...edges, { id: createEdgeId(), source: sourceId, target: targetId }];

    setEdges(nextEdges);
    setConnectingSourceId(null);
    setSelectedNodeId(targetId);
    setSelectedEdgeId(null);
    emitCanvasUpdate({ nodes, edges: nextEdges });
    setNotice({
      tone: "info",
      text: `Connected ${sourceNode?.data?.label || sourceId} to ${targetNode?.data?.label || targetId}. Save to persist the new edge in MongoDB.`,
    });
  }

  function handleNodeSelect(nodeId) {
    if (connectingSourceId) {
      createEdgeBetween(connectingSourceId, nodeId);
      return;
    }

    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  }

  function handleStartConnection(nodeId) {
    if (connectingSourceId && connectingSourceId !== nodeId) {
      createEdgeBetween(connectingSourceId, nodeId);
      return;
    }

    if (connectingSourceId === nodeId) {
      setConnectingSourceId(null);
      setNotice({
        tone: "info",
        text: "Connection mode cancelled.",
      });
      return;
    }

    const sourceNode = nodes.find((node) => node.id === nodeId);

    setConnectingSourceId(nodeId);
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setNotice({
      tone: "info",
      text: `Connection mode armed from ${sourceNode?.data?.label || nodeId}. Click another node to create an edge.`,
    });
  }

  function handleCancelConnection() {
    if (!connectingSourceId) {
      return;
    }

    setConnectingSourceId(null);
    setNotice({
      tone: "info",
      text: "Connection mode cancelled.",
    });
  }

  async function persistCanvasState(normalizedCanvasId) {
    const savedCanvas = await updateCanvas(normalizedCanvasId, {
      title,
      nodes,
      edges,
    });

    const nextCanvasId = savedCanvas._id || normalizedCanvasId;
    const nextTitle = savedCanvas.title || title;
    const nextNodes = savedCanvas.nodes || nodes;
    const nextEdges = savedCanvas.edges || edges;

    setCanvasId(nextCanvasId);
    joinCanvasRoom(nextCanvasId);
    setTitle(nextTitle);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setLastSavedAt(savedCanvas.lastModified || null);
    loadedCanvasIdRef.current = nextCanvasId;
    setSelectedNodeId((currentSelectedNodeId) => getNextSelectedNodeId(nextNodes, currentSelectedNodeId));
    setSelectedEdgeId((currentSelectedEdgeId) =>
      nextEdges.some((edge) => edge.id === currentSelectedEdgeId) ? currentSelectedEdgeId : null,
    );
    onNavigateToCanvas?.(nextCanvasId, { replace: true });
    emitCanvasUpdate({
      title: nextTitle,
      nodes: nextNodes,
      edges: nextEdges,
      lastModified: savedCanvas.lastModified,
    });

    return {
      nextCanvasId,
      nextEdges,
      nextNodes,
      nextTitle,
      savedCanvas,
    };
  }

  async function handleSaveArchitecture() {
    const normalizedCanvasId = canvasId.trim();

    if (!normalizedCanvasId) {
      setNotice({
        tone: "error",
        text: "Enter a canvas id before saving the architecture back to MongoDB.",
      });
      return;
    }

    setIsSaving(true);
    setNotice({
      tone: "loading",
      text: `Saving architecture ${normalizedCanvasId} to MongoDB...`,
    });

    try {
      const { nextEdges, nextNodes } = await persistCanvasState(normalizedCanvasId);

      setNotice({
        tone: "success",
        text: `Architecture saved successfully with ${nextNodes.length} nodes and ${nextEdges.length} edges.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateInfrastructure() {
    const normalizedCanvasId = canvasId.trim();

    if (!normalizedCanvasId) {
      setNotice({
        tone: "error",
        text: "Enter a canvas id before generating infrastructure output.",
      });
      return;
    }

    setIsGeneratingInfra(true);
    setNotice({
      tone: "loading",
      text: `Compiling infrastructure artifacts for canvas ${normalizedCanvasId}...`,
    });

    try {
      const { nextCanvasId, nextEdges, nextNodes } = await persistCanvasState(normalizedCanvasId);
      const infraBundle = await generateInfrastructure(nextCanvasId);

      setGeneratedInfra(infraBundle);
      setIsInfraModalOpen(true);
      setNotice({
        tone: "success",
        text: `Infrastructure bundle generated from ${nextNodes.length} nodes and ${nextEdges.length} edges.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error.message,
      });
    } finally {
      setIsGeneratingInfra(false);
    }
  }

  async function handleAICommand(command) {
    const normalizedCanvasId = canvasId.trim();
    const normalizedCommand = command.trim();

    setAiMessages((currentMessages) => [...currentMessages, createDrawerMessage("user", normalizedCommand)]);

    if (!normalizedCanvasId) {
      const errorMessage = "Load a canvas before asking the AI copilot to mutate the graph.";

      setAiMessages((currentMessages) => [
        ...currentMessages,
        createDrawerMessage("assistant", `I can't apply that yet. ${errorMessage}`),
      ]);
      setNotice({
        tone: "error",
        text: errorMessage,
      });
      return false;
    }

    setIsRunningAICommand(true);
    setNotice({
      tone: "loading",
      text: `AI copilot is updating canvas ${normalizedCanvasId}...`,
    });

    try {
      const result = await runAICommand(normalizedCanvasId, normalizedCommand);

      if (result.canvas) {
        applyRemoteCanvasState(result.canvas, normalizedCanvasId);
      }

      setAiMessages((currentMessages) => [
        ...currentMessages,
        createDrawerMessage("assistant", `AI Copilot: ${result.message}`),
      ]);
      setNotice({
        tone: "success",
        text: result.message,
      });
      return true;
    } catch (error) {
      setAiMessages((currentMessages) => [
        ...currentMessages,
        createDrawerMessage("assistant", `I couldn't apply that command: ${error.message}`),
      ]);
      setNotice({
        tone: "error",
        text: error.message,
      });
      return false;
    } finally {
      setIsRunningAICommand(false);
    }
  }

  async function handleExportDiagram(format) {
    const exportTarget = canvasSurfaceRef.current;
    const normalizedFormat = format === "svg" ? "svg" : "png";

    if (!exportTarget) {
      setNotice({
        tone: "error",
        text: "The canvas surface is not ready to export yet.",
      });
      return;
    }

    setIsExporting(true);
    setIsExportMenuOpen(false);
    setNotice({
      tone: "loading",
      text: `Preparing ${normalizedFormat.toUpperCase()} export from the current canvas surface...`,
    });

    try {
      const baseOptions = {
        backgroundColor: "#020617",
        cacheBust: true,
        canvasHeight: exportTarget.scrollHeight,
        canvasWidth: exportTarget.scrollWidth,
        height: exportTarget.scrollHeight,
        width: exportTarget.scrollWidth,
      };
      const dataUrl =
        normalizedFormat === "svg"
          ? await toSvg(exportTarget, baseOptions)
          : await toPng(exportTarget, {
              ...baseOptions,
              pixelRatio: 2,
            });

      downloadDataUrl(
        dataUrl,
        createExportFileName(title || joinedCanvasId || canvasId || "synapse-diagram", normalizedFormat),
      );
      setNotice({
        tone: "success",
        text: `Diagram exported successfully as ${normalizedFormat.toUpperCase()}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error.message || "The diagram export failed.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  useEffect(() => {
    if (!selectedEdgeId || isInfraModalOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        !isTextInputActive()
      ) {
        event.preventDefault();
        handleDeleteEdge(selectedEdgeId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isInfraModalOpen, selectedEdgeId, edges, nodes]);

  function handleCanvasIdKeyDown(event) {
    if (event.key === "Enter") {
      void loadCanvas();
    }
  }

  return (
    <>
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-panel backdrop-blur-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-500">
                  Synapse Workspace
                </p>
                <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Design software systems on a live architecture canvas.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Reopen saved canvases from the dashboard, collaborate over Socket.io rooms,
                  generate infrastructure output, and now export the rendered graph as PNG or SVG.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em]",
                      socketStatusAppearance.className,
                    ].join(" ")}
                  >
                    <span className={["h-2.5 w-2.5 rounded-full", socketStatusAppearance.dotClassName].join(" ")} />
                    {socketStatusAppearance.label}
                  </span>

                  {joinedCanvasId ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-300">
                      Room {joinedCanvasId.slice(0, 8)}...
                    </span>
                  ) : null}

                  {currentUser ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-200">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
                      {currentUser.name} · {currentUser.email}
                    </span>
                  ) : null}

                  {onLogout ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-rose-300/30 hover:bg-white/10"
                      onClick={onLogout}
                      type="button"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Log Out
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[auto_minmax(0,260px)_auto_auto_auto_auto] xl:min-w-[1180px]">
                {onOpenDashboard ? (
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:border-cyan-300/30 hover:bg-white/10"
                    onClick={() => onOpenDashboard()}
                    type="button"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Dashboard
                  </button>
                ) : null}

                <label className="rounded-[1.4rem] border border-white/10 bg-slate-950/80 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Canvas ID
                  </span>
                  <input
                    className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    onChange={(event) => setCanvasId(event.target.value)}
                    onKeyDown={handleCanvasIdKeyDown}
                    placeholder="Paste a MongoDB canvas id"
                    value={canvasId}
                  />
                </label>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:border-cyan-300/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => void loadCanvas()}
                  type="button"
                >
                  {isLoadingCanvas ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Load Canvas
                </button>

                <div className="relative" ref={exportMenuRef}>
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:border-cyan-300/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isExporting || !nodes.length}
                    onClick={() => setIsExportMenuOpen((currentValue) => !currentValue)}
                    type="button"
                  >
                    {isExporting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Export Diagram
                    <ChevronDown className={[
                      "h-4 w-4 transition",
                      isExportMenuOpen ? "rotate-180" : "rotate-0",
                    ].join(" ")} />
                  </button>

                  {isExportMenuOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-[1.2rem] border border-white/10 bg-slate-950/95 p-2 shadow-panel backdrop-blur-sm">
                      <button
                        className="flex w-full items-center justify-between rounded-[1rem] px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                        onClick={() => void handleExportDiagram("png")}
                        type="button"
                      >
                        Download PNG
                        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">2x</span>
                      </button>
                      <button
                        className="mt-1 flex w-full items-center justify-between rounded-[1rem] px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                        onClick={() => void handleExportDiagram("svg")}
                        type="button"
                      >
                        Download SVG
                        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">vector</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] border border-cyan-300/30 bg-cyan-400/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => void handleSaveArchitecture()}
                  type="button"
                >
                  {isSaving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Architecture
                </button>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] border border-emerald-300/30 bg-emerald-400/15 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:border-emerald-200/50 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => void handleGenerateInfrastructure()}
                  type="button"
                >
                  {isGeneratingInfra ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileCode2 className="h-4 w-4" />
                  )}
                  Generate Infra
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <label className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Architecture Title
                </span>
                <input
                  className="mt-2 w-full bg-transparent font-display text-xl text-white outline-none placeholder:text-slate-500"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Name this architecture"
                  value={title}
                />
              </label>

              <div
                className={[
                  "flex items-start gap-3 rounded-[1.5rem] border px-4 py-3 text-sm leading-6",
                  noticeAppearance.className,
                ].join(" ")}
              >
                <NoticeIcon className={["mt-0.5 h-5 w-5 shrink-0", noticeAppearance.iconClassName].join(" ")} />
                <p>{notice.text}</p>
              </div>
            </div>
          </header>

          <section className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Sidebar
              edgeCount={edges.length}
              lastSavedAt={lastSavedAt}
              nodeCount={nodes.length}
              onAddNode={handleAddNode}
              selectedNode={selectedNode}
            />

            <div
              className={[
                "grid gap-6",
                isAIDrawerOpen
                  ? "2xl:grid-cols-[minmax(0,1fr)_380px]"
                  : "2xl:grid-cols-[minmax(0,1fr)_88px]",
              ].join(" ")}
            >
              <Canvas
                canvasId={joinedCanvasId || canvasId}
                connectingSourceId={connectingSourceId}
                edges={edges}
                nodes={nodes}
                onCancelConnection={handleCancelConnection}
                onDeleteEdge={handleDeleteEdge}
                onDeleteNode={handleDeleteNode}
                onNodeMove={handleNodeMove}
                onResizeNode={handleResizeNode}
                onSelectEdge={handleEdgeSelect}
                onSelectNode={handleNodeSelect}
                onStartConnection={handleStartConnection}
                selectedEdgeId={selectedEdgeId}
                selectedNodeId={selectedNodeId}
                surfaceRef={canvasSurfaceRef}
                title={title}
              />

              <AIDrawer
                examplePrompts={aiExamplePrompts}
                isOpen={isAIDrawerOpen}
                isSubmitting={isRunningAICommand}
                messages={aiMessages}
                onSubmitCommand={handleAICommand}
                onToggle={() => setIsAIDrawerOpen((currentValue) => !currentValue)}
              />
            </div>
          </section>
        </div>
      </div>

      <InfraModal
        generatedInfra={generatedInfra}
        isOpen={isInfraModalOpen}
        onClose={() => setIsInfraModalOpen(false)}
      />
    </>
  );
}

