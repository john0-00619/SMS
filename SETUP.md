# Kobina AI Studio — Setup Guide

## 1. Gemini API key (server only)

1. Get a key at **Google AI Studio → API keys** (https://aistudio.google.com/apikey).
2. Set it **only** on the server:
   - Local: `GEMINI_API_KEY=...` in `.env` (server reads it via `dotenv`).
   - Google AI Studio / hosting: add `GEMINI_API_KEY` to **Secrets / environment variables** of the server runtime.
3. Never put it in `VITE_*` vars, never commit it.

Verify: `GET /api/health` → `{ "geminiConfigured": true }`, and `/api/models` shows configured + live models.

Model IDs are centralized in `server/src/config.js`:
- text: `gemini-2.5-flash` (fallback `gemini-2.0-flash`)
- image: `gemini-2.5-flash-image` (fallback `gemini-2.0-flash-preview-image-generation`)
- video: `veo-3.1-generate-preview` (fallback `veo-3.0-generate-preview`)
- tts: `gemini-2.5-flash-preview-tts`

If a model 404s for your project, the server automatically tries the fallback, then
returns an honest `MODEL_UNAVAILABLE` error (no fake results).

## 2. Firebase project

1. Create a project at https://console.firebase.google.com
2. **Authentication → Sign-in method → enable Google.** Add your dev + prod origins to authorized domains.
3. **Firestore Database → Create database** (production mode), then deploy `firestore.rules`:
   `firebase deploy --only firestore:rules` (requires Firebase CLI + `firebase init`).
4. **Storage → Get started**, then deploy `storage.rules` the same way.
5. **Project settings → General → Your apps → Web app** — copy the config into env:
   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_API_URL=http://localhost:8080
   ```
   Put these in `client/.env` for local dev or in your hosting env vars.

### Optional: verify ID tokens on the server

For production, create a service account (**Project settings → Service accounts → Generate key**),
then set `FIREBASE_SERVICE_ACCOUNT` to the JSON (or base64 of it) in the server env.
Without it the server runs in lenient mode; Firestore/Storage rules remain the data authority.

## 3. Veo video access

Veo via the Gemini API requires an eligible project (billing / allowlist / region).
If unavailable you'll get a clear 403/404 message in Video Studio — the request flow,
polling, player and download code paths are all real and will work once access is granted.
Check the exact model name for your account with `GET /api/models` and update
`server/src/config.js` if Google has renamed it.

## 4. Google AI Studio usage

- Import this repo (or paste files) into an AI Studio project.
- Frontend: the `client/` Vite app is the standard supported stack.
- Backend: run `server/` in the Node.js runtime with `GEMINI_API_KEY` in **Secrets**.
- Keep `VITE_API_URL` pointed at the server URL.

## 5. Smoke test checklist

- [ ] `/api/health` reports `geminiConfigured: true`
- [ ] Google sign-in works; logout/login persists session
- [ ] Projects CRUD; only own data visible
- [ ] AI Chat streams a real response; regenerate/stop/copy work
- [ ] Script Studio generates the full package; save/copy/export work
- [ ] Image Studio returns a real generated image; save/download work
- [ ] Voice Studio plays + downloads real TTS audio
- [ ] Video Studio: confirm dialog → real operation → polling → player/download (or honest unavailable message)
- [ ] Media Library upload with progress; preview/download/delete
- [ ] History records everything; refresh persists; no secrets in browser bundle
