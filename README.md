# Kobina AI Studio — Create. Generate. Publish.

A premium AI filmmaking & creator platform: AI chat, scripts, images (Nano Banana),
video (Veo), voiceovers (Gemini TTS), thumbnails, YouTube SEO, projects, media library
and generation history — with real Firebase auth, Firestore and Storage.

## Structure

- `server/` — Express API (Node 20+). All Gemini calls happen here. `GEMINI_API_KEY` never leaves the server.
- `client/` — Vite + React premium cinematic UI. Proxies `/api` to the server in dev.
- `firestore.rules`, `storage.rules` — secure per-user ownership rules.

## Quick start

```bash
# 1. Configure
cp .env.example .env            # set GEMINI_API_KEY, PORT, ALLOWED_ORIGINS
# set VITE_* vars in your shell or client/.env (see .env.example)

# 2. Install & run
npm run install:all
npm run dev                     # server :8080 + client :5173
```

Client dev server proxies `/api/*` → `http://localhost:8080` so no CORS setup is needed locally.

## Production

```bash
npm run build                   # builds client/dist
npm start                       # server serves API + static client
```

Or deploy the client to Firebase Hosting and the server to Cloud Run — set
`VITE_API_URL` to the Cloud Run URL and add the hosting origin to `ALLOWED_ORIGINS`.

## Setup details

See **[SETUP.md](./SETUP.md)** for: Gemini API key, Firebase project setup
(Auth + Firestore + Storage), deploying rules, Veo access notes, and Google AI Studio usage.
