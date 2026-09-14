import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Spinner, ConfigBanner } from "../components/ui";

export default function Login() {
  const { user, loading, signInGoogle, firebaseConfigured, firebaseMissing } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>;
  if (user) return <Navigate to="/" replace />;

  const go = async () => {
    setBusy(true); setErr("");
    try { await signInGoogle(); nav("/"); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen hero-glow flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-6 items-stretch">
        <div className="glass rounded-3xl p-8 sm:p-10 flex flex-col justify-center fade-up">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-3xl mb-5"
            style={{ background: "linear-gradient(135deg,#f0c56b,#b45f1d)", color: "#1a1206" }}>K</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
            Kobina <span className="gold-text">AI Studio</span>
          </h1>
          <p className="text-zinc-400 mt-2 tracking-wide text-sm font-medium">CREATE · GENERATE · PUBLISH</p>
          <p className="text-zinc-300 mt-5 leading-relaxed text-sm sm:text-base">
            A premium AI filmmaking and creator platform — scripts, images, cinematic video,
            voiceovers, thumbnails and YouTube optimization in one studio.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-6 text-xs text-zinc-300">
            {["🎬 Script Studio", "🎨 Image Studio", "🎥 Veo Video", "🎙️ Voice Studio", "🖼️ Thumbnails", "📈 YouTube SEO"].map((f) => (
              <div key={f} className="rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">{f}</div>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-8 sm:p-10 flex flex-col justify-center fade-up">
          <h2 className="font-display text-xl font-bold text-white">Sign in to your studio</h2>
          <p className="text-sm text-zinc-400 mt-1">Your projects, media and history are private to your account.</p>
          {!firebaseConfigured ? (
            <div className="mt-6">
              <ConfigBanner
                title="Firebase configuration required"
                message={`Authentication is unavailable until Firebase web config is set. Missing: ${firebaseMissing.join(", ")}. Add VITE_FIREBASE_* variables to client/.env (see .env.example), enable Google sign-in in the Firebase console, then reload.`}
              />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <button onClick={go} disabled={busy} className="btn-primary w-full rounded-xl px-4 py-3.5 text-sm flex items-center justify-center gap-2">
                {busy ? <Spinner /> : <><span className="text-base">G</span> Continue with Google</>}
              </button>
              {err && <p className="text-sm text-rose-300">⚠️ {err}</p>}
              <p className="text-[11px] text-zinc-500 leading-relaxed">By signing in you agree to use AI generations responsibly. Media generations may incur API costs on the project owner's billing account.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
