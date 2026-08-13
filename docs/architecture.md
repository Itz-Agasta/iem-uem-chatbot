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
  as a persistent systemd service.
- **Frontend**: built as static files (`npm run build` → `dist/`) and served
  from the same server via nginx, with SPA fallback configured so `/admin`
  works when navigated to directly, not just via client-side link.
- **Monitoring**: Prometheus scrapes the backend's `/metrics`, Grafana
  visualizes it, Loki/Promtail ships backend logs from the systemd journal.

All of the above is ready to use in `deploy/` (systemd unit, nginx config,
Docker Compose monitoring stack) -- see `deploy/README.md` for the install
steps. Paths, domains, and secrets still need filling in for your actual
server.

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
- **HTTPS** — the nginx config in `deploy/nginx/` ships as plain HTTP with
  an HTTPS block template commented out at the bottom. Fill in real
  certificate paths (Let's Encrypt for a public domain, self-signed for an
  internal-only LAN) before relying on this outside of local testing.

## Rate limiting and monitoring (now built)

- `/ask` and `/auth/login` are rate-limited per-IP (`slowapi`), tuned in
  `app/config.py` (`ASK_RATE_LIMIT`, `LOGIN_RATE_LIMIT`). Limits are
  in-memory/per-process -- would need a shared backend (e.g. Redis) if ever
  scaled to multiple backend processes.
- `/metrics` exposes Prometheus-format metrics automatically
  (`prometheus-fastapi-instrumentator`). Don't expose this endpoint
  publicly -- the provided nginx config already blocks it there; Prometheus
  reaches it directly on the backend's own port instead.

## Planned, not yet built

- Multi-admin accounts already work at the DB level (`manage_admin.py`
  supports multiple users), but there's no audit log of who changed what --
  fine for one kiosk's back office with a couple of trusted staff, not for
  larger-scale accountability needs.
- Alerting on top of the Grafana dashboard (e.g. notify if the backend goes
  down, or error rate spikes) isn't configured -- the dashboard shows the
  data, but nothing pages anyone yet.
