"""
Entry point: interactive terminal Q&A against the RAG pipeline.

    python run_chat.py

Use this to sanity-check answer quality before wiring up the API/frontend.
"""
from app.rag import RAGPipeline

if __name__ == "__main__":
    pipeline = RAGPipeline()
    print("IEM-UEM RAG chatbot ready. Type a question (Ctrl+C to exit).\n")
    while True:
        try:
            q = input("Q: ").strip()
            if not q:
                continue
            print(f"A: {pipeline.ask(q)}\n")
        except KeyboardInterrupt:
            print("\nExiting.")
            break
