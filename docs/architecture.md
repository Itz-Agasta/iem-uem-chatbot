# Architecture

## Current state

```
┌─────────────────────┐         ┌──────────────────────────┐
│   frontend/          │         │   backend/                │
│   React + TS (Vite)  │  (X)    │   RAGPipeline (Python)    │
│   kiosk UI + chat     │ ─────>  │   FAISS + BM25 + LangGraph │
│   widget               │  not    │   qwen2.5 via Ollama       │
│                        │  yet    │                            │
└─────────────────────┘  wired  └──────────────────────────┘
```

The two halves are built and each works standalone:
- `frontend/` runs with mocked chat answers (`src/data/mockData.ts`).
- `backend/` answers real questions from `run_chat.py` in the terminal.

They are **not connected yet**.

## Next piece: API layer

`backend/` needs a thin FastAPI wrapper exposing `RAGPipeline` over HTTP:

```
backend/
  api.py          FastAPI app, POST /ask {question} -> {answer}
```

Key things that endpoint needs:
- CORS configured to allow the kiosk frontend's origin
- `RAGPipeline()` instantiated once at startup (loading the 14B model takes
  time -- don't do it per-request)
- Run persistently on the college server via systemd + uvicorn, not a
  notebook or a dev server

Once that exists, `frontend/src/components/ChatWidget.tsx`'s `askBackend()`
function gets its mock body replaced with a real `fetch()` call (the target
shape is already documented in a comment in that file).

## Deployment target

- Backend: college server, 24GB VRAM, Ollama + FastAPI running as a
  persistent service (systemd unit recommended)
- Frontend: built as static files (`npm run build` -> `dist/`) and served
  from the same server (nginx, or FastAPI's static file serving) or a small
  kiosk browser pointed at the built app

## Planned, not yet built

- `POST /ask` FastAPI endpoint (see above)
- Real presence detection (face-api.js / MediaPipe) replacing the 3-second
  timer stand-in in `ChatWidget.tsx`
- Admin/CMS path for updating ticker content and today's event image without
  editing `mockData.ts` directly
