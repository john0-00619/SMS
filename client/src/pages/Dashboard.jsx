import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listProjects, listGenerations } from "../lib/store";
import { apiFetch } from "../lib/api";
import { timeAgo } from "../lib/utils";
import { SectionTitle, EmptyState, Spinner, StatusBadge } from "../components/ui";

const QUICK = [
  { to: "/scripts", icon: "✎", label: "New Script", desc: "Hooks, scenes & VO" },
  { to: "/images", icon: "◐", label: "New Image", desc: "Nano Banana art" },
  { to: "/videos", icon: "▶", label: "New Video", desc: "Veo generation" },
  { to: "/voice", icon: "♪", label: "New Voiceover", desc: "Gemini TTS" },
  { to: "/thumbnails", icon: "▣", label: "Thumbnail", desc: "CTR concepts" },
  { to: "/youtube", icon: "◎", label: "Optimize", desc: "Titles & SEO" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(null);
  const [gens, setGens] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    if (!user) return;
    listProjects(user.uid).then(setProjects).catch(() => setProjects([]));
    listGenerations(user.uid, 8).then(setGens).catch(() => setGens([]));
    apiFetch("/api/health").then(setHealth).catch(() => setHealth({ geminiConfigured: false }));
  }, [user]);

  return (
    <div>
      <SectionTitle title={`Welcome back, ${user?.displayName?.split(" ")[0] || "Creator"} 🎬`} sub="Your studio at a glance — jump back into a project or create something new." />

      {!health?.geminiConfigured && health && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-4 mb-5 text-sm text-amber-100/80">
          ⚙️ <b>AI features unavailable:</b> GEMINI_API_KEY is not configured on the server. Text, image, video and voice generation will show a configuration notice until the key is added to the server environment / AI Studio Secrets.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className="glass rounded-2xl p-4 hover:border-amber-400/40 transition-all hover:-translate-y-0.5 group">
            <div className="text-2xl mb-2">{q.icon}</div>
            <div className="font-display font-bold text-sm text-white group-hover:text-amber-200">{q.label}</div>
            <div className="text-[11px] text-zinc-500">{q.desc}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Recent Projects</h2>
            <Link to="/projects" className="text-xs font-semibold text-amber-300 hover:text-amber-200">View all →</Link>
          </div>
          {projects === null ? <Spinner /> : projects.length === 0 ? (
            <EmptyState icon="▤" title="No projects yet" hint="Create your first project to organize scripts, media and generations." action={<Link to="/projects" className="btn-primary rounded-xl px-4 py-2 text-sm inline-block">Create project</Link>} />
          ) : projects.slice(0, 5).map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] rounded-lg px-2">
              <span className="font-medium text-sm text-zinc-200 truncate">{p.name}</span>
              <span className="text-[11px] text-zinc-500 shrink-0 ml-3">{timeAgo(p.updatedAt)}</span>
            </Link>
          ))}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Recent Generations</h2>
            <Link to="/history" className="text-xs font-semibold text-amber-300 hover:text-amber-200">View all →</Link>
          </div>
          {gens === null ? <Spinner /> : gens.length === 0 ? (
            <EmptyState icon="✦" title="No generations yet" hint="Generate your first script, image, video or voiceover." action={<Link to="/chat" className="btn-primary rounded-xl px-4 py-2 text-sm inline-block">Start creating</Link>} />
          ) : gens.map((g) => (
            <div key={g.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-white/5 rounded-md px-2 py-1 shrink-0">{g.type}</span>
              <span className="text-sm text-zinc-300 truncate flex-1">{g.prompt || g.title || "(untitled)"}</span>
              <StatusBadge status={g.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
