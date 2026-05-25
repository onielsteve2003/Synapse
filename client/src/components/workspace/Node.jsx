import { Blocks, Database, Grip, Minus, Plus, RadioTower, Trash2, Workflow } from "lucide-react";

export const NODE_SIZE_ORDER = ["sm", "md", "lg"];

export const NODE_DIMENSIONS = {
  sm: {
    width: 216,
    minHeight: 128,
  },
  md: {
    width: 248,
    minHeight: 144,
  },
  lg: {
    width: 296,
    minHeight: 168,
  },
};

export function getNodeDimensions(size = "md") {
  return NODE_DIMENSIONS[size] || NODE_DIMENSIONS.md;
}

export function getNodeSizeLabel(size = "md") {
  if (size === "sm") {
    return "Small";
  }

  if (size === "lg") {
    return "Large";
  }

  return "Medium";
}

const typeMeta = {
  frontend: {
    icon: Blocks,
    label: "Frontend App",
    iconClassName: "text-cyan-200",
    surfaceClassName: "border-cyan-400/20 bg-cyan-400/10",
  },
  api: {
    icon: Workflow,
    label: "REST API",
    iconClassName: "text-emerald-200",
    surfaceClassName: "border-emerald-400/20 bg-emerald-400/10",
  },
  database: {
    icon: Database,
    label: "Database",
    iconClassName: "text-indigo-200",
    surfaceClassName: "border-indigo-400/20 bg-indigo-400/10",
  },
  cache: {
    icon: RadioTower,
    label: "Cache Layer",
    iconClassName: "text-amber-200",
    surfaceClassName: "border-amber-400/20 bg-amber-400/10",
  },
  default: {
    icon: Blocks,
    label: "System Node",
    iconClassName: "text-slate-200",
    surfaceClassName: "border-white/10 bg-white/5",
  },
};

export default function Node({
  node,
  isConnectingSource,
  isDragging,
  isSelected,
  nodeRef,
  onDeleteNode,
  onPointerDown,
  onResizeNode,
  onSelect,
  onStartConnection,
}) {
  const meta = typeMeta[node.type] || typeMeta.default;
  const Icon = meta.icon;
  const nodeSize = node.data?.size || "md";
  const nodeDimensions = getNodeDimensions(nodeSize);
  const currentSizeIndex = NODE_SIZE_ORDER.indexOf(nodeSize);
  const canDecreaseSize = currentSizeIndex > 0;
  const canIncreaseSize = currentSizeIndex < NODE_SIZE_ORDER.length - 1;

  return (
    <article
      ref={nodeRef}
      className={[
        "group absolute select-none rounded-[1.5rem] border p-3 shadow-2xl transition duration-150",
        isSelected
          ? "border-cyan-300/60 shadow-cyan-950/40"
          : "border-white/10 shadow-slate-950/30",
        isDragging ? "cursor-grabbing" : "cursor-grab",
      ].join(" ")}
      style={{ left: node.position.x, top: node.position.y, width: nodeDimensions.width }}
      onPointerDown={(event) => onPointerDown(event, node)}
      onClick={() => onSelect(node.id)}
    >
      <div className="pointer-events-none absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/10 bg-slate-900/95" />

      <button
        aria-label={`Delete ${node.data?.label || node.id}`}
        className={[
          "absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/85 text-slate-400 shadow-lg transition",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          "hover:border-rose-300/40 hover:text-rose-200",
        ].join(" ")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDeleteNode(node.id);
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        type="button"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div
        className={[
          "absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/85 p-1 text-slate-300 shadow-lg transition",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        ].join(" ")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          aria-label={`Reduce size of ${node.data?.label || node.id}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={!canDecreaseSize}
          onClick={() => onResizeNode(node.id, "decrease")}
          type="button"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[64px] px-1 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {getNodeSizeLabel(nodeSize)}
        </span>
        <button
          aria-label={`Increase size of ${node.data?.label || node.id}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={!canIncreaseSize}
          onClick={() => onResizeNode(node.id, "increase")}
          type="button"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <button
        aria-label={`Create connection from ${node.data?.label || node.id}`}
        className={[
          "absolute -right-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-slate-950 shadow-lg transition",
          isConnectingSource
            ? "bg-cyan-300 shadow-cyan-300/35"
            : "bg-slate-700 hover:bg-cyan-400 hover:shadow-cyan-400/30",
        ].join(" ")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onStartConnection(node.id);
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        type="button"
      >
        <span className="sr-only">Start connection</span>
      </button>

      <div
        className={[
          "rounded-[1.2rem] border bg-slate-950/95 p-4 pr-12 backdrop-blur-sm",
          meta.surfaceClassName,
        ].join(" ")}
        style={{ minHeight: nodeDimensions.minHeight }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/90">
            <Icon className={["h-5 w-5", meta.iconClassName].join(" ")} />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
            <Grip className="h-3.5 w-3.5 text-slate-500" />
            Drag
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">{meta.label}</p>
          <h3 className="mt-2 font-display text-lg font-semibold text-white">
            {node.data?.label || "Untitled Node"}
          </h3>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(node.data?.techStack || []).map((item) => (
            <span
              key={`${node.id}-${item}`}
              className="rounded-full border border-white/10 bg-slate-900/85 px-3 py-1 text-xs font-medium text-slate-200"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
