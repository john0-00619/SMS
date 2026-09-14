import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getProject, listByProject } from "../lib/store";
import { SectionTitle, Spinner, EmptyState, StatusBadge } from "../components/ui";
import { timeAgo } from "../lib/utils";

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [gens, setGens] = useState(null);
  const [assets, setAssets] = useState(null);

  useEffect(() => {
    if (!user) return;
    getProject(user.uid, id).then(setProject);
    listByProject(user.uid, "generations", id).then(setGens).catch(() => setGens([]));
    listByProject(user.uid, "assets", id).then(setAssets).catch(() => setAssets([]));
  }, [user, id]);

  if (project === null) return <Spinner />;
  if (!project) return <EmptyState icon="▤" title="Project not found" hint="It may have been deleted." action={<Link to="/projects" className="btn-primary rounded-xl px-4 py-2 text-sm inline-block">← Projects</Link>} />;

  const byType = (t) => (gens || []).filter((g) => g.type === t);

  return (
    <div>
      <Link to="/projects" className="text-xs font-semibold text-zinc-500 hover:text-amber-300">← All projects</Link>
      <SectionTitle title={project.name} sub={`Updated ${timeAgo(project.updatedAt)} · ${gens?.length || 0} generations · ${assets?.length || 0} saved assets`} />

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[["script", "✎", "/scripts"], ["image", "◐", "/images"], ["video", "▶", "/videos"], ["voice", "♪", "/voice"], ["thumbnail", "▣", "/thumbnails"], ["youtube", "◎", "/youtube"]].map(([t, icon, to]) => (
          <Link key={t} to={to} className="glass rounded-2xl p-3 text-center hover:border-amber-400/40 transition-all">
            <div className="text-xl">{icon}</div>
            <div className="font-display font-bold text-lg text-white">{byType(t).length}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{t}s</div>
          </Link>
        ))}
      </div>

      <h2 className="font-display font-bold text-white mb-3">Generation history</h2>
      {gens === null ? <Spinner /> : gens.length === 0 ? (
        <EmptyState icon="↺" title="Nothing here yet" hint="Generate from any studio and attach this project to see it here." />
      ) : (
        <div className="space-y-2">
          {gens.map((g) => (
            <div key={g.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-white/5 rounded-md px-2 py-1 shrink-0">{g.type}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-zinc-200 truncate">{g.title || g.prompt}</div>
                <div className="text-[11px] text-zinc-500">{g.model} · {timeAgo(g.createdAt)}</div>
              </div>
              <StatusBadge status={g.status} />
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display font-bold text-white mt-8 mb-3">Saved assets</h2>
      {assets === null ? <Spinner /> : assets.length === 0 ? (
        <p className="text-sm text-zinc-500">No saved media in this project yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="glass rounded-xl overflow-hidden group">
              {a.kind === "image" ? <img src={a.url} alt={a.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform" /> :
                <div className="h-32 flex items-center justify-center text-3xl bg-white/[0.03]">{a.kind === "audio" ? "♪" : "▶"}</div>}
              <div className="p-2.5 text-xs text-zinc-300 truncate">{a.name}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
