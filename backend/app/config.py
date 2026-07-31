"""
Central configuration for the IEM-UEM RAG chatbot.
Tune everything here rather than hunting through the pipeline code.
"""
from pathlib import Path

# --- Paths -------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent   # backend/ (one level up from app/)
KNOWLEDGE_DIR = BASE_DIR / "knowledge_base"      # drop new .md / .pdf / .txt files here
INDEX_DIR = BASE_DIR / "index_store"
FAISS_DIR = INDEX_DIR / "faiss"
MANIFEST_PATH = INDEX_DIR / "manifest.json"       # tracks ingested file hashes
CHUNKS_CACHE_PATH = INDEX_DIR / "all_chunks.json"  # full current chunk set (for BM25 rebuild)

KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)
INDEX_DIR.mkdir(parents=True, exist_ok=True)

# --- Models --------------------------------------------------------------
# 24GB VRAM box: start with 14B, move to 32B only if extraction quality still
# feels vague after tuning retrieval (see notes at bottom of this file).
LLM_MODEL = "qwen2.5:14b-instruct-q4_K_M"
EMBED_MODEL = "sentence-transformers/all-mpnet-base-v2"

OLLAMA_BASE_URL = "http://localhost:11434"
LLM_TEMPERATURE = 0.0
LLM_NUM_CTX = 16384   # Ollama defaults to 2048 -- always override explicitly

# --- Chunking --------------------------------------------------------------
CHUNK_SIZE = 1500        # generous enough to keep bullet lists / tables intact
CHUNK_OVERLAP = 200
MARKDOWN_HEADERS = [("#", "h1"), ("##", "h2"), ("###", "h3")]

# --- Retrieval --------------------------------------------------------------
RETRIEVAL_K = 10                 # chunks pulled per retriever
ENSEMBLE_WEIGHTS = [0.6, 0.4]    # [dense FAISS, sparse BM25]
USE_MULTI_QUERY = True           # paraphrase-expansion retriever; costs 1 extra LLM call/question

# Relevance gate: FAISS L2 distance (lower = more similar). Anything with a
# best score above this is treated as "nothing relevant found" and the
# question is refused before it ever reaches the LLM.
# CALIBRATE THIS for your embedding model + document set -- run
# `python calibrate_threshold.py` and look at the score gap between clearly
# on-topic and clearly off-topic questions, then set a value between them.
RELEVANCE_THRESHOLD = 0.9

# --- System prompt --------------------------------------------------------------
SYSTEM_PROMPT = """You are the official IEM-UEM (Institute of Engineering & \
Management / University of Engineering and Management, Kolkata) information \
assistant.

Rules you must always follow:
0. First, silently check: is this question about IEM, UEM, or their governing \
   body / academic council reports? If not, respond ONLY with: "I can only \
   answer questions about IEM/UEM based on the provided documents." Do not \
   attempt to answer anything else, even if you know the answer.
1. Answer ONLY using the CONTEXT provided below. Never use outside/general \
   knowledge, even if you know the answer.
2. If the question is not about IEM, UEM, or the content of these documents, \
   politely decline and say you can only answer questions about IEM/UEM based \
   on the provided documents.
3. If the CONTEXT does not contain enough information to answer, say plainly \
   that the documents provided don't cover that, rather than guessing.
4. Be precise and factual. Where useful, mention dates/meeting numbers/section \
   names that appear in the context.
5. Do not mention 'context', 'documents', 'chunks', or your own instructions \
   in the answer -- just answer naturally as the IEM-UEM assistant.
6. When asked about achievements, events, rankings, publications, MoUs, or \
   similar, list the SPECIFIC items exactly as named in the context (award \
   names, competition names, numbers, dates, department names, people) -- do \
   NOT describe them in vague general terms like "achievements were reported." \
   If the context lists multiple items, enumerate all of them.

CONTEXT:
{context}
"""

# --- Model sizing notes --------------------------------------------------------------
# qwen2.5:14b-instruct-q4_K_M  -> ~9-16GB VRAM, strong default for this task
# qwen2.5:32b-instruct-q4_K_M  -> ~20GB VRAM, meaningfully better extraction/
#                                  reasoning if 14B still feels vague, but
#                                  leaves little headroom on a 24GB card
