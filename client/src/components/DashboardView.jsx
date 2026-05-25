import { useEffect, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Clock3,
  LoaderCircle,
  LogOut,
  Network,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  createCanvas,
  deleteCanvas as destroyCanvas,
  getAllCanvases,
} from "../services/api";

const CARD_ACCENTS = [
  "from-cyan-400/20 via-cyan-400/5 to-transparent",
  "from-emerald-400/20 via-emerald-400/5 to-transparent",
  "from-amber-400/20 via-amber-400/5 to-transparent",
  "from-sky-400/20 via-sky-400/5 to-transparent",
];

function formatTimestamp(value) {
  if (!value) {
    return "No saved activity yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getCanvasTechTags(canvas) {
  const techTags = new Set();

  (canvas.nodes || []).forEach((node) => {
    (node?.data?.techStack || []).forEach((tag) => {
      if (typeof tag === "string" && tag.trim()) {
        techTags.add(tag.trim());
      }
    });
  });

  return Array.from(techTags).slice(0, 6);
}

function DashboardMetric({ label, value }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-5 shadow-panel backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{label}</p>
      <p className="mt-3 font-display text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function DashboardView({ currentUser, onLogout, onOpenCanvas }) {
  const [canvases, setCanvases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCanvasId, setDeletingCanvasId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const totalNodes = canvases.reduce((sum, canvas) => sum + (canvas.nodes?.length || 0), 0);
  const totalEdges = canvases.reduce((sum, canvas) => sum + (canvas.edges?.length || 0), 0);

  async function loadCanvases() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextCanvases = await getAllCanvases();

      setCanvases(Array.isArray(nextCanvases) ? nextCanvases : []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCanvases();
  }, []);

  async function handleCreateCanvas() {
    setIsCreating(true);
    setErrorMessage("");

    try {
      const canvas = await createCanvas({
        title: "New Architecture",
      });

      if (canvas?._id) {
        onOpenCanvas?.(canvas._id);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteCanvas(canvas) {
    const canvasLabel = canvas.title || "Untitled Canvas";
    const isConfirmed = window.confirm(`Delete ${canvasLabel}? This cannot be undone.`);

    if (!isConfirmed) {
      return;
    }

    setDeletingCanvasId(canvas._id);
    setErrorMessage("");

    try {
      await destroyCanvas(canvas._id);
      setCanvases((currentCanvases) =>
        currentCanvases.filter((currentCanvas) => currentCanvas._id !== canvas._id),
      );
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setDeletingCanvasId("");
    }
  }

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-slate-900/70 p-6 shadow-panel backdrop-blur-sm sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.16),transparent_32%)]" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_430px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-500">
                Synapse Dashboard
              </p>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Launch, review, and reopen every system design canvas from one control room.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Each architecture card reflects the live MongoDB canvas state, including graph size,
                recent activity, and the stack signals derived from node metadata.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {currentUser ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-200" />
                    {currentUser.name} · {currentUser.email}
                  </span>
                ) : null}

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] border border-cyan-300/30 bg-cyan-400/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreating}
                  onClick={() => void handleCreateCanvas()}
                  type="button"
                >
                  {isCreating ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  New Architecture
                </button>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:border-cyan-300/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                  onClick={() => void loadCanvases()}
                  type="button"
                >
                  <RefreshCcw className={["h-4 w-4", isLoading ? "animate-spin" : ""].join(" ")} />
                  Refresh Board
                </button>

                {onLogout ? (
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:border-rose-300/30 hover:bg-white/10"
                    onClick={onLogout}
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DashboardMetric label="Saved Canvases" value={canvases.length} />
              <DashboardMetric label="Mapped Nodes" value={totalNodes} />
              <DashboardMetric label="Live Connections" value={totalEdges} />
              <DashboardMetric label="Design Surface" value="Multi-canvas" />
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-[1.8rem] border border-white/10 bg-slate-900/60 p-5 shadow-panel backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
                Architecture Library
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                Resume any saved canvas or retire the ones you no longer need.
              </h2>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
              <Boxes className="h-4 w-4 text-cyan-200" />
              Mongo-backed canvas inventory
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-[1.4rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-6 flex min-h-[280px] items-center justify-center rounded-[1.8rem] border border-white/10 bg-slate-950/70 px-6 py-10 text-slate-300">
              <div className="flex items-center gap-3">
                <LoaderCircle className="h-5 w-5 animate-spin text-cyan-200" />
                Loading saved canvases from the API...
              </div>
            </div>
          ) : canvases.length ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {canvases.map((canvas, index) => {
                const techTags = getCanvasTechTags(canvas);
                const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
                const isDeleting = deletingCanvasId === canvas._id;

                return (
                  <article
                    className="group relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-slate-950/80 p-5 shadow-panel transition hover:-translate-y-1 hover:border-cyan-300/20"
                    key={canvas._id}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-90`} />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0),rgba(2,6,23,0.72))]" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Canvas {canvas._id.slice(0, 8)}...
                          </p>
                          <h3 className="mt-3 font-display text-2xl font-semibold text-white">
                            {canvas.title || "Untitled Canvas"}
                          </h3>
                        </div>

                        <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-xs font-medium text-slate-300">
                          {(canvas.nodes || []).length ? "Active graph" : "Blank canvas"}
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5">
                          <Network className="h-3.5 w-3.5 text-cyan-200" />
                          {(canvas.nodes || []).length} nodes
                        </span>
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5">
                          {(canvas.edges || []).length} edges
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5">
                          <Clock3 className="h-3.5 w-3.5 text-emerald-200" />
                          {formatTimestamp(canvas.lastModified)}
                        </span>
                      </div>

                      <div className="mt-5 min-h-[82px] rounded-[1.4rem] border border-white/10 bg-slate-900/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                          Detected Stack
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {techTags.length ? (
                            techTags.map((tag) => (
                              <span
                                className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-50"
                                key={`${canvas._id}-${tag}`}
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-400">
                              No node stack metadata yet. Open the canvas and start laying out the system.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-[1.3rem] border border-cyan-300/30 bg-cyan-400/15 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-400/20"
                          onClick={() => onOpenCanvas?.(canvas._id)}
                          type="button"
                        >
                          Open Canvas
                          <ArrowRight className="h-4 w-4" />
                        </button>

                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-[1.3rem] border border-rose-300/20 bg-rose-400/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:border-rose-200/40 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isDeleting}
                          onClick={() => void handleDeleteCanvas(canvas)}
                          type="button"
                        >
                          {isDeleting ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.8rem] border border-dashed border-white/15 bg-slate-950/70 px-6 py-12 text-center shadow-panel">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
                Empty Workspace
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold text-white">
                No saved canvases yet.
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Create the first architecture canvas and Synapse will drop you straight into the live editor.
              </p>
              <button
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-[1.4rem] border border-cyan-300/30 bg-cyan-400/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreating}
                onClick={() => void handleCreateCanvas()}
                type="button"
              >
                {isCreating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create First Canvas
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}