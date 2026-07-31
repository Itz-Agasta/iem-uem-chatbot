"""
Entry point: prints FAISS distance scores for on-topic vs off-topic test
questions, to help you pick config.RELEVANCE_THRESHOLD.

    python run_calibrate.py
"""
from app.ingest import ingest_and_update, get_embeddings

ON_TOPIC_TEST_QUESTIONS = [
    "What were the key achievements in the 38th academic council meeting?",
    "What is the vision and mission of UEM Kolkata?",
    "What MoUs were signed recently?",
]

OFF_TOPIC_TEST_QUESTIONS = [
    "What is the capital of France?",
    "Write me a poem about the ocean.",
    "What's the weather like today?",
]

if __name__ == "__main__":
    embeddings = get_embeddings()
    vectorstore, _ = ingest_and_update(embeddings)

    print("=== ON-TOPIC (should score LOW) ===")
    for q in ON_TOPIC_TEST_QUESTIONS:
        print(f"\n{q}")
        for doc, score in vectorstore.similarity_search_with_score(q, k=3):
            print(f"  {score:.3f} | {doc.metadata.get('source')} | {doc.page_content[:60]}")

    print("\n=== OFF-TOPIC (should score HIGH) ===")
    for q in OFF_TOPIC_TEST_QUESTIONS:
        print(f"\n{q}")
        for doc, score in vectorstore.similarity_search_with_score(q, k=3):
            print(f"  {score:.3f} | {doc.metadata.get('source')} | {doc.page_content[:60]}")

    print("\nSet app/config.py RELEVANCE_THRESHOLD to a value between the two clusters above.")
