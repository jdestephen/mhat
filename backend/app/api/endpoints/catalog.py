from typing import Any, List, Dict
from fastapi import APIRouter, Depends

from app.api import deps
from app.models.user import User
from app.services.catalog_service import catalog_service

router = APIRouter()

@router.get("/allergies", response_model=List[Dict[str, Any]])
async def search_allergies(
    q: str = "",
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Search allergies catalog by display name or synonyms.
    """
    return catalog_service.search_allergies(q)

@router.get("/conditions", response_model=List[Dict[str, Any]])
async def search_conditions(
    q: str = "",
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Search conditions catalog by display name or synonyms.
    """
    return catalog_service.search_conditions(q)

@router.get("/options", response_model=Dict[str, Any])
async def get_ui_options(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get localized UI options for dropdowns (severity, status, etc.).
    """
    return catalog_service.get_ui_options()
