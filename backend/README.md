# Backend -- RAG Pipeline

Standalone RAG pipeline: hybrid FAISS + BM25 retrieval, LangGraph
retrieve/guard/generate flow, incremental document ingestion. No API layer
yet -- that's the next piece to add (FastAPI, see `docs/architecture.md`).

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
`index_store/manifest.json`, auto-created).

## Calibrate the relevance threshold (recommended, once)

```bash
python run_calibrate.py
```

Compare the printed FAISS distance scores for on-topic vs. off-topic test
questions, then set `RELEVANCE_THRESHOLD` in `app/config.py` to a value
between the two clusters.

## Try it (terminal Q&A, before wiring up an API)

```bash
python run_chat.py
```

## Using it as a library

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
  config.py       all tunables: model, chunk size, k, threshold, prompt
  ingest.py       loading, chunking, incremental indexing
  rag.py          hybrid retriever + LangGraph pipeline + RAGPipeline class
run_ingest.py     entrypoint: build/update the index
run_chat.py       entrypoint: interactive terminal Q&A
run_calibrate.py  entrypoint: tune RELEVANCE_THRESHOLD
knowledge_base/   source .md / .pdf / .txt files
index_store/      persisted FAISS index + manifest (auto-created, gitignored)
```

## Current config notes

- Model: `qwen2.5:14b-instruct-q4_K_M` -- default for a 24GB VRAM box. Bump
  to `qwen2.5:32b-instruct-q4_K_M` in `app/config.py` if extraction still
  feels vague after tuning retrieval.
- `num_ctx=16384` set explicitly (Ollama defaults to 2048, which silently
  truncates context).
- `RELEVANCE_THRESHOLD` ships with a placeholder -- calibrate it for your
  actual documents before relying on it to reject off-topic questions.
