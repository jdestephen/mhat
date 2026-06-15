"""
Doctor API — modular package.

All sub-modules register their routes on local routers.
This __init__ re-exports a single `router` that includes them all,
so the top-level `main.py` include stays the same:

    app.include_router(doctor.router, prefix="/doctor", tags=["doctor"])
"""
from fastapi import APIRouter

from .access import router as access_router
from .patients import router as patients_router
from .records import router as records_router
from .prescriptions import router as prescriptions_router
from .orders import router as orders_router
from .vital_signs import router as vital_signs_router
from .health_history import router as health_history_router
from .claims import router as claims_router

router = APIRouter()

router.include_router(access_router)
router.include_router(patients_router)
router.include_router(records_router)
router.include_router(prescriptions_router)
router.include_router(orders_router)
router.include_router(vital_signs_router)
router.include_router(health_history_router)
router.include_router(claims_router)
