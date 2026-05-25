import { Grip, MoveRight, ScanSearch, Users } from "lucide-react";

const nodes = [
  {
    id: "gateway",
    label: "API Gateway",
    techStack: "Express",
    left: 72,
    top: 88,
  },
  {
    id: "realtime",
    label: "Realtime Hub",
    techStack: "Socket.io",
    left: 320,
    top: 170,
  },
  {
    id: "persistence",
    label: "Canvas Store",
    techStack: "MongoDB",
    left: 610,
    top: 92,
  },
];

const events = [
  "canvas:join",
  "canvas:node:moved",
  "canvas:joined",
  "server:ready",
];

export default function CanvasStage() {
  return (
    <section className="mt-12 grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
      <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
          Block palette
        </p>
        <div className="mt-5 space-y-3">
          {[
            ["Service", "Containerized runtime or app node"],
            ["Queue", "Event broker or async handoff"],
            ["Database", "Persistent store and replicas"],
          ].map(([label, text]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{label}</span>
                <Grip className="h-4 w-4 text-cyan-300" />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </aside>

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-panel">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
              Canvas preview
            </p>
            <p className="mt-1 text-lg font-semibold text-white">Payments platform architecture</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
            <Users className="h-4 w-4" />
            2 collaborators
          </div>
        </div>

        <div className="bg-grid-slate relative min-h-[420px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/70">
          <div className="absolute left-[152px] top-[145px] h-[2px] w-[170px] bg-cyan-400/35" />
          <MoveRight className="absolute left-[302px] top-[136px] h-6 w-6 text-cyan-300/70" />
          <div className="absolute left-[485px] top-[145px] h-[2px] w-[128px] bg-cyan-400/35" />
          <MoveRight className="absolute left-[595px] top-[136px] h-6 w-6 text-cyan-300/70" />

          {nodes.map((node) => (
            <article
              key={node.id}
              className="absolute w-52 rounded-2xl border border-cyan-400/20 bg-slate-950/95 p-4 shadow-2xl shadow-cyan-950/30"
              style={{ left: node.left, top: node.top }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Node</p>
                  <p className="mt-1 font-display text-lg font-semibold text-white">{node.label}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 p-2">
                  <ScanSearch className="h-4 w-4 text-cyan-300" />
                </div>
              </div>
              <div className="mt-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                {node.techStack}
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
          Event bus
        </p>
        <div className="mt-5 space-y-3">
          {events.map((eventName) => (
            <div
              key={eventName}
              className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200"
            >
              {eventName}
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-400">
          The server is already prepared to broadcast node movement events to everyone else
          in the same canvas room.
        </p>
      </aside>
    </section>
  );
}
