import threading
import time
from collections import defaultdict

from flask import current_app, request

from app.services.auth import is_trusted_request
from app.services.errors import RateLimitedError

_lock = threading.Lock()
_hits = defaultdict(list)


def _client_address():
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def enforce_rate_limit():
    if is_trusted_request():
        return

    limit = current_app.config["RATE_LIMIT_MAX"]
    window = current_app.config["RATE_LIMIT_WINDOW"]
    key = _client_address()
    now = time.time()

    # Sliding window, not fixed: a fixed hourly window lets someone send a full
    # allowance at :59 and again at :00 — double the intended rate across two minutes.
    with _lock:
        hits = _hits[key]
        cutoff = now - window
        while hits and hits[0] < cutoff:
            hits.pop(0)
        if len(hits) >= limit:
            retry_after = int(window - (now - hits[0])) + 1
            raise RateLimitedError("Rate limit exceeded.", retry_after=retry_after)
        hits.append(now)
