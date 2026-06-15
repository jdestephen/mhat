"""
Rate limiting for sensitive endpoints.

Uses an in-memory sliding window per IP address.
For production with multiple workers, replace with Redis-backed limiter.
"""
import time
from collections import defaultdict
from typing import Optional

from fastapi import HTTPException, Request, status


class RateLimiter:
    """Simple in-memory rate limiter using sliding window."""

    def __init__(self) -> None:
        # key: (ip, endpoint) -> list of timestamps
        self._requests: dict[tuple[str, str], list[float]] = defaultdict(list)

    def _clean_old(self, key: tuple[str, str], window_seconds: int) -> None:
        now = time.time()
        self._requests[key] = [
            ts for ts in self._requests[key] if now - ts < window_seconds
        ]

    def check(
        self,
        ip: str,
        endpoint: str,
        max_requests: int,
        window_seconds: int,
    ) -> None:
        """Raise 429 if rate limit is exceeded."""
        key = (ip, endpoint)
        self._clean_old(key, window_seconds)
        if len(self._requests[key]) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiadas solicitudes. Intenta de nuevo más tarde.",
            )
        self._requests[key].append(time.time())


# Singleton instance
rate_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For behind proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
