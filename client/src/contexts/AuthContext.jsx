import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, firebaseConfigured, firebaseMissing } from "../lib/firebase";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseConfigured) { setLoading(false); return; }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signInGoogle = async () => {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(e.message || "Sign-in failed.");
      throw e;
    }
  };
  const logout = async () => { await signOut(auth); };

  return (
    <Ctx.Provider value={{ user, loading, error, signInGoogle, logout, firebaseConfigured, firebaseMissing }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
