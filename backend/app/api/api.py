from fastapi import APIRouter
from app.api.endpoints import auth, hx, profiles, catalog, sharing
from app.api import family

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(hx.router, prefix="/hx", tags=["medical_records"])
api_router.include_router(sharing.router, prefix="/hx", tags=["sharing"])  # Authenticated share endpoints under /hx
api_router.include_router(sharing.router, tags=["public_sharing"])  # Public share endpoint at root level
api_router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(family.router)  # Family management endpoints
