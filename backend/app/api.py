"""
FastAPI wrapper around the RAG pipeline + kiosk content management.

Run with:
    uvicorn app.api:app --host 0.0.0.0 --port 8000

Endpoints:
    POST /ask                          public  -- ask the chatbot a question
    GET  /content                      public  -- current tickers + event banner
    POST /auth/login                   public  -- admin login, returns JWT
    PUT  /admin/content/tickers        admin   -- update ticker text lists
    PUT  /admin/content/event          admin   -- update event title/subtitle
    POST /admin/content/event/image    admin   -- upload event banner image
    GET  /uploads/{filename}           public  -- serves uploaded images
"""
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from . import auth, config, content_store
from .db import get_db, init_db
from .rag import RAGPipeline

app = FastAPI(title="IEM-UEM Kiosk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded event images at /uploads/<filename>
app.mount("/uploads", StaticFiles(directory=str(config.UPLOADS_DIR)), name="uploads")

# Loaded once at startup -- loading the model takes real time, must not
# happen per-request.
pipeline: Optional[RAGPipeline] = None


@app.on_event("startup")
def startup() -> None:
    global pipeline
    print("Initializing database...")
    init_db()
    print("Loading RAG pipeline (this can take a while for a 14B model)...")
    pipeline = RAGPipeline()
    print("RAG pipeline ready.")


# --- /ask --------------------------------------------------------------------------
class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str


@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest) -> AskResponse:
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model is still loading, try again shortly.")
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    answer = pipeline.ask(request.question.strip())
    return AskResponse(answer=answer)


@app.post("/admin/refresh-index")
def refresh_index(_admin: str = Depends(auth.require_admin)) -> dict:
    """Re-scan knowledge_base/ for new/changed files and rebuild the index in
    place, without restarting the server."""
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model is still loading, try again shortly.")
    pipeline.refresh_index()
    return {"status": "ok", "chunk_count": len(pipeline.all_chunks)}


# --- Public content (tickers + event banner) ----------------------------------------
@app.get("/content", response_model=content_store.KioskContent)
def get_content() -> content_store.KioskContent:
    return content_store.get_content()


# --- Admin auth ------------------------------------------------------------------
@app.post("/auth/login", response_model=auth.TokenResponse)
def login(request: auth.LoginRequest, db: Session = Depends(get_db)) -> auth.TokenResponse:
    user = auth.authenticate(db, request.username, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = auth.create_access_token(user.username)
    return auth.TokenResponse(access_token=token)


# --- Admin content management ----------------------------------------------------
class TickerUpdateRequest(BaseModel):
    top_ticker: Optional[List[str]] = None
    bottom_ticker: Optional[List[str]] = None


@app.put("/admin/content/tickers", response_model=content_store.KioskContent)
def update_tickers(
    request: TickerUpdateRequest,
    _admin: str = Depends(auth.require_admin),
) -> content_store.KioskContent:
    return content_store.update_tickers(request.top_ticker, request.bottom_ticker)


class EventUpdateRequest(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None


@app.put("/admin/content/event", response_model=content_store.KioskContent)
def update_event(
    request: EventUpdateRequest,
    _admin: str = Depends(auth.require_admin),
) -> content_store.KioskContent:
    return content_store.update_event(request.title, request.subtitle, None)


@app.post("/admin/content/event/image", response_model=content_store.KioskContent)
def upload_event_image(
    file: UploadFile = File(...),
    _admin: str = Depends(auth.require_admin),
) -> content_store.KioskContent:
    if file.content_type not in config.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: {sorted(config.ALLOWED_IMAGE_TYPES)}",
        )

    suffix = Path(file.filename or "").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest_path = config.UPLOADS_DIR / filename

    with dest_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    size_mb = dest_path.stat().st_size / (1024 * 1024)
    if size_mb > config.MAX_UPLOAD_SIZE_MB:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f}MB). Max is {config.MAX_UPLOAD_SIZE_MB}MB.",
        )

    image_url = f"/uploads/{filename}"
    return content_store.update_event(None, None, image_url)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": pipeline is not None}
