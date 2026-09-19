import hmac

from flask import current_app, request

from app.services.errors import UnauthorizedError


def get_provided_key():
    return request.headers.get("X-Atlas-Key", "")


def is_trusted_request():
    configured = current_app.config.get("ATLAS_WRITE_KEY", "")
    provided = get_provided_key()
    if not configured or not provided:
        return False
    # hmac.compare_digest, not ==: a plain string comparison exits at the first
    # mismatched character, leaking via timing how many leading characters were right.
    return hmac.compare_digest(configured, provided)


def require_trusted_request():
    if not is_trusted_request():
        raise UnauthorizedError("A valid X-Atlas-Key header is required.")
