# IEM-UEM Kiosk Chatbot

A campus-gate kiosk system for IEM / UEM (Institute of Engineering &
Management / University of Engineering and Management, Kolkata): scrolling
accreditation/achievement tickers, today's event banner, and a chat widget
that answers questions grounded strictly in official governing body / academic
council documents.

## Repo layout

```
iem-uem-chatbot/
├── backend/          RAG pipeline (Python) -- retrieval + generation
│   ├── app/           config, ingestion, RAGPipeline
│   ├── knowledge_base/ source .md/.pdf/.txt files
│   ├── run_ingest.py   build/update the index
│   ├── run_chat.py     terminal Q&A for testing
│   └── run_calibrate.py tune the off-topic relevance threshold
│
├── frontend/         Kiosk UI (TypeScript + React + Vite)
│   └── src/
│       ├── components/ Ticker, EventBanner, ChatWidget
│       └── data/        mocked ticker/event/Q&A content
│
└── docs/
    └── architecture.md  how the pieces fit together, what's next
```

## Status

| Piece | Status |
|---|---|
| RAG backend (retrieval, grounding, off-topic refusal) | Working, testable via `backend/run_chat.py` |
| Kiosk frontend (tickers, event banner, chat widget, fullscreen) | Working, using mocked chat answers |
| Backend ↔ frontend connection (FastAPI `/ask` endpoint) | Not yet built |
| Presence detection (auto-greeting on approach) | Stubbed with a timer, real camera-based detection not yet built |

See `docs/architecture.md` for what's next and how to wire the two halves
together.

## Quick start

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python run_ingest.py
python run_chat.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
