import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import Layout from "./components/Layout";
import { Spinner, ConfigBanner } from "./components/ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AIChat from "./pages/AIChat";
import ScriptStudio from "./pages/ScriptStudio";
import ImageStudio from "./pages/ImageStudio";
import VideoStudio from "./pages/VideoStudio";
import VoiceStudio from "./pages/VoiceStudio";
import ThumbnailStudio from "./pages/ThumbnailStudio";
import YouTubeStudio from "./pages/YouTubeStudio";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import MediaLibrary from "./pages/MediaLibrary";
import History from "./pages/History";
import Settings from "./pages/Settings";

function Guard({ children }) {
  const { user, loading, firebaseConfigured, firebaseMissing } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>;
  if (!firebaseConfigured) {
    return (
      <div className="min-h-screen hero-glow flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <ConfigBanner
            title="Firebase configuration required"
            message={`Kobina AI Studio needs Firebase to run. Missing: ${firebaseMissing.join(", ")}. Add VITE_FIREBASE_* variables to client/.env (see .env.example at the repo root), then restart the dev server. After that, enable Google sign-in + Firestore + Storage in the Firebase console and deploy firestore.rules / storage.rules.`}
          />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Guard><Dashboard /></Guard>} />
            <Route path="/chat" element={<Guard><AIChat /></Guard>} />
            <Route path="/scripts" element={<Guard><ScriptStudio /></Guard>} />
            <Route path="/images" element={<Guard><ImageStudio /></Guard>} />
            <Route path="/videos" element={<Guard><VideoStudio /></Guard>} />
            <Route path="/voice" element={<Guard><VoiceStudio /></Guard>} />
            <Route path="/thumbnails" element={<Guard><ThumbnailStudio /></Guard>} />
            <Route path="/youtube" element={<Guard><YouTubeStudio /></Guard>} />
            <Route path="/projects" element={<Guard><Projects /></Guard>} />
            <Route path="/projects/:id" element={<Guard><ProjectDetail /></Guard>} />
            <Route path="/media" element={<Guard><MediaLibrary /></Guard>} />
            <Route path="/history" element={<Guard><History /></Guard>} />
            <Route path="/settings" element={<Guard><Settings /></Guard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
