import { useEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, ChevronRight, SendHorizontal, Sparkles, User2 } from "lucide-react";

function formatMessageTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AIDrawer({
  examplePrompts,
  isOpen,
  isSubmitting,
  messages,
  onSubmitCommand,
  onToggle,
}) {
  const [command, setCommand] = useState("");
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isOpen, messages]);

  async function submitCommand(nextCommand) {
    const normalizedCommand = nextCommand.trim();

    if (!normalizedCommand || isSubmitting) {
      return;
    }

    const wasSuccessful = (await onSubmitCommand(normalizedCommand)) !== false;

    if (wasSuccessful) {
      setCommand("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await submitCommand(command);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitCommand(command);
    }
  }

  if (!isOpen) {
    return (
      <aside className="flex min-h-[72vh] flex-col items-center gap-4 rounded-[2rem] border border-white/10 bg-slate-900/70 px-3 py-5 shadow-panel backdrop-blur-sm">
        <button
          aria-label="Open AI Copilot drawer"
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/15 text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-400/20"
          onClick={onToggle}
          type="button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
            <Bot className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 [writing-mode:vertical-rl]">
            AI Copilot
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-[72vh] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/70 shadow-panel backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/5 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            AI Copilot
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-white">
            Natural Language Mutations
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Describe graph changes in plain English and let Synapse update the live canvas.
          </p>
        </div>

        <button
          aria-label="Collapse AI Copilot drawer"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
          onClick={onToggle}
          type="button"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Quick Prompts
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {examplePrompts.map((prompt) => (
            <button
              key={prompt}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-100"
              onClick={() => setCommand(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          {messages.map((message) => {
            const isAssistant = message.role === "assistant";

            return (
              <article
                key={message.id}
                className={[
                  "rounded-[1.5rem] border p-4",
                  isAssistant
                    ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-50"
                    : "border-white/10 bg-slate-950/80 text-slate-100",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em]">
                    {isAssistant ? <Bot className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
                    {isAssistant ? "AI Copilot" : "You"}
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    {formatMessageTime(message.createdAt)}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{message.text}</p>
              </article>
            );
          })}

          {isSubmitting ? (
            <div className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em]">
                <Sparkles className="h-4 w-4 animate-pulse" />
                AI Copilot
              </div>
              <p className="mt-3 leading-6">Applying your graph mutation and syncing the canvas...</p>
            </div>
          ) : null}

          <div ref={logEndRef} />
        </div>
      </div>

      <form className="border-t border-white/10 bg-slate-950/70 p-5" onSubmit={handleSubmit}>
        <label className="block rounded-[1.5rem] border border-white/10 bg-slate-950/80 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Command
          </span>
          <textarea
            className="mt-3 min-h-[116px] w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-slate-500"
            disabled={isSubmitting}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Try "Add a Redis node named Session Cache" or "Connect Frontend App to REST API"'
            value={command}
          />
        </label>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-slate-500">
            Press Enter to send. Use Shift+Enter for a new line.
          </p>

          <button
            className="inline-flex items-center gap-2 rounded-[1.2rem] border border-cyan-300/30 bg-cyan-400/15 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !command.trim()}
            type="submit"
          >
            <SendHorizontal className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}