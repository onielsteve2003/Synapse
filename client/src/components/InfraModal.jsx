import { useEffect, useMemo, useState } from "react";
import { Boxes, Check, Copy, FileText, X } from "lucide-react";

const preferredTabs = ["system_architecture.md", "docker-compose.yml"];

const tabMeta = {
  "docker-compose.yml": {
    icon: Boxes,
    label: "docker-compose.yml",
  },
  "system_architecture.md": {
    icon: FileText,
    label: "system_architecture.md",
  },
};

export default function InfraModal({ generatedInfra, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("");
  const [copiedTab, setCopiedTab] = useState(null);

  const fileKeys = useMemo(() => {
    const keys = Object.keys(generatedInfra?.files || {});

    return [
      ...preferredTabs.filter((key) => keys.includes(key)),
      ...keys.filter((key) => !preferredTabs.includes(key)),
    ];
  }, [generatedInfra]);

  useEffect(() => {
    if (!isOpen || !fileKeys.length) {
      return;
    }

    setActiveTab(fileKeys[0]);
    setCopiedTab(null);
  }, [fileKeys, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !generatedInfra) {
    return null;
  }

  const activeContent = generatedInfra.files?.[activeTab] || "";

  async function handleCopy() {
    if (!activeContent || !navigator?.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(activeContent);
    setCopiedTab(activeTab);

    window.setTimeout(() => {
      setCopiedTab((currentCopiedTab) => (currentCopiedTab === activeTab ? null : currentCopiedTab));
    }, 1600);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/95 shadow-2xl shadow-slate-950/70"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 bg-white/5 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
              Infrastructure Compiler
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white">
              Generated deployment artifacts
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              The compiler reads the canvas node and edge map, then generates a structured architecture brief and a runnable docker-compose scaffold.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-300 sm:block">
              {generatedInfra.topology?.nodes?.length || 0} nodes · {generatedInfra.topology?.edges?.length || 0} edges
            </div>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/85 text-slate-300 transition hover:border-cyan-300/35 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {fileKeys.map((fileKey) => {
                const meta = tabMeta[fileKey] || tabMeta["system_architecture.md"];
                const Icon = meta.icon;

                return (
                  <button
                    key={fileKey}
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                      activeTab === fileKey
                        ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-50"
                        : "border-white/10 bg-slate-950/85 text-slate-300 hover:border-cyan-300/25 hover:text-white",
                    ].join(" ")}
                    onClick={() => setActiveTab(fileKey)}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/85 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-300/30 hover:text-white"
              onClick={() => void handleCopy()}
              type="button"
            >
              {copiedTab === activeTab ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              {copiedTab === activeTab ? "Copied" : "Copy to clipboard"}
            </button>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/95">
            <pre className="max-h-[62vh] overflow-auto p-5 text-sm leading-7 text-slate-200">
              <code>{activeContent}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
