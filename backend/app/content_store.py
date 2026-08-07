"""
Simple JSON-file-backed content store for kiosk display content: the two
scrolling tickers (accreditations/achievements, campus updates) and today's
event banner. No database needed at this scale -- one small JSON file,
read/written under a lock to avoid corrupting it if two requests land at
once.
"""
import json
import threading
from typing import List

from pydantic import BaseModel, Field

from . import config

_lock = threading.Lock()

DEFAULT_CONTENT = {
    "top_ticker": [
        "NAAC A+ Accredited Institution",
        "AICTE Approved | Affiliated to MAKAUT",
    ],
    "bottom_ticker": [
        "Welcome to IEM-UEM Kolkata",
    ],
    "event": {
        "title": "Welcome to IEM-UEM",
        "subtitle": "",
        "image_url": "",
    },
}


class EventBanner(BaseModel):
    title: str = ""
    subtitle: str = ""
    image_url: str = ""


class KioskContent(BaseModel):
    top_ticker: List[str] = Field(default_factory=list)
    bottom_ticker: List[str] = Field(default_factory=list)
    event: EventBanner = Field(default_factory=EventBanner)


def _read_raw() -> dict:
    if not config.CONTENT_STORE_PATH.exists():
        return json.loads(json.dumps(DEFAULT_CONTENT))  # deep copy
    return json.loads(config.CONTENT_STORE_PATH.read_text())


def _write_raw(data: dict) -> None:
    config.CONTENT_STORE_PATH.write_text(json.dumps(data, indent=2))


def get_content() -> KioskContent:
    with _lock:
        return KioskContent(**_read_raw())


def save_content(content: KioskContent) -> KioskContent:
    with _lock:
        _write_raw(content.model_dump())
        return content


def update_tickers(top_ticker: List[str] | None, bottom_ticker: List[str] | None) -> KioskContent:
    with _lock:
        data = _read_raw()
        if top_ticker is not None:
            data["top_ticker"] = top_ticker
        if bottom_ticker is not None:
            data["bottom_ticker"] = bottom_ticker
        _write_raw(data)
        return KioskContent(**data)


def update_event(title: str | None, subtitle: str | None, image_url: str | None) -> KioskContent:
    with _lock:
        data = _read_raw()
        event = data.get("event", {})
        if title is not None:
            event["title"] = title
        if subtitle is not None:
            event["subtitle"] = subtitle
        if image_url is not None:
            event["image_url"] = image_url
        data["event"] = event
        _write_raw(data)
        return KioskContent(**data)
