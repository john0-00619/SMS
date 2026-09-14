import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { copyText } from "../lib/utils";
import { useToast } from "../contexts/ToastContext";

export function Spinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ icon = "✦", title, hint, action }) {
  return (
    <div className="glass rounded-2xl p-10 text-center fade-up">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-display font-bold text-lg text-white">{title}</h3>
      {hint && <p className="text-sm text-zinc-400 mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ConfigBanner({ title, message }) {
  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-5 fade-up">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚙️</span>
        <div>
          <h3 className="font-display font-bold text-amber-200">{title}</h3>
          <p className="text-sm text-amber-100/70 mt-1 leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.07] p-4 flex items-center justify-between gap-3 fade-up">
      <p className="text-sm text-rose-200">⚠️ {message}</p>
      {onRetry && <button onClick={onRetry} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap">Retry</button>}
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel, danger = true }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="glass-deep rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg text-white">{title}</h3>
        <p className="text-sm text-zinc-400 mt-2">{message}</p>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onCancel} className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold">Cancel</button>
          <button onClick={onConfirm} className={`rounded-xl px-4 py-2 text-sm font-bold ${danger ? "bg-rose-500 text-white hover:bg-rose-600" : "btn-primary"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Markdown({ text }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || ""}</ReactMarkdown>
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => { await copyText(text || ""); setDone(true); toast.success("Copied to clipboard"); setTimeout(() => setDone(false), 1500); }}
      className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold"
    >
      {done ? "✓ Copied" : `⧉ ${label}`}
    </button>
  );
}

export function SectionTitle({ title, sub }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl sm:text-3xl font-800 font-bold text-white tracking-tight">{title}</h1>
      {sub && <p className="text-sm text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
    generating: "text-amber-400 bg-amber-400/10 border-amber-400/25",
    queued: "text-sky-400 bg-sky-400/10 border-sky-400/25",
    failed: "text-rose-400 bg-rose-400/10 border-rose-400/25",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${map[status] || map.queued}`}>
      {(status === "generating" || status === "queued") && <span className="w-1.5 h-1.5 rounded-full bg-current live-dot" />}
      {status || "unknown"}
    </span>
  );
}
