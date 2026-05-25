import { useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck, Sparkles, UserRoundPlus } from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Signup({ onOpenLogin, onSuccess, redirectPath }) {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await signup({ email, name, password });
      onSuccess?.();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[460px_minmax(0,1.1fr)] lg:items-stretch">
        <section className="rounded-[2.4rem] border border-white/10 bg-slate-950/85 p-7 shadow-panel backdrop-blur-sm sm:p-8 lg:order-1">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
              <UserRoundPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Signup</p>
              <h2 className="mt-1 font-display text-3xl font-semibold text-white">Create a protected workspace</h2>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block rounded-[1.4rem] border border-white/10 bg-slate-900/80 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Name</span>
              <input
                autoComplete="name"
                className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setName(event.target.value)}
                placeholder="Stephen Onah"
                type="text"
                value={name}
              />
            </label>

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
                autoComplete="new-password"
                className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-[1.4rem] border border-emerald-300/30 bg-emerald-400/15 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:border-emerald-200/50 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Create Account
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <span>Already have an account?</span>
            <button className="font-semibold text-emerald-100 transition hover:text-white" onClick={onOpenLogin} type="button">
              Sign in
            </button>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-slate-900/70 p-7 shadow-panel backdrop-blur-sm sm:p-8 lg:order-2">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_34%)]" />

          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-500">Phase 10 Access Layer</p>
              <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Claim a tenant-safe Synapse account in one step.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Your JWT token unlocks only your canvases, your dashboard inventory, and your
                realtime room joins. Another browser session cannot read your workspace without it.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-50">
                  <ShieldCheck className="h-4 w-4" />
                  Owner-scoped canvases
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                  Protected Socket.io rooms
                </span>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Workspace Redirect</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                After signup, Synapse returns you to the canvas or dashboard route you were trying to open.
              </p>
              {redirectPath ? (
                <p className="mt-4 text-xs uppercase tracking-[0.28em] text-emerald-200">
                  Pending redirect: {redirectPath}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}