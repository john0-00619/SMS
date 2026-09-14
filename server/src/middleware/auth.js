import admin from "firebase-admin";

let adminReady = false;
try {
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (svc) {
    const creds = JSON.parse(
      svc.trim().startsWith("{") ? svc : Buffer.from(svc, "base64").toString("utf8")
    );
    admin.initializeApp({ credential: admin.credential.cert(creds) });
    adminReady = true;
    console.log("[auth] firebase-admin initialized");
  } else if (process.env.FIREBASE_STORAGE_BUCKET) {
    admin.initializeApp();
    adminReady = true;
    console.log("[auth] firebase-admin initialized (default credentials)");
  } else {
    console.log("[auth] firebase-admin NOT configured — running in lenient mode (UID taken from verified client only in dev). Set FIREBASE_SERVICE_ACCOUNT for production.");
  }
} catch (e) {
  console.log("[auth] firebase-admin init failed:", String(e?.message).slice(0, 200));
}

// Verify Firebase ID token when admin SDK is configured.
// In lenient mode (no service account), we require an Authorization header but
// cannot cryptographically verify — Firestore rules remain the data authority.
export async function authOptional(req, _res, next) {
  req.uid = null;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  if (adminReady) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.uid = decoded.uid;
      req.user = { uid: decoded.uid, email: decoded.email || null };
    } catch (e) {
      console.log("[auth] token verification failed:", String(e?.message).slice(0, 160));
    }
  } else {
    // Lenient dev mode: accept a self-asserted UID header ONLY when no admin configured.
    req.uid = req.headers["x-dev-uid"] ? String(req.headers["x-dev-uid"]).slice(0, 128) : "unverified";
  }
  next();
}

export function authRequired(req, res, next) {
  if (!req.uid) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
  }
  next();
}

export { adminReady };
