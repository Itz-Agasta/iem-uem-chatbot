"""
Retrieval + generation pipeline: hybrid retriever (FAISS + BM25), optional
multi-query expansion, and a small LangGraph app that guards against
off-topic / low-relevance questions before generating an answer.

Usage:
    from rag import RAGPipeline
    pipeline = RAGPipeline()
    answer = pipeline.ask("What were the key achievements in the 38th council meeting?")
"""
from typing import TypedDict, List

from langchain_ollama import ChatOllama
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_core.documents import Document
from langgraph.graph import StateGraph, END

from . import config
from .ingest import ingest_and_update, get_embeddings


class ChatState(TypedDict):
    question: str
    docs: List[Document]
    answer: str


class RAGPipeline:
    def __init__(self):
        self.embeddings = get_embeddings()
        self.vectorstore, self.all_chunks = ingest_and_update(self.embeddings)
        self.llm = ChatOllama(
            model=config.LLM_MODEL,
            base_url=config.OLLAMA_BASE_URL,
            temperature=config.LLM_TEMPERATURE,
            num_ctx=config.LLM_NUM_CTX,
        )
        self.retriever = self._build_retriever()
        self.graph = self._build_graph()

    # -- retriever ---------------------------------------------------------
    def _build_retriever(self):
        dense = self.vectorstore.as_retriever(search_kwargs={"k": config.RETRIEVAL_K})

        bm25 = BM25Retriever.from_documents(self.all_chunks)
        bm25.k = config.RETRIEVAL_K

        ensemble = EnsembleRetriever(
            retrievers=[dense, bm25],
            weights=config.ENSEMBLE_WEIGHTS,
        )

        if config.USE_MULTI_QUERY:
            return MultiQueryRetriever.from_llm(retriever=ensemble, llm=self.llm)
        return ensemble

    def refresh_index(self):
        """Call after adding/changing files in KNOWLEDGE_DIR to rebuild in place."""
        self.vectorstore, self.all_chunks = ingest_and_update(self.embeddings)
        self.retriever = self._build_retriever()

    # -- graph ---------------------------------------------------------
    def _build_graph(self):
        def retrieve_node(state: ChatState) -> ChatState:
            # Cheap relevance gate: does dense search find anything genuinely close?
            scored = self.vectorstore.similarity_search_with_score(
                state["question"], k=config.RETRIEVAL_K
            )
            relevant = [doc for doc, score in scored if score <= config.RELEVANCE_THRESHOLD]
            if not relevant:
                return {**state, "docs": []}

            docs = self.retriever.invoke(state["question"])
            return {**state, "docs": docs}

        def guard_node(state: ChatState) -> ChatState:
            if not state["docs"]:
                return {**state, "answer": (
                    "I don't have information about that in the IEM/UEM documents I have "
                    "access to. I can only answer questions about IEM/UEM based on the "
                    "documents provided."
                )}
            return state

        def generate_node(state: ChatState) -> ChatState:
            if state.get("answer"):
                return state
            context = "\n\n---\n\n".join(
                f"[Source: {d.metadata.get('source')} | {d.metadata.get('section', '')}]\n{d.page_content}"
                for d in state["docs"]
            )
            messages = [
                ("system", config.SYSTEM_PROMPT.format(context=context)),
                ("human", state["question"]),
            ]
            response = self.llm.invoke(messages)
            return {**state, "answer": response.content.strip()}

        def route_after_guard(state: ChatState):
            return END if state.get("answer") else "generate"

        graph = StateGraph(ChatState)
        graph.add_node("retrieve", retrieve_node)
        graph.add_node("guard", guard_node)
        graph.add_node("generate", generate_node)
        graph.set_entry_point("retrieve")
        graph.add_edge("retrieve", "guard")
        graph.add_conditional_edges("guard", route_after_guard, {"generate": "generate", END: END})
        graph.add_edge("generate", END)
        return graph.compile()

    # -- public API ---------------------------------------------------------
    def ask(self, question: str) -> str:
        result = self.graph.invoke({"question": question, "docs": [], "answer": ""})
        return result["answer"]
