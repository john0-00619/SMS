export const timeAgo = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleDateString();
};

export const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
};

export async function copyText(t) {
  await navigator.clipboard.writeText(t);
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadText(text, filename, mime = "text/markdown") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function b64ToDataUrl(b64, mime) {
  return `data:${mime};base64,${b64}`;
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function validateUpload(file, { types = ["image/", "audio/", "video/"], maxMb = 50 } = {}) {
  if (!file) return "No file selected.";
  if (!types.some((t) => file.type.startsWith(t))) return `Unsupported file type: ${file.type || "unknown"}`;
  if (file.size > maxMb * 1024 * 1024) return `File exceeds ${maxMb}MB limit.`;
  return null;
}

export const statusColor = (s) => ({
  completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  generating: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  queued: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  failed: "text-rose-400 bg-rose-400/10 border-rose-400/20",
}[s] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/20");
