class DomainError(Exception):
    code = "internal_error"
    status = 500

    def __init__(self, message, details=None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(DomainError):
    code = "validation_error"
    status = 422


class NotFoundError(DomainError):
    code = "not_found"
    status = 404


class ConflictError(DomainError):
    code = "conflict"
    status = 409


class UnauthorizedError(DomainError):
    code = "unauthorized"
    status = 401


class RateLimitedError(DomainError):
    code = "rate_limited"
    status = 429

    def __init__(self, message, retry_after, details=None):
        super().__init__(message, details)
        self.retry_after = retry_after
