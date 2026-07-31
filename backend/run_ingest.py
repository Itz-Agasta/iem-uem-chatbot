"""
Entry point: build or update the FAISS index from files in knowledge_base/.

    python run_ingest.py

Re-run any time you add/change/remove files in knowledge_base/.
"""
from app.ingest import ingest_and_update

if __name__ == "__main__":
    ingest_and_update()
