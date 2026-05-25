import { useState } from "react";
import { ArrowRight, LoaderCircle, LogIn, ShieldCheck, Sparkles } from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Login({ onOpenSignup, onSuccess, redirectPath }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await login({ email, password });
      onSuccess?.();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_460px] lg:items-stretch">
        <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-slate-900/70 p-7 shadow-panel backdrop-blur-sm sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.16),transparent_34%)]" />

          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-500">Synapse Secure Workspace</p>
              <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Sign in to your private architecture control room.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                JWT auth now protects every canvas API request and realtime collaboration room,
                so each workspace is isolated to its owner.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-50">
                  <ShieldCheck className="h-4 w-4" />
                  Private canvases only
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
                  <Sparkles className="h-4 w-4 text-emerald-200" />
                  Multi-tenant dashboard
                </span>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Access Policy</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Unauthenticated visitors are redirected here before they can load the dashboard,
                inspect an editor route, or join a live canvas room.
              </p>
              {redirectPath ? (
                <p className="mt-4 text-xs uppercase tracking-[0.28em] text-cyan-200">
                  Pending redirect: {redirectPath}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[2.4rem] border border-white/10 bg-slate-950/85 p-7 shadow-panel backdrop-blur-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Login</p>
              <h2 className="mt-1 font-display text-3xl font-semibold text-white">Resume your workspace</h2>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block rounded-[1.4rem] border border-white/10 bg-slate-900/80 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Email</span>
              <input
                autoComplete="email"
                className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </label>

            <label className="block rounded-[1.4rem] border border-white/10 bg-slate-900/80 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Password</span>
              <input
                autoComplete="current-password"
                className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />
            </label>

            {errorMessage ? (
              <div className="rounded-[1.3rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {errorMessage}
              </div>
            ) : null}

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-[1.4rem] border border-cyan-300/30 bg-cyan-400/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Sign In
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <span>No account yet?</span>
            <button className="font-semibold text-cyan-100 transition hover:text-white" onClick={onOpenSignup} type="button">
              Create one
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}