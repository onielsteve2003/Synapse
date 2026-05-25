import { Blocks, Database, Plus, RadioTower, Workflow } from "lucide-react";

const libraryItems = [
  {
    type: "frontend",
    label: "Frontend App",
    description: "React storefront, admin dashboard, or mobile web shell.",
    techStack: ["React", "Vite", "Tailwind CSS"],
    icon: Blocks,
    surfaceClassName: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  },
  {
    type: "api",
    label: "REST API",
    description: "Node/Express entrypoint with business logic and realtime sync.",
    techStack: ["Node.js", "Express", "Socket.io"],
    icon: Workflow,
    surfaceClassName: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  },
  {
    type: "database",
    label: "Database",
    description: "Primary persistence for canvases, users, and project metadata.",
    techStack: ["MongoDB", "Mongoose"],
    icon: Database,
    surfaceClassName: "border-indigo-400/20 bg-indigo-400/10 text-indigo-200",
  },
  {
    type: "cache",
    label: "Redis Cache",
    description: "Fast coordination layer for sessions, locks, and presence.",
    techStack: ["Redis", "Pub/Sub"],
    icon: RadioTower,
    surfaceClassName: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  },
];

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString() : "Not saved yet";
}

export default function Sidebar({ edgeCount, lastSavedAt, nodeCount, onAddNode, selectedNode }) {
  return (
    <aside className="flex h-full flex-col gap-4">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-panel backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
          Component Library
        </p>
        <div className="mt-5 space-y-3">
          {libraryItems.map(({ description, icon: Icon, label, surfaceClassName, techStack, type }) => (
            <button
              key={label}
              className="w-full rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/30"
              onClick={() => onAddNode({ label, techStack, type })}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={[
                    "inline-flex h-11 w-11 items-center justify-center rounded-2xl border",
                    surfaceClassName,
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-300">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </span>
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-white">{label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {techStack.map((item) => (
                  <span
                    key={`${label}-${item}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-panel backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
          Canvas Snapshot
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Nodes</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{nodeCount}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Edges</p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">{edgeCount}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Last Sync</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{formatTimestamp(lastSavedAt)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-panel backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
          Selected Node
        </p>
        {selectedNode ? (
          <div className="mt-4 rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
            <p className="font-display text-xl font-semibold text-white">{selectedNode.data.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Type: <span className="text-cyan-100">{selectedNode.type}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(selectedNode.data.techStack || []).map((item) => (
                <span
                  key={`${selectedNode.id}-${item}`}
                  className="rounded-full border border-white/10 bg-slate-950/85 px-3 py-1 text-xs text-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Click or drag a node on the canvas to inspect its current role and technology stack.
          </p>
        )}
      </section>
    </aside>
  );
}
