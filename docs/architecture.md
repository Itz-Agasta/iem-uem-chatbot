# Architecture

## Current state

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│   frontend/               │  HTTP   │   backend/                     │
│   React + TS (Vite)       │ ──────> │   FastAPI (app/api.py)          │
│   kiosk UI + chat widget   │ <────── │   ├─ /ask       -> RAGPipeline    │
│   + admin portal (/admin)   │         │   ├─ /content   -> content_store  │
│                              │         │   └─ /admin/*  -> auth-protected  │
└─────────────────────────┘         └──────────────────────────────┘
```

Both halves are built and connected:
- `frontend/` fetches live content from `/content` and asks questions via
  `/ask`. If the backend is unreachable, it falls back to
  `src/data/mockData.ts` so the kiosk display doesn't go blank.
- `backend/` serves real RAG answers, and stores/serves kiosk content
  (event banner, tickers) that the admin portal manages.

## Request flow

**Kiosk asking a question:**
`ChatWidget.tsx` → `askQuestion()` in `api.ts` → `POST /ask` → `RAGPipeline.ask()`
(hybrid retrieval + LangGraph guard/generate) → answer flows back and is
both displayed and spoken (TTS).

**Kiosk loading content:**
`App.tsx` fetches `GET /content` on load and every 60s → renders tickers +
event banner from live data (falls back to mock data if the fetch fails).

**Admin updating content:**
`/admin` → login (`POST /auth/login`) → JWT stored in `sessionStorage` →
`PUT /admin/content/tickers`, `PUT /admin/content/event`,
`POST /admin/content/event/image` (all require the JWT) → `content_store.py`
persists to `backend/data/content.json` and `backend/data/uploads/`.

**Admin re-indexing the chatbot's knowledge base:**
Add files to `backend/knowledge_base/` → click "Refresh Index" in the admin
portal → `POST /admin/refresh-index` → `RAGPipeline.refresh_index()`
re-scans and rebuilds in place, no server restart needed.

## Deployment target

- **Backend**: college server, 24GB VRAM, Ollama + FastAPI (uvicorn) running
  as a persistent systemd service (see `backend/README.md` for the unit file).
- **Frontend**: built as static files (`npm run build` → `dist/`) and served
  from the same server (nginx, or FastAPI's static file serving). The web
  server needs SPA fallback configured (unknown paths → `index.html`) so
  `/admin` works when navigated to directly, not just via client-side link.

## Before deploying for real

A few things ship with dev-safe-but-not-production-safe defaults, called out
here so they don't get missed:

- **Admin accounts** — stored in Postgres with bcrypt-hashed passwords, no
  default/hardcoded credentials (see `backend/README.md` for
  `manage_admin.py`). Make sure `DATABASE_URL` points at your real Postgres
  instance, not the local dev default.
- **JWT secret** — defaults to a placeholder string. Generate a real random
  secret and set `JWT_SECRET_KEY` via environment variable.
- **CORS origins** — `CORS_ORIGINS` in `app/config.py` only allows
  `localhost:5173` right now. Add the deployed frontend's actual URL.
- **`VITE_API_BASE_URL`** — frontend defaults to `http://localhost:8000`.
  Set this to the backend's real address for the deployed build.

## Planned, not yet built

- HTTPS/TLS for both frontend and backend (currently plain HTTP, fine for
  local testing, not for a real deployment on a shared network)
- Rate limiting on `/ask` (a public kiosk endpoint with no per-user limits
  could be spammed)
- Multi-admin accounts / audit log (current auth is a single shared account,
  fine for one kiosk's back office, not for multiple staff members with
  separate accountability)
