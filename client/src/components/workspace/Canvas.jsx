import { useEffect, useLayoutEffect, useRef, useState } from "react";

import EdgeOverlay from "../EdgeOverlay";
import Node, { getNodeDimensions } from "./Node";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function assignRef(ref, value) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
    return;
  }

  ref.current = value;
}

export default function Canvas({
  canvasId,
  connectingSourceId,
  edges,
  nodes,
  onCancelConnection,
  onDeleteEdge,
  onDeleteNode,
  onNodeMove,
  onResizeNode,
  onSelectNode,
  onSelectEdge,
  onStartConnection,
  selectedEdgeId,
  selectedNodeId,
  surfaceRef,
  title,
}) {
  const canvasRef = useRef(null);
  const dragStateRef = useRef(null);
  const nodeElementRefs = useRef(new Map());
  const moveHandlerRef = useRef(onNodeMove);
  const selectHandlerRef = useRef(onSelectNode);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [nodeAnchors, setNodeAnchors] = useState({});
  const [pointerPosition, setPointerPosition] = useState(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 1120, height: 720 });

  useEffect(() => {
    moveHandlerRef.current = onNodeMove;
    selectHandlerRef.current = onSelectNode;
  }, [onNodeMove, onSelectNode]);

  useLayoutEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    function measureAnchors() {
      if (!canvasRef.current) {
        return;
      }

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const nextAnchors = {};
      let maxRight = 0;
      let maxBottom = 0;

      nodes.forEach((node) => {
        const element = nodeElementRefs.current.get(node.id);

        if (!element) {
          return;
        }

        const rect = element.getBoundingClientRect();
        const centerY = rect.top - canvasRect.top + rect.height / 2;
        const left = rect.left - canvasRect.left;
        const right = rect.right - canvasRect.left;
        const top = rect.top - canvasRect.top;
        const bottom = rect.bottom - canvasRect.top;

        maxRight = Math.max(maxRight, right);
        maxBottom = Math.max(maxBottom, bottom);

        nextAnchors[node.id] = {
          source: {
            x: right,
            y: centerY,
          },
          target: {
            x: left,
            y: centerY,
          },
        };
      });

      setNodeAnchors(nextAnchors);
      setSurfaceSize({
        width: Math.max(1120, Math.ceil(maxRight + 96)),
        height: Math.max(720, Math.ceil(maxBottom + 96)),
      });
    }

    measureAnchors();

    const resizeObserver =
      typeof ResizeObserver === "function" ? new ResizeObserver(measureAnchors) : null;

    if (resizeObserver) {
      resizeObserver.observe(canvasRef.current);
      nodeElementRefs.current.forEach((element) => resizeObserver.observe(element));
    }

    window.addEventListener("resize", measureAnchors);

    return () => {
      window.removeEventListener("resize", measureAnchors);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [draggingNodeId, nodes]);

  useEffect(() => {
    if (!connectingSourceId) {
      setPointerPosition(null);
    }
  }, [connectingSourceId]);

  useEffect(() => {
    if (!draggingNodeId) {
      return undefined;
    }

    function handlePointerMove(event) {
      if (!canvasRef.current || !dragStateRef.current) {
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const { nodeHeight, nodeId, nodeWidth, offsetX, offsetY } = dragStateRef.current;

      moveHandlerRef.current(nodeId, {
        x: clamp(event.clientX - rect.left - offsetX, 16, Math.max(16, rect.width - nodeWidth - 16)),
        y: clamp(event.clientY - rect.top - offsetY, 16, Math.max(16, rect.height - nodeHeight - 16)),
      }, { broadcast: true });
    }

    function handlePointerUp() {
      setDraggingNodeId(null);
      dragStateRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingNodeId]);

  function handleNodePointerDown(event, node) {
    if (event.button !== 0 || !canvasRef.current || connectingSourceId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = canvasRef.current.getBoundingClientRect();
    const nodeRect = event.currentTarget.getBoundingClientRect();

    dragStateRef.current = {
      nodeId: node.id,
      nodeHeight: nodeRect.height || getNodeDimensions(node.data?.size).minHeight,
      nodeWidth: nodeRect.width || getNodeDimensions(node.data?.size).width,
      offsetX: event.clientX - rect.left - node.position.x,
      offsetY: event.clientY - rect.top - node.position.y,
    };

    setDraggingNodeId(node.id);
    selectHandlerRef.current(node.id);
  }

  function handleCanvasPointerDown(event) {
    if (event.target === canvasRef.current) {
      onSelectEdge(null);

      if (connectingSourceId) {
        onCancelConnection();
        return;
      }

      selectHandlerRef.current(null);
    }
  }

  function handleCanvasPointerMove(event) {
    if (!connectingSourceId || !canvasRef.current || dragStateRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();

    setPointerPosition({
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
    });
  }

  const previewConnection = (() => {
    if (!connectingSourceId || !pointerPosition) {
      return null;
    }

    const sourcePoint = nodeAnchors[connectingSourceId]?.source;

    if (!sourcePoint) {
      return null;
    }

    return {
      source: sourcePoint,
      target: pointerPosition,
    };
  })();

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Designer Surface
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5">
            {canvasId ? `Canvas ${canvasId.slice(0, 8)}...` : "Preview mode"}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5">
            {nodes.length} nodes
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5">
            {edges.length} edges
          </span>
        </div>
      </div>

      <div className="max-h-[72vh] overflow-auto">
        <div
          ref={(element) => {
            canvasRef.current = element;
            assignRef(surfaceRef, element);
          }}
          className="bg-grid-canvas relative min-h-[72vh] min-w-full"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          style={{ height: surfaceSize.height, width: Math.max(surfaceSize.width, 960) }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.12),transparent_28%)]" />

          <EdgeOverlay
            anchors={nodeAnchors}
            edges={edges}
            onDeleteEdge={onDeleteEdge}
            onSelectEdge={onSelectEdge}
            previewConnection={previewConnection}
            selectedEdgeId={selectedEdgeId}
          />

          {nodes.map((node) => (
            <Node
              isConnectingSource={connectingSourceId === node.id}
              key={node.id}
              isDragging={draggingNodeId === node.id}
              isSelected={selectedNodeId === node.id}
              node={node}
              nodeRef={(element) => {
                if (element) {
                  nodeElementRefs.current.set(node.id, element);
                  return;
                }

                nodeElementRefs.current.delete(node.id);
              }}
              onDeleteNode={onDeleteNode}
              onPointerDown={handleNodePointerDown}
              onResizeNode={onResizeNode}
              onSelect={onSelectNode}
              onStartConnection={onStartConnection}
            />
          ))}

          {!nodes.length ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-md rounded-[2rem] border border-dashed border-white/15 bg-slate-950/80 p-6 text-center shadow-panel">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                  Empty Canvas
                </p>
                <p className="mt-3 text-lg font-semibold text-white">
                  Add components from the sidebar to start mapping the architecture.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Load a saved MongoDB canvas or drop in a frontend app, API, database, and cache layer to build the first draft.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
