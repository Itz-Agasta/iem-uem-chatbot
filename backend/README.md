# Backend -- RAG Pipeline + API

Hybrid FAISS + BM25 retrieval, LangGraph retrieve/guard/generate flow,
incremental document ingestion, wrapped in a FastAPI server that also
handles kiosk content management (event banner, tickers) for the admin
portal.

## Setup

```bash
pip install -r requirements.txt

# Install Ollama if not already present: https://ollama.com/download
ollama pull qwen2.5:14b-instruct-q4_K_M

# Put source files here (already includes the 3 governing body reports):
cp /path/to/*.md knowledge_base/
```

## Build the index

```bash
python run_ingest.py
```

Re-run any time you add, change, or remove files in `knowledge_base/` --
only new/changed files are re-chunked (tracked via a SHA-256 manifest in
`index_store/manifest.json`, auto-created). You can also trigger this
remotely from the admin portal's "Refresh Index" button once the API is
running, without restarting the server.

## Calibrate the relevance threshold (recommended, once)

```bash
python run_calibrate.py
```

Compare the printed FAISS distance scores for on-topic vs. off-topic test
questions, then set `RELEVANCE_THRESHOLD` in `app/config.py` to a value
between the two clusters.

## Try it (terminal Q&A, before wiring up the API/frontend)

```bash
python run_chat.py
```

## Run the API server

```bash
python run_api.py
```

Starts on `http://0.0.0.0:8000` by default (see `app/config.py` to change
host/port). The model loads once at startup -- watch the console for
"RAG pipeline ready." before hitting `/ask`.

**Before running in production:** set these environment variables (defaults
are dev-only placeholders, not safe to deploy as-is):

```bash
export ADMIN_USERNAME=your_admin_username
export ADMIN_PASSWORD='a-real-password'
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
```

Also update `CORS_ORIGINS` in `app/config.py` to include your deployed
frontend's actual URL (it currently only allows `localhost:5173` for local
dev).

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/ask` | none | Ask the chatbot a question |
| GET | `/content` | none | Current tickers + event banner (kiosk polls this) |
| POST | `/auth/login` | none | Admin login, returns a JWT |
| PUT | `/admin/content/tickers` | admin | Update ticker text lists |
| PUT | `/admin/content/event` | admin | Update event title/subtitle |
| POST | `/admin/content/event/image` | admin | Upload event banner image |
| POST | `/admin/refresh-index` | admin | Re-scan `knowledge_base/`, rebuild index in place |
| GET | `/uploads/{filename}` | none | Serves uploaded event images |
| GET | `/health` | none | Basic liveness check |

Interactive API docs are auto-generated at `http://localhost:8000/docs`
while the server is running.

### Running persistently (production)

Don't use `python run_api.py` for the real deployment -- run uvicorn under
systemd so it restarts automatically and logs properly. Example unit file:

```ini
# /etc/systemd/system/iem-uem-backend.service
[Unit]
Description=IEM-UEM Kiosk Backend
After=network.target

[Service]
WorkingDirectory=/path/to/iem-uem-chatbot/backend
Environment="ADMIN_USERNAME=your_admin_username"
Environment="ADMIN_PASSWORD=your_real_password"
Environment="JWT_SECRET_KEY=your_random_secret"
ExecStart=/path/to/venv/bin/uvicorn app.api:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now iem-uem-backend
```

## Using RAGPipeline as a library

```python
from app.rag import RAGPipeline

pipeline = RAGPipeline()
answer = pipeline.ask("What were the key achievements in the 38th council meeting?")

# after adding new files to knowledge_base/:
pipeline.refresh_index()
```

## Structure

```
app/
  config.py         all tunables: model, chunk size, k, threshold, prompt, API/auth settings
  ingest.py         loading, chunking, incremental indexing
  rag.py            hybrid retriever + LangGraph pipeline + RAGPipeline class
  api.py            FastAPI app: /ask, /content, admin content management
  auth.py           admin login + JWT verification
  content_store.py  JSON-backed store for tickers + event banner
run_ingest.py        entrypoint: build/update the index
run_chat.py           entrypoint: interactive terminal Q&A
run_calibrate.py      entrypoint: tune RELEVANCE_THRESHOLD
run_api.py             entrypoint: run the FastAPI server
knowledge_base/       source .md / .pdf / .txt files
index_store/          persisted FAISS index + manifest (auto-created, gitignored)
data/                 content.json + uploaded event images (auto-created, gitignored)
```

## Current config notes

- Model: `qwen2.5:14b-instruct-q4_K_M` -- default for a 24GB VRAM box. Bump
  to `qwen2.5:32b-instruct-q4_K_M` in `app/config.py` if extraction still
  feels vague after tuning retrieval.
- `num_ctx=16384` set explicitly (Ollama defaults to 2048, which silently
  truncates context).
- `RELEVANCE_THRESHOLD` ships with a placeholder -- calibrate it for your
  actual documents before relying on it to reject off-topic questions.
- Admin auth is a single hardcoded account (env-configured), not a full user
  system -- appropriate for one kiosk's back office, not a multi-tenant product.
