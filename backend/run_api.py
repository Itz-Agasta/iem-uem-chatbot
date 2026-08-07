"""
Entry point: run the FastAPI backend.

    python run_api.py

Equivalent to:
    uvicorn app.api:app --host 0.0.0.0 --port 8000

Use this for local testing. For a persistent production deployment on the
college server, run uvicorn directly under systemd (see README.md) rather
than this script, so it restarts automatically and logs properly.
"""
import uvicorn

from app import config

if __name__ == "__main__":
    uvicorn.run("app.api:app", host=config.API_HOST, port=config.API_PORT, reload=False)
