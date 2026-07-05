from typing import Any, Dict, Optional


class BaseAppException(Exception):
    def __init__(
        self,
        detail: str,
        error_code: str,
        status_code: int = 400,
        headers: Optional[Dict[str, Any]] = None,
    ):
        self.detail = detail
        self.error_code = error_code
        self.status_code = status_code
        self.headers = headers
        super().__init__(detail)


class AuthenticationError(BaseAppException):
    def __init__(self, detail: str, error_code: str = "AUTH_FAILED", headers: Optional[Dict[str, Any]] = None):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=401,
            headers=headers or {"WWW-Authenticate": "Bearer"},
        )


class ForbiddenError(BaseAppException):
    def __init__(self, detail: str = "Permission denied", error_code: str = "FORBIDDEN"):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=403,
        )


class NotFoundError(BaseAppException):
    def __init__(self, detail: str = "Resource not found", error_code: str = "NOT_FOUND"):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=404,
        )


class ConflictError(BaseAppException):
    def __init__(self, detail: str, error_code: str = "CONFLICT"):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=409,
        )


class ValidationError(BaseAppException):
    def __init__(self, detail: str, error_code: str = "VALIDATION_FAILED"):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=400,
        )


class RateLimitError(BaseAppException):
    def __init__(self, detail: str = "Too many requests", error_code: str = "RATE_LIMIT_EXCEEDED"):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=429,
        )


class DatabaseError(BaseAppException):
    def __init__(self, detail: str = "Database operation failed", error_code: str = "DATABASE_ERROR"):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=500,
        )
