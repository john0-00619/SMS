import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { apiFetch } from "../lib/api";
import { SectionTitle, Spinner } from "../components/ui";

const get = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const setLS = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

export default function Settings() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [platform, setPlatform] = useState(() => get("kb_platform", "YouTube Long Form"));
  const [aspect, setAspect] = useState(() => get("kb_aspect", "16:9"));
  const [health, setHealth] = useState(null);

  useEffect(() => {
    apiFetch("/api/health").then(setHealth).catch(() => setHealth({ geminiConfigured: false }));
  }, []);

  const savePrefs = () => {
    setLS("kb_platform", platform);
    setLS("kb_aspect", aspect);
    toast.success("Preferences saved");
  };

  return (
    <div>
      <SectionTitle title="Settings" sub="Profile, defaults, model status and privacy." />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-4">Profile</h3>
          <div className="flex items-center gap-3">
            {user?.photoURL ? <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" /> :
              <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center font-bold text-amber-200">{(user?.email || "U")[0].toUpperCase()}</div>}
            <div>
              <div className="font-semibold text-white text-sm">{user?.displayName || "Creator"}</div>
              <div className="text-xs text-zinc-500">{user?.email}</div>
              <div className="text-[10px] text-zinc-600 font-mono mt-0.5">UID: {user?.uid}</div>
            </div>
          </div>
          <button onClick={logout} className="btn-ghost rounded-xl px-4 py-2 text-xs font-semibold mt-5">⏻ Sign out</button>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-4">Defaults</h3>
          <div className="space-y-3">
            <div><label className="lbl">Default platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input mt-1 text-sm">
                {["YouTube Long Form", "YouTube Shorts", "TikTok", "Instagram Reels", "Facebook Reels", "Podcast"].map((p) => <option key={p}>{p}</option>)}
              </select></div>
            <div><label className="lbl">Default aspect ratio</label>
              <select value={aspect} onChange={(e) => setAspect(e.target.value)} className="input mt-1 text-sm">
                {["16:9", "9:16", "1:1", "4:5", "3:2"].map((a) => <option key={a}>{a}</option>)}
              </select></div>
            <button onClick={savePrefs} className="btn-primary rounded-xl px-4 py-2.5 text-xs">Save preferences</button>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-4">AI service status</h3>
          {!health ? <Spinner /> : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${health.geminiConfigured ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span className="text-zinc-300">Gemini API: <b className={health.geminiConfigured ? "text-emerald-300" : "text-rose-300"}>{health.geminiConfigured ? "Connected" : "Not configured"}</b></span>
              </div>
              {health.models && (
                <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3 font-mono text-[11px] text-zinc-400 space-y-1">
                  <div>text: {health.models.text}</div>
                  <div>image: {health.models.image}</div>
                  <div>video: {health.models.video}</div>
                  <div>tts: {health.models.tts}</div>
                </div>
              )}
              {!health.geminiConfigured && (
                <p className="text-xs text-amber-200/80">⚙️ Add GEMINI_API_KEY to the server environment / AI Studio Secrets and redeploy to enable generation. The key is never shown here or sent to the browser.</p>
              )}
              <p className="text-[11px] text-zinc-500">Model identifiers are centralized in <code>server/src/config.js</code>.</p>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-bold text-white mb-3">Data & privacy</h3>
          <ul className="text-xs text-zinc-400 space-y-2 leading-relaxed">
            <li>🔒 Projects, chats, generations and media are scoped to your Firebase UID via Firestore + Storage security rules.</li>
            <li>🗝️ The Gemini API key lives only on the server and is never included in client bundles or API responses.</li>
            <li>🖼️ Media binaries are stored in Firebase Storage; Firestore keeps lightweight metadata.</li>
            <li>🗑️ Deleting an asset removes its file and library entry; deleting history keeps library files.</li>
            <li>⚠️ AI generations may be logged by Google per the Gemini API terms. Don't submit secrets or private personal data in prompts.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
