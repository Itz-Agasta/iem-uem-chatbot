"""
Loading, chunking, and incremental ingestion.

Run this file directly to (re)build the index from whatever is currently in
KNOWLEDGE_DIR:

    python ingest.py

Re-run it any time you add/change files there -- only new or changed files
get re-chunked, tracked via a SHA-256 manifest.
"""
import hashlib
import json
from pathlib import Path

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from . import config

_size_splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.CHUNK_SIZE,
    chunk_overlap=config.CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
)
_md_splitter = MarkdownHeaderTextSplitter(config.MARKDOWN_HEADERS, strip_headers=False)

SUPPORTED_SUFFIXES = {".md", ".pdf", ".txt"}


def file_hash(filepath: Path) -> str:
    return hashlib.sha256(filepath.read_bytes()).hexdigest()


def load_and_chunk(filepath: Path) -> list[Document]:
    """Load one file and return size-bounded, metadata-tagged chunks."""
    suffix = filepath.suffix.lower()
    chunks: list[Document] = []

    if suffix == ".md":
        text = filepath.read_text(encoding="utf-8", errors="ignore")
        for hd in _md_splitter.split_text(text):
            section = " > ".join(v for v in hd.metadata.values() if v) or "General"
            for piece in _size_splitter.split_text(hd.page_content):
                chunks.append(Document(
                    page_content=piece,
                    metadata={"source": filepath.name, "section": section},
                ))

    elif suffix == ".pdf":
        for page in PyPDFLoader(str(filepath)).load():
            for piece in _size_splitter.split_text(page.page_content):
                chunks.append(Document(
                    page_content=piece,
                    metadata={
                        "source": filepath.name,
                        "section": f"page {page.metadata.get('page', '?')}",
                    },
                ))

    elif suffix == ".txt":
        text = filepath.read_text(encoding="utf-8", errors="ignore")
        for piece in _size_splitter.split_text(text):
            chunks.append(Document(
                page_content=piece,
                metadata={"source": filepath.name, "section": "General"},
            ))

    else:
        print(f"Skipping unsupported file type: {filepath.name}")

    return chunks


def _load_manifest() -> dict:
    if config.MANIFEST_PATH.exists():
        return json.loads(config.MANIFEST_PATH.read_text())
    return {"files": {}}


def _save_manifest(manifest: dict) -> None:
    config.MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))


def _serialize(docs: list[Document]) -> list[dict]:
    return [{"page_content": d.page_content, "metadata": d.metadata} for d in docs]


def _deserialize(items: list[dict]) -> list[Document]:
    return [Document(page_content=i["page_content"], metadata=i["metadata"]) for i in items]


def get_embeddings() -> HuggingFaceEmbeddings:
    import torch
    return HuggingFaceEmbeddings(
        model_name=config.EMBED_MODEL,
        model_kwargs={"device": "cuda" if torch.cuda.is_available() else "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


def ingest_and_update(embeddings: HuggingFaceEmbeddings | None = None):
    """
    Ingest any new/changed files in KNOWLEDGE_DIR into the FAISS index.
    Safe to call repeatedly -- unchanged files are skipped.

    Returns (vectorstore, all_chunks).
    """
    embeddings = embeddings or get_embeddings()
    manifest = _load_manifest()

    all_chunks = _deserialize(json.loads(config.CHUNKS_CACHE_PATH.read_text())) \
        if config.CHUNKS_CACHE_PATH.exists() else []

    source_files = sorted(
        p for p in config.KNOWLEDGE_DIR.glob("*") if p.suffix.lower() in SUPPORTED_SUFFIXES
    )

    changed = []
    seen_names = set()
    for f in source_files:
        seen_names.add(f.name)
        h = file_hash(f)
        record = manifest["files"].get(f.name)
        if not record or record["hash"] != h:
            changed.append((f, h, record))

    # Handle files that were deleted from KNOWLEDGE_DIR since last run
    removed_names = set(manifest["files"].keys()) - seen_names
    for name in removed_names:
        print(f"Removing deleted file from index: {name}")
        all_chunks = [c for c in all_chunks if c.metadata.get("source") != name]
        del manifest["files"][name]

    if not changed and not removed_names:
        print("No new, changed, or removed files. Index is up to date.")
        print(f"Total chunks: {len(all_chunks)}")
        vectorstore = _load_vectorstore(embeddings)
        return vectorstore, all_chunks

    for f, h, old_record in changed:
        print(f"Processing: {f.name} ({'update' if old_record else 'new'})")
        if old_record:
            all_chunks = [c for c in all_chunks if c.metadata.get("source") != f.name]
        new_chunks = load_and_chunk(f)
        all_chunks.extend(new_chunks)
        manifest["files"][f.name] = {"hash": h, "n_chunks": len(new_chunks)}
        print(f"  -> {len(new_chunks)} chunks")

    if not all_chunks:
        raise RuntimeError(f"No ingestible content found in {config.KNOWLEDGE_DIR}")

    # Rebuild is cheap at this doc scale and guarantees updates/deletions are
    # correctly reflected (vs. trying to patch FAISS in place).
    vectorstore = FAISS.from_documents(all_chunks, embeddings)
    config.FAISS_DIR.mkdir(parents=True, exist_ok=True)
    vectorstore.save_local(str(config.FAISS_DIR))

    config.CHUNKS_CACHE_PATH.write_text(json.dumps(_serialize(all_chunks)))
    _save_manifest(manifest)

    print(f"Index updated. Total chunks: {len(all_chunks)}")
    return vectorstore, all_chunks


def _load_vectorstore(embeddings: HuggingFaceEmbeddings) -> FAISS:
    if not (config.FAISS_DIR / "index.faiss").exists():
        raise RuntimeError(
            f"No FAISS index found at {config.FAISS_DIR}. "
            f"Put files in {config.KNOWLEDGE_DIR} and run ingest_and_update() first."
        )
    return FAISS.load_local(str(config.FAISS_DIR), embeddings, allow_dangerous_deserialization=True)
