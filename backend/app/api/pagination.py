"""Shared offset-pagination primitives for API v1 list endpoints."""

from collections.abc import Callable
from dataclasses import dataclass
from math import ceil
from typing import Annotated

from fastapi import Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select


DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
TOTAL_COUNT_HEADER = "X-Total-Count"
PAGE_HEADER = "X-Page"
PAGE_SIZE_HEADER = "X-Page-Size"
TOTAL_PAGES_HEADER = "X-Total-Pages"
HAS_NEXT_HEADER = "X-Has-Next"
HAS_PREVIOUS_HEADER = "X-Has-Previous"
PAGINATION_HEADER_NAMES = (
    TOTAL_COUNT_HEADER,
    PAGE_HEADER,
    PAGE_SIZE_HEADER,
    TOTAL_PAGES_HEADER,
    HAS_NEXT_HEADER,
    HAS_PREVIOUS_HEADER,
)


class PaginationParams:
    """Validated ``skip``/``limit`` query parameters for paginated endpoints."""

    def __init__(
        self,
        skip: Annotated[
            int,
            Query(ge=0, description="Cantidad de elementos que se omitirán."),
        ] = 0,
        limit: Annotated[
            int,
            Query(
                ge=1,
                le=MAX_PAGE_SIZE,
                description="Cantidad máxima de elementos que se devolverán.",
            ),
        ] = DEFAULT_PAGE_SIZE,
    ) -> None:
        self.skip = skip
        self.limit = limit


PaginationDep = Annotated[PaginationParams, Depends()]


def pagination_dependency(
    *,
    default_limit: int = DEFAULT_PAGE_SIZE,
    max_limit: int = MAX_PAGE_SIZE,
) -> Callable[..., PaginationParams]:
    """Create a pagination dependency while preserving a legacy page size."""
    if default_limit < 1:
        raise ValueError("default_limit must be greater than zero")
    if max_limit < default_limit:
        raise ValueError("max_limit must be greater than or equal to default_limit")

    def dependency(
        skip: int = Query(
            default=0,
            ge=0,
            description="Cantidad de elementos que se omitirán.",
        ),
        limit: int = Query(
            default=default_limit,
            ge=1,
            le=max_limit,
            description="Cantidad máxima de elementos que se devolverán.",
        ),
    ) -> PaginationParams:
        return PaginationParams(skip=skip, limit=limit)

    return dependency


@dataclass(frozen=True)
class PaginationMetadata:
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


def build_pagination_metadata(
    *,
    total: int,
    skip: int,
    limit: int,
) -> PaginationMetadata:
    """Calculate response metadata for an offset-based page."""
    if total < 0:
        raise ValueError("total must be greater than or equal to zero")
    if skip < 0:
        raise ValueError("skip must be greater than or equal to zero")
    if limit <= 0:
        raise ValueError("limit must be greater than zero")

    total_pages = ceil(total / limit) if total else 0
    return PaginationMetadata(
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        total_pages=total_pages,
        has_next=skip + limit < total,
        has_previous=total > 0 and skip > 0,
    )


def set_pagination_headers(
    response: Response,
    *,
    total: int,
    skip: int,
    limit: int,
) -> PaginationMetadata:
    """Attach backward-compatible pagination metadata to an API v1 response."""
    metadata = build_pagination_metadata(total=total, skip=skip, limit=limit)
    response.headers[TOTAL_COUNT_HEADER] = str(metadata.total)
    response.headers[PAGE_HEADER] = str(metadata.page)
    response.headers[PAGE_SIZE_HEADER] = str(metadata.page_size)
    response.headers[TOTAL_PAGES_HEADER] = str(metadata.total_pages)
    response.headers[HAS_NEXT_HEADER] = str(metadata.has_next).lower()
    response.headers[HAS_PREVIOUS_HEADER] = str(metadata.has_previous).lower()
    return metadata


async def count_rows(db: AsyncSession, statement: Select) -> int:
    """Count a filtered select that returns one row per resource.

    Callers whose query joins one-to-many relationships must first reduce the
    statement to distinct resource IDs so the count matches the paginated list.
    """
    count_statement = select(func.count()).select_from(
        statement.order_by(None).limit(None).offset(None).subquery()
    )
    result = await db.execute(count_statement)
    return int(result.scalar_one())
