from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.api import api_router
from app.db.base import Base
from app.db.session import engine

# Create tables on startup (Prototype only - use Alembic in Prod)
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS
origins = [
    "http://localhost:3000",
    "http://localhost:19000",
    "http://localhost:19006",
    "http://localhost:8081",
    "exp://localhost:19000",
    # Production origins (update with your actual URLs)
    "https://mhat-production.up.railway.app/",
    "https://mhat-production.up.railway.app/api",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount static files for uploaded docs
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Medical History API is running"}
