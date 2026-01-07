from fastapi import APIRouter
from app.api.endpoints import auth, hx, profiles, catalog

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(hx.router, prefix="/hx", tags=["medical_records"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
