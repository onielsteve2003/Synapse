import { Activity, ServerCog, Sparkles } from "lucide-react";

const statusItems = [
  { icon: Activity, label: "Canvas runtime staged" },
  { icon: ServerCog, label: "API foundation live" },
  { icon: Sparkles, label: "Realtime hooks ready" },
];

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-slate-900/55 px-6 py-5 shadow-panel backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
              Synapse
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-white">
              Collaborative system architecture designer
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {statusItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
              >
                <Icon className="h-4 w-4 text-cyan-300" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </header>

        <main className="pb-10">{children}</main>
      </div>
    </div>
  );
}
